import { eq } from '@envy/db'
import { user } from '@envy/db/schema/auth'
import { subscription } from '@envy/db/schema/billing'
import { member } from '@envy/db/schema/organization'
import { createOwnedProject } from '../lib/create-project'
import { getTestDb } from './db'

export type TestUser = {
  id: string
  email: string
  name: string
}

export async function createTestUser(
  overrides: Partial<{ email: string; name: string }> = {}
): Promise<TestUser> {
  const db = getTestDb()
  const id = crypto.randomUUID()
  const email = overrides.email ?? `user-${id.slice(0, 8)}@test.local`
  const name = overrides.name ?? 'Test User'
  const now = new Date()

  await db.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now
  })

  return { id, email, name }
}

export async function createTestProject(ownerId: string, name: string) {
  return createOwnedProject(getTestDb(), ownerId, { name })
}

export async function addMember(input: {
  organizationId: string
  userId: string
  role?: string
}) {
  const db = getTestDb()
  const id = crypto.randomUUID()
  await db.insert(member).values({
    id,
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role ?? 'member',
    createdAt: new Date()
  })
  return { id }
}

export async function setOrgPlan(
  organizationId: string,
  plan: 'free' | 'pro' | 'team',
  seatLimit?: number
) {
  const db = getTestDb()
  const limits = { free: 1, pro: 1, team: 5 } as const
  await db
    .update(subscription)
    .set({
      plan,
      seatLimit: seatLimit ?? limits[plan],
      updatedAt: new Date()
    })
    .where(eq(subscription.organizationId, organizationId))
}
