import { encrypt, exportKey, generateKey } from '@envy/crypto'
import { and, eq } from '@envy/db'
import type { db } from '@envy/db'
import { member, organization } from '@envy/db/schema/auth'
import { project } from '@envy/db/schema/envy'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'

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

/** Drizzle client or transaction — same query/insert surface used below */
export type DbExecutor = Pick<typeof db, 'insert' | 'query'>

export async function createOwnedProject(
  dbClient: DbExecutor,
  userId: string,
  input: { name: string }
): Promise<{ id: string; name: string; slug: string }> {
  const existingMemberships = await dbClient.query.member.findMany({
    where: and(eq(member.userId, userId), eq(member.role, 'owner')),
    columns: { organizationId: true }
  })

  const isOnFree =
    existingMemberships.length === 0 ||
    (await (async () => {
      const orgIds = existingMemberships.map((m) => m.organizationId)
      const orgs = await dbClient.query.organization.findMany({
        where: (o, { inArray }) => inArray(o.id, orgIds),
        columns: { metadata: true }
      })
      return orgs.every(
        (o) =>
          ((o.metadata as { plan?: string } | null)?.plan ?? 'free') === 'free'
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

  const existing = await dbClient.query.project.findFirst({
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

  await dbClient.insert(organization).values({
    id: orgId,
    name: input.name,
    slug,
    metadata: { plan: 'free' },
    createdAt: new Date()
  })

  await dbClient.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: 'owner',
    createdAt: new Date()
  })

  await dbClient.insert(project).values({
    id: orgId,
    name: input.name,
    slug,
    encryptedMk: ciphertext,
    mkIv: iv,
    mkTag: tag,
    createdBy: userId
  })

  return { id: orgId, name: input.name, slug }
}
