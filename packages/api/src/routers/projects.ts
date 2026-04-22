import { encrypt, exportKey, generateKey } from '@envy/crypto'
import { and, eq } from '@envy/db'
import { member, organization } from '@envy/db/schema/auth'
import { environment, project } from '@envy/db/schema/envy'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '..'

const PLAN_LIMITS = {
  free: { projects: 1, secrets: 50 },
  pro: { projects: Infinity, secrets: Infinity },
  team: { projects: Infinity, secrets: Infinity }
} as const

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const memberships = await ctx.db.query.member.findMany({
      where: eq(member.userId, userId),
      columns: { organizationId: true, role: true }
    })

    if (memberships.length === 0) return []

    const orgIds = memberships.map((m) => m.organizationId)

    // plano vem da org onde o usuário é owner
    const ownerMembership = memberships.find((m) => m.role === 'owner')
    const ownerOrg = ownerMembership
      ? await ctx.db.query.organization.findFirst({
          where: (o, { eq }) => eq(o.id, ownerMembership.organizationId),
          columns: { metadata: true }
        })
      : null
    const accountPlan =
      (ownerOrg?.metadata as { plan?: string } | null)?.plan ?? 'free'

    const projects = await ctx.db.query.project.findMany({
      where: (p, { inArray }) => inArray(p.id, orgIds),
      columns: { id: true, name: true, slug: true, createdAt: true },
      with: {
        environments: {
          columns: { name: true },
          orderBy: (e, { asc }) => [asc(e.createdAt)]
        }
      }
    })

    // todos os projetos recebem o plano da conta, não da org individual
    return projects.map((p) => ({ ...p, plan: accountPlan }))
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const existingMemberships = await ctx.db.query.member.findMany({
        where: and(eq(member.userId, userId), eq(member.role, 'owner')),
        columns: { organizationId: true }
      })

      const isOnFree =
        existingMemberships.length === 0 ||
        (await (async () => {
          const orgIds = existingMemberships.map((m) => m.organizationId)
          const orgs = await ctx.db.query.organization.findMany({
            where: (o, { inArray }) => inArray(o.id, orgIds),
            columns: { metadata: true }
          })
          return orgs.every(
            (o) =>
              ((o.metadata as { plan?: string } | null)?.plan ?? 'free') ===
              'free'
          )
        })())

      if (isOnFree && existingMemberships.length >= PLAN_LIMITS.free.projects) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Free plan allows only 1 project. Upgrade to Pro or Team to create more.'
        })
      }

      const slug = generateSlug(input.name)

      const existing = await ctx.db.query.project.findFirst({
        where: eq(project.slug, slug),
        columns: { id: true }
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A project with slug "${slug}" already exists`
        })
      }

      const masterKey = await generateKey()
      const masterKeyBase64 = await exportKey(masterKey)
      const { ciphertext, iv, tag } = await encrypt(
        masterKeyBase64,
        env.SERVER_ENCRYPTION_KEY
      )

      const orgId = crypto.randomUUID()

      await ctx.db.insert(organization).values({
        id: orgId,
        name: input.name,
        slug,
        metadata: { plan: 'free' },
        createdAt: new Date()
      })

      await ctx.db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId,
        role: 'owner',
        createdAt: new Date()
      })

      await ctx.db.insert(project).values({
        id: orgId,
        name: input.name,
        slug,
        encryptedMk: ciphertext,
        mkIv: iv,
        mkTag: tag,
        createdBy: userId
      })

      return { id: orgId, name: input.name, slug }
    }),
  get: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const proj = await ctx.db.query.project.findFirst({
        where: eq(project.slug, input.slug),
        columns: { id: true, name: true, slug: true, createdAt: true }
      })

      if (!proj) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      // verifica se é membro
      const membership = await ctx.db.query.member.findFirst({
        where: and(
          eq(member.organizationId, proj.id),
          eq(member.userId, userId)
        ),
        columns: { role: true }
      })

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      const orgs = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, proj.id),
        columns: { metadata: true }
      })

      const plan = (orgs?.metadata as { plan?: string } | null)?.plan ?? 'free'

      const members = await ctx.db.query.member.findMany({
        where: eq(member.organizationId, proj.id),
        columns: { id: true, userId: true, role: true, createdAt: true }
      })

      const environments = await ctx.db.query.environment.findMany({
        where: eq(environment.projectId, proj.id),
        columns: { id: true, name: true, createdAt: true }
      })

      return {
        ...proj,
        plan,
        role: membership.role,
        members,
        environments
      }
    })
})
