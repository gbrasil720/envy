import { auth } from '@envy/auth'
import { and, eq } from '@envy/db'
import { subscription } from '@envy/db/schema/billing'
import { project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import {
  assertOrganizationWritable,
  effectiveRole,
  hasRole,
  OrganizationReadOnlyError
} from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { APIError } from 'better-auth'
import type { Context } from '../context'

export type EffectiveRole = 'owner' | 'admin' | 'member'

/**
 * Read plan from the subscription table (source of truth),
 * falling back to 'free' when no subscription record exists.
 */
export async function getOrgPlan(
  db: Context['db'],
  organizationId: string
): Promise<'free' | 'pro' | 'team'> {
  const [sub] = await db
    .select({ plan: subscription.plan })
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId))
  return (sub?.plan ?? 'free') as 'free' | 'pro' | 'team'
}

/**
 * Read seatLimit from the subscription table, defaulting to 1 (free).
 */
export async function getOrgSeatLimit(
  db: Context['db'],
  organizationId: string
): Promise<number> {
  const [sub] = await db
    .select({ seatLimit: subscription.seatLimit })
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId))
  return sub?.seatLimit ?? 1
}

/**
 * Membership check on an organization.
 * Ownership is determined by member.role containing "owner" (CSV-aware).
 * Soft-deleted organizations are treated as not found.
 */
export async function requireMembership(
  db: Context['db'],
  organizationId: string,
  userId: string,
  requiredRole: 'admin' | 'member' = 'member'
): Promise<{ role: EffectiveRole; isOwner: boolean; rawRole: string }> {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { id: true, deletedAt: true }
  })

  if (!org || org.deletedAt !== null) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organization not found'
    })
  }

  const m = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, userId)
    ),
    columns: { role: true }
  })

  if (!m) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  const role = effectiveRole(m.role)
  const isOwner = role === 'owner'
  const isAdmin = isOwner || hasRole(m.role, 'admin')

  if (requiredRole === 'admin' && !isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions'
    })
  }

  return { role, isOwner, rawRole: m.role }
}

/**
 * Load a project, resolve its organization, enforce soft-delete + membership.
 * All project-scoped procedures should go through this so services always
 * receive a real organizationId (N:1 project → organization).
 */
export async function requireProjectAccess(
  db: Context['db'],
  projectId: string,
  userId: string,
  requiredRole: 'admin' | 'member' = 'member'
) {
  const proj = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: {
      id: true,
      name: true,
      slug: true,
      organizationId: true,
      createdBy: true,
      createdAt: true
    }
  })

  if (!proj) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
  }

  const membership = await requireMembership(
    db,
    proj.organizationId,
    userId,
    requiredRole
  )

  return {
    project: proj,
    organizationId: proj.organizationId,
    role: membership.role,
    isOwner: membership.isOwner,
    rawRole: membership.rawRole
  }
}

/**
 * Wrapper for assertOrganizationWritable that converts
 * OrganizationReadOnlyError to TRPCError.
 */
export async function assertOrgWritable(organizationId: string) {
  try {
    await assertOrganizationWritable(organizationId)
  } catch (err) {
    if (err instanceof OrganizationReadOnlyError) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Organization is read-only: ${err.memberCount} members exceeds plan limit (${err.seatLimit}). Remove members or upgrade.`
      })
    }
    throw err
  }
}

function buildAuthHeaders(ctx: Context): Headers {
  const headers = new Headers()
  if (ctx.cookieHeader) {
    headers.set('cookie', ctx.cookieHeader)
  }
  if (ctx.authHeader) {
    headers.set('authorization', ctx.authHeader)
  }
  return headers
}

/**
 * Remove a member via Better Auth organization API.
 * Never delete from the member table directly — the plugin enforces
 * last-owner protection natively.
 */
export async function safeRemoveMember(
  ctx: Context,
  organizationId: string,
  memberIdOrEmail: string
) {
  try {
    await auth.api.removeMember({
      body: {
        organizationId,
        memberIdOrEmail
      },
      headers: buildAuthHeaders(ctx)
    })
  } catch (err) {
    if (
      err instanceof APIError ||
      (err instanceof Error && err.name === 'APIError')
    ) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove member'
      const lower = message.toLowerCase()
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          lower.includes('owner') || lower.includes('not allowed')
            ? 'The organization owner cannot be removed. Transfer ownership or archive the organization first.'
            : message || 'Failed to remove member'
      })
    }
    throw err
  }
}
