import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { member, organization } from '@envy/db/schema/organization'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  createTestProject,
  createTestUser,
  setOrgPlan
} from '../test/factories'

describe('projects router organization scope', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('lists only projects in the requested member organization', async () => {
    const owner = await createTestUser()
    const otherOwner = await createTestUser({ email: 'other@test.local' })
    const personalProject = await createTestProject(owner.id, 'Personal Vault')
    await createTestProject(otherOwner.id, 'Other Vault')

    const listed = await createCaller(owner.id).projects.list({
      organizationId: personalProject.organizationId
    })

    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe(personalProject.id)
  })

  test('rejects a project URL for an organization the user does not belong to', async () => {
    const owner = await createTestUser()
    const otherOwner = await createTestUser({ email: 'other@test.local' })
    const otherProject = await createTestProject(otherOwner.id, 'Other Vault')
    const otherOrganization = await getTestDb().query.organization.findFirst({
      where: eq(organization.id, otherProject.organizationId),
      columns: { slug: true }
    })

    await expect(
      createCaller(owner.id).projects.get({
        organizationSlug: otherOrganization?.slug ?? '',
        projectSlug: otherProject.slug
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  test('does not reveal a project from another organization through a matching URL', async () => {
    const owner = await createTestUser()
    const personalProject = await createTestProject(owner.id, 'Personal Vault')
    const otherOwner = await createTestUser({ email: 'other@test.local' })
    const otherProject = await createTestProject(otherOwner.id, 'Other Vault')
    const personalOrganization = await getTestDb().query.organization.findFirst(
      {
        where: eq(organization.id, personalProject.organizationId),
        columns: { slug: true }
      }
    )

    await expect(
      createCaller(owner.id).projects.get({
        organizationSlug: personalOrganization?.slug ?? '',
        projectSlug: otherProject.slug
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('allows admins and rejects members when creating organization projects', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'admin@test.local' })
    const regular = await createTestUser({ email: 'member@test.local' })
    const teamProject = await createTestProject(owner.id, 'Managed Team')
    await setOrgPlan(teamProject.organizationId, 'team', 5)
    await getTestDb()
      .insert(member)
      .values([
        {
          id: crypto.randomUUID(),
          organizationId: teamProject.organizationId,
          userId: admin.id,
          role: 'admin',
          createdAt: new Date()
        },
        {
          id: crypto.randomUUID(),
          organizationId: teamProject.organizationId,
          userId: regular.id,
          role: 'member',
          createdAt: new Date()
        }
      ])

    const created = await createCaller(admin.id).projects.create({
      organizationId: teamProject.organizationId,
      name: 'Admin Project'
    })
    expect(created.organizationId).toBe(teamProject.organizationId)

    await expect(
      createCaller(regular.id).projects.create({
        organizationId: teamProject.organizationId,
        name: 'Member Project'
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
