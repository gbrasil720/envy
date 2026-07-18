import { encrypt, exportKey, generateKey } from '@envy/crypto'
import type { db } from '@envy/db'
import { count, eq, inArray } from '@envy/db'
import { subscription } from '@envy/db/schema/billing'
import { project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { hasRole } from '@envy/db/services'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Drizzle client or transaction — same query/insert surface used below */
export type DbExecutor = Pick<typeof db, 'insert' | 'query' | 'select'>

/**
 * Create a project under a new organization (N:1: project has its own id,
 * organizationId points at the org). Creator is always member.role = 'owner'.
 *
 * One org per project for now so invite/membership stays project-scoped;
 * schema already allows multiple projects per org later.
 */
export async function createOwnedProject(
  dbClient: DbExecutor,
  userId: string,
  input: { name: string }
): Promise<{ id: string; name: string; slug: string; organizationId: string }> {
  // Orgs where this user is owner (role CSV may be "owner" or "admin,owner")
  const ownerships = await dbClient.query.member.findMany({
    where: eq(member.userId, userId),
    columns: { organizationId: true, role: true }
  })

  const ownedOrgIds = ownerships
    .filter((m) => hasRole(m.role, 'owner'))
    .map((m) => m.organizationId)

  // Free-plan limit: 1 project across all owned orgs
  if (ownedOrgIds.length > 0) {
    const subs = await dbClient
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(inArray(subscription.organizationId, ownedOrgIds))

    const isOnFree = subs.length === 0 || subs.every((s) => s.plan === 'free')

    if (isOnFree) {
      const [row] = await dbClient
        .select({ total: count() })
        .from(project)
        .where(inArray(project.organizationId, ownedOrgIds))

      if ((row?.total ?? 0) >= 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Free plan allows only 1 project. Upgrade to Pro or Team to create more.'
        })
      }
    }
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

  const organizationId = crypto.randomUUID()
  const projectId = crypto.randomUUID()
  const now = new Date()

  await dbClient.insert(organization).values({
    id: organizationId,
    name: input.name,
    slug,
    type: 'team',
    createdAt: now
  })

  await dbClient.insert(member).values({
    id: crypto.randomUUID(),
    organizationId,
    userId,
    role: 'owner',
    createdAt: now
  })

  await dbClient.insert(subscription).values({
    id: crypto.randomUUID(),
    organizationId,
    plan: 'free',
    status: 'active',
    dodoCustomerId: 'free',
    seatLimit: 1,
    createdAt: now,
    updatedAt: now
  })

  await dbClient.insert(project).values({
    id: projectId,
    organizationId,
    name: input.name,
    slug,
    encryptedMk: ciphertext,
    mkIv: iv,
    mkTag: tag,
    createdBy: userId
  })

  return { id: projectId, name: input.name, slug, organizationId }
}
