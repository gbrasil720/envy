import { encrypt, exportKey, generateKey } from '@envy/crypto'
import type { db } from '@envy/db'
import { count, eq, inArray } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { subscription } from '@envy/db/schema/billing'
import { environment, project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { hasRole } from '@envy/db/services'
import { env } from '@envy/env/server'
import { TRPCError } from '@trpc/server'
import { PLAN_LIMITS, type Plan } from './plan-limits'

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
 * Personal projects reuse the account's personal organization. Team projects
 * create a separate team organization. A missing subscription means Free.
 */
export async function createOwnedProject(
  dbClient: DbExecutor,
  userId: string,
  input: {
    name: string
    organizationType?: 'personal' | 'team'
    organizationName?: string
    organizationId?: string
  }
): Promise<{
  id: string
  name: string
  slug: string
  organizationId: string
  organizationSlug: string
}> {
  // Orgs where this user is owner (role CSV may be "owner" or "admin,owner")
  const ownerships = await dbClient.query.member.findMany({
    where: eq(member.userId, userId),
    columns: { organizationId: true, role: true }
  })

  const ownedOrgIds = ownerships
    .filter((m) => hasRole(m.role, 'owner'))
    .map((m) => m.organizationId)

  const name = input.name.trim()
  const slug = generateSlug(name)
  const organizationType = input.organizationType ?? 'personal'
  const organizationName = input.organizationName?.trim()

  if (!slug) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Project name must contain at least one letter or number'
    })
  }
  if (
    organizationType === 'team' &&
    !input.organizationId &&
    !organizationName
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Team workspace name is required'
    })
  }

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

  const ownedOrganizations =
    ownedOrgIds.length === 0
      ? []
      : await dbClient.query.organization.findMany({
          where: inArray(organization.id, ownedOrgIds),
          columns: { id: true, slug: true, type: true, deletedAt: true }
        })
  const personalOrganization = ownedOrganizations.find(
    (org) => org.type === 'personal' && org.deletedAt === null
  )
  const organizationId =
    input.organizationId ??
    (organizationType === 'personal' && personalOrganization
      ? personalOrganization.id
      : crypto.randomUUID())
  const projectId = crypto.randomUUID()
  const now = new Date()

  if (!input.organizationId && organizationId !== personalOrganization?.id) {
    const personalOrganizationOwner =
      organizationType === 'personal'
        ? await dbClient.query.user.findFirst({
            where: eq(user.id, userId),
            columns: { name: true }
          })
        : undefined

    const newOrganizationName =
      organizationType === 'personal'
        ? (personalOrganizationOwner?.name ?? 'Personal')
        : (organizationName ?? name)
    const newOrganizationSlug =
      organizationType === 'personal'
        ? `personal-${userId}`
        : generateSlug(newOrganizationName)

    if (!newOrganizationSlug) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Workspace name must contain at least one letter or number'
      })
    }

    const existingOrganization = await dbClient.query.organization.findFirst({
      where: eq(organization.slug, newOrganizationSlug),
      columns: { id: true }
    })
    if (existingOrganization) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `A workspace with slug "${newOrganizationSlug}" already exists`
      })
    }

    await dbClient.insert(organization).values({
      id: organizationId,
      name: newOrganizationName,
      slug: newOrganizationSlug,
      type: organizationType,
      createdAt: now
    })
    await dbClient.insert(member).values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: 'owner',
      createdAt: now
    })
  }

  const targetOrganization = await dbClient.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { slug: true }
  })
  if (!targetOrganization) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organization not found'
    })
  }

  const [currentSubscription] = await dbClient
    .select({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
    })
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId))
  const currentPlan: Plan =
    currentSubscription?.status === 'active' ||
    (currentSubscription?.status === 'cancelled' &&
      currentSubscription.currentPeriodEnd != null &&
      currentSubscription.currentPeriodEnd > now)
      ? currentSubscription.plan
      : 'free'
  const [projectCount] = await dbClient
    .select({ total: count() })
    .from(project)
    .where(eq(project.organizationId, organizationId))
  if ((projectCount?.total ?? 0) >= PLAN_LIMITS[currentPlan].projects) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'Free plan allows only 1 project. Upgrade to Pro or Team to create more.'
    })
  }

  await dbClient.insert(project).values({
    id: projectId,
    organizationId,
    name,
    slug,
    encryptedMk: ciphertext,
    mkIv: iv,
    mkTag: tag,
    createdBy: userId
  })
  await dbClient.insert(environment).values(
    ['development', 'staging', 'production'].map((environmentName) => ({
      id: crypto.randomUUID(),
      projectId,
      name: environmentName,
      createdAt: now
    }))
  )

  return {
    id: projectId,
    name,
    slug,
    organizationId,
    organizationSlug: targetOrganization.slug
  }
}
