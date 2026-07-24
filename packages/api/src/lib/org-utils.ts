import { auth } from '@envy/auth'
import { and, count, eq } from '@envy/db'
import { billingCustomer, subscription } from '@envy/db/schema/billing'
import { project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { effectiveRole, hasRole } from '@envy/db/services'
import { TRPCError } from '@trpc/server'
import { APIError } from 'better-auth'
import type { Context } from '../context'
import { PLAN_LIMITS, type Plan } from './plan-limits'

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
    .select({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
    })
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId))
  return effectiveSubscriptionPlan(sub)
}

export function effectiveSubscriptionPlan(
  sub:
    | {
        plan: 'free' | 'pro' | 'team'
        status: 'active' | 'on_hold' | 'cancelled' | 'expired' | 'failed'
        currentPeriodEnd: Date | null
      }
    | undefined
): Plan {
  if (!sub) return 'free'
  if (sub.status === 'active') return sub.plan
  if (
    sub.status === 'cancelled' &&
    sub.currentPeriodEnd != null &&
    sub.currentPeriodEnd > new Date()
  ) {
    return sub.plan
  }
  return 'free'
}

/**
 * Read seatLimit from the subscription table, defaulting to 1 (free).
 */
export async function getOrgSeatLimit(
  db: Context['db'],
  organizationId: string
): Promise<number> {
  const plan = await getOrgPlan(db, organizationId)
  return PLAN_LIMITS[plan].members
}

export async function getOrganizationBilling(
  db: Context['db'],
  organizationId: string
) {
  const [sub] = await db
    .select({
      plan: subscription.plan,
      status: subscription.status,
      dodoCustomerId: subscription.dodoCustomerId,
      seatLimit: subscription.seatLimit,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    })
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId))
  const customer = await db.query.billingCustomer.findFirst({
    where: eq(billingCustomer.organizationId, organizationId),
    columns: { dodoCustomerId: true }
  })
  const [memberRow] = await db
    .select({ total: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId))
  const seatLimit = sub?.seatLimit ?? 1
  const memberCount = memberRow?.total ?? 0
  return {
    plan: effectiveSubscriptionPlan(sub),
    subscription: sub ?? null,
    hasCustomer: !!customer,
    memberCount,
    seatLimit,
    isReadOnly: memberCount > seatLimit
  }
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
  const { db } = await import('@envy/db')
  const seatLimit = await getOrgSeatLimit(db, organizationId)
  const [row] = await db
    .select({ total: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId))
  const memberCount = row?.total ?? 0
  if (memberCount > seatLimit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Organization is read-only: ${memberCount} members exceeds plan limit (${seatLimit}). Remove members or upgrade.`
    })
  }
}

export function buildAuthHeaders(ctx: Context): Headers {
  const headers = new Headers()
  if (ctx.cookieHeader) {
    headers.set('cookie', ctx.cookieHeader)
  }
  if (ctx.authHeader) {
    headers.set('authorization', ctx.authHeader)
  }
  return headers
}

export async function safeCreateInvitation(
  ctx: Context,
  input: {
    organizationId: string
    email: string
    role: 'admin' | 'member'
  }
) {
  try {
    return await auth.api.createInvitation({
      body: input,
      headers: buildAuthHeaders(ctx)
    })
  } catch (err) {
    if (
      err instanceof APIError ||
      (err instanceof Error && err.name === 'APIError')
    ) {
      const message =
        err instanceof Error ? err.message : 'Failed to create invitation'
      throw new TRPCError({
        code: message.toLowerCase().includes('already')
          ? 'CONFLICT'
          : 'FORBIDDEN',
        message
      })
    }
    throw err
  }
}

export async function safeAcceptInvitation(ctx: Context, invitationId: string) {
  try {
    return await auth.api.acceptInvitation({
      body: { invitationId },
      headers: buildAuthHeaders(ctx)
    })
  } catch (err) {
    if (
      err instanceof APIError ||
      (err instanceof Error && err.name === 'APIError')
    ) {
      const message =
        err instanceof Error ? err.message : 'Failed to accept invitation'
      throw new TRPCError({
        code: message.toLowerCase().includes('already')
          ? 'CONFLICT'
          : 'FORBIDDEN',
        message
      })
    }
    throw err
  }
}

export async function safeCancelInvitation(ctx: Context, invitationId: string) {
  try {
    return await auth.api.cancelInvitation({
      body: { invitationId },
      headers: buildAuthHeaders(ctx)
    })
  } catch (err) {
    if (
      err instanceof APIError ||
      (err instanceof Error && err.name === 'APIError')
    ) {
      const message =
        err instanceof Error ? err.message : 'Failed to cancel invitation'
      throw new TRPCError({
        code: 'FORBIDDEN',
        message
      })
    }
    throw err
  }
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
