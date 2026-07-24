import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { and, eq } from '@envy/db'
import { project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import { createTestUser, setOrgPlan } from '../test/factories'

describe('me onboarding', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('creates the onboarding project in the owned personal organization', async () => {
    const invitee = await createTestUser({ email: 'invitee@test.local' })
    const personalOrganizationId = crypto.randomUUID()
    const joinedOrganizationId = crypto.randomUUID()
    const now = new Date()

    await getTestDb()
      .insert(organization)
      .values([
        {
          id: personalOrganizationId,
          name: 'Personal',
          slug: `personal-${invitee.id}`,
          type: 'personal',
          createdAt: now
        },
        {
          id: joinedOrganizationId,
          name: 'Joined Team',
          slug: `joined-${invitee.id}`,
          type: 'team',
          createdAt: now
        }
      ])
    await getTestDb()
      .insert(member)
      .values([
        {
          id: crypto.randomUUID(),
          organizationId: personalOrganizationId,
          userId: invitee.id,
          role: 'owner',
          createdAt: now
        },
        {
          id: crypto.randomUUID(),
          organizationId: joinedOrganizationId,
          userId: invitee.id,
          role: 'member',
          createdAt: now
        }
      ])
    await setOrgPlan(joinedOrganizationId, 'team', 5)

    const result = await createCaller(
      invitee.id
    ).me.completeOnboardingWithProject({ name: 'Personal Vault' })

    expect(result.project.organizationId).toBe(personalOrganizationId)
    expect(result.project.organizationSlug).toBe(`personal-${invitee.id}`)

    const joinedProject = await getTestDb().query.project.findFirst({
      where: and(
        eq(project.organizationId, joinedOrganizationId),
        eq(project.slug, 'personal-vault')
      )
    })
    expect(joinedProject).toBeUndefined()
  })

  test('provisions a personal organization for a legacy user', async () => {
    const legacy = await createTestUser({
      email: 'legacy@test.local',
      name: 'Legacy User'
    })

    const result = await createCaller(
      legacy.id
    ).me.completeOnboardingWithProject({ name: 'Legacy Vault' })

    const personalOrganization = await getTestDb().query.organization.findFirst(
      {
        where: and(
          eq(organization.id, result.project.organizationId),
          eq(organization.type, 'personal')
        )
      }
    )
    expect(personalOrganization?.name).toBe(legacy.name)
    expect(personalOrganization?.slug).toBe(`personal-${legacy.id}`)
  })

  test('creates an independently named team workspace and project', async () => {
    const owner = await createTestUser({
      email: 'team-owner@test.local',
      name: 'Team Owner'
    })

    const result = await createCaller(
      owner.id
    ).me.completeOnboardingWithProject({
      name: 'Payments API',
      organizationType: 'team',
      organizationName: 'Acme Platform'
    })

    const team = await getTestDb().query.organization.findFirst({
      where: eq(organization.id, result.project.organizationId)
    })
    expect(team).toMatchObject({
      name: 'Acme Platform',
      slug: 'acme-platform',
      type: 'team'
    })
    expect(result.project).toMatchObject({
      name: 'Payments API',
      slug: 'payments-api',
      organizationSlug: 'acme-platform'
    })
  })

  test('repeated and invalid onboarding submissions fail without duplicates', async () => {
    const owner = await createTestUser({ email: 'once@test.local' })
    const caller = createCaller(owner.id)

    await expect(
      caller.me.completeOnboardingWithProject({
        name: 'Invalid Team',
        organizationType: 'team'
      })
    ).rejects.toBeDefined()

    await caller.me.completeOnboardingWithProject({
      name: 'Only Project',
      organizationType: 'personal'
    })

    await expect(
      caller.me.completeOnboardingWithProject({
        name: 'Duplicate Project',
        organizationType: 'personal'
      })
    ).rejects.toMatchObject({ code: 'CONFLICT' })

    const projects = await getTestDb().query.project.findMany({
      where: eq(project.createdBy, owner.id)
    })
    expect(projects).toHaveLength(1)
    expect(projects[0]?.name).toBe('Only Project')
  })
})
