import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { subscription } from '@envy/db/schema/billing'
import { project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { TRPCError } from '@trpc/server'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'
import { createOwnedProject } from './create-project'

describe('createOwnedProject', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('creates a Personal org, owner membership, and project without a Free row', async () => {
    const owner = await createTestUser()
    const created = await createOwnedProject(getTestDb(), owner.id, {
      name: 'Acme Vault'
    })

    expect(created.name).toBe('Acme Vault')
    expect(created.slug).toBe('acme-vault')
    expect(created.id).toBeTruthy()
    expect(created.organizationId).toBeTruthy()
    expect(created.id).not.toBe(created.organizationId)

    const db = getTestDb()

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, created.organizationId)
    })
    expect(org?.name).toBe(owner.name)
    expect(org?.slug).toBe(`personal-${owner.id}`)
    expect(org?.type).toBe('personal')
    expect(org?.deletedAt).toBeNull()

    const membership = await db.query.member.findFirst({
      where: eq(member.organizationId, created.organizationId)
    })
    expect(membership?.userId).toBe(owner.id)
    expect(membership?.role).toBe('owner')

    const sub = await db.query.subscription.findFirst({
      where: eq(subscription.organizationId, created.organizationId)
    })
    expect(sub).toBeUndefined()

    const proj = await db.query.project.findFirst({
      where: eq(project.id, created.id)
    })
    expect(proj?.organizationId).toBe(created.organizationId)
    expect(proj?.encryptedMk).toBeTruthy()
    expect(proj?.mkIv).toBeTruthy()
    expect(proj?.mkTag).toBeTruthy()
    expect(proj?.createdBy).toBe(owner.id)
  })

  test('slugifies project names', async () => {
    const owner = await createTestUser()
    const created = await createTestProject(owner.id, '  My Cool Project!! ')
    expect(created.slug).toBe('my-cool-project')
  })

  test('creates a Team organization when selected', async () => {
    const owner = await createTestUser()
    const created = await createOwnedProject(getTestDb(), owner.id, {
      name: 'Team Vault',
      organizationType: 'team'
    })
    const org = await getTestDb().query.organization.findFirst({
      where: eq(organization.id, created.organizationId)
    })
    expect(org?.type).toBe('team')
  })

  test('free plan allows only one project per owner', async () => {
    const owner = await createTestUser()
    await createTestProject(owner.id, 'First')

    try {
      await createTestProject(owner.id, 'Second')
      expect.unreachable('expected FORBIDDEN')
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError)
      expect((err as TRPCError).code).toBe('FORBIDDEN')
      expect((err as TRPCError).message).toContain('Free plan')
    }
  })

  test('pro plan allows additional projects', async () => {
    const owner = await createTestUser()
    const first = await createTestProject(owner.id, 'First Pro')
    await setOrgPlan(first.organizationId, 'pro')

    const second = await createTestProject(owner.id, 'Second Pro')
    expect(second.slug).toBe('second-pro')
    expect(second.organizationId).toBe(first.organizationId)
  })

  test('conflicts when slug already exists', async () => {
    const a = await createTestUser({ email: 'a@test.local' })
    const b = await createTestUser({ email: 'b@test.local' })
    await createTestProject(a.id, 'Shared Name')

    try {
      await createTestProject(b.id, 'Shared Name')
      expect.unreachable('expected CONFLICT')
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError)
      expect((err as TRPCError).code).toBe('CONFLICT')
      expect((err as TRPCError).message).toContain('shared-name')
    }
  })
})
