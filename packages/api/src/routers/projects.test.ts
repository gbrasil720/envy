import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { auditLog, project } from '@envy/db/schema/envy'
import { member, organization } from '@envy/db/schema/organization'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import {
  addMember,
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

  test('allows owner and admin project renames and rejects members', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'rename-admin@test.local' })
    const regular = await createTestUser({ email: 'rename-member@test.local' })
    const proj = await createTestProject(owner.id, 'Original Project')
    await setOrgPlan(proj.organizationId, 'team', 5)
    await addMember({
      organizationId: proj.organizationId,
      userId: admin.id,
      role: 'admin'
    })
    await addMember({
      organizationId: proj.organizationId,
      userId: regular.id,
      role: 'member'
    })

    const ownerUpdate = await createCaller(owner.id).projects.update({
      projectId: proj.id,
      name: 'Owner Rename'
    })
    expect(ownerUpdate.name).toBe('Owner Rename')

    const adminUpdate = await createCaller(admin.id).projects.update({
      projectId: proj.id,
      name: 'Admin Rename'
    })
    expect(adminUpdate.name).toBe('Admin Rename')
    expect(adminUpdate.slug).toBe(proj.slug)

    await expect(
      createCaller(regular.id).projects.update({
        projectId: proj.id,
        name: 'Member Rename'
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const audit = await getTestDb().query.auditLog.findFirst({
      where: eq(auditLog.projectId, proj.id),
      orderBy: (auditLog, { desc }) => [desc(auditLog.createdAt)]
    })
    expect(audit?.action).toBe('project_renamed')
    expect(audit?.metadata).toMatchObject({
      oldName: 'Owner Rename',
      newName: 'Admin Rename'
    })

    const organizationAudit = await createCaller(
      owner.id
    ).auditLog.listForOrganization({
      organizationId: proj.organizationId,
      limit: 20
    })
    const renameEvent = organizationAudit.logs.find(
      (item) => item.action === 'project_renamed'
    )
    expect(renameEvent?.project).toEqual({
      id: proj.id,
      name: 'Admin Rename',
      slug: proj.slug
    })
    expect(renameEvent?.user).not.toHaveProperty('email')
  })

  test('rejects duplicate names, invalid names, and unknown projects', async () => {
    const owner = await createTestUser()
    const first = await createTestProject(owner.id, 'First Project')
    await setOrgPlan(first.organizationId, 'pro')
    const second = await createTestProject(owner.id, 'Second Project')

    await expect(
      createCaller(owner.id).projects.update({
        projectId: second.id,
        name: 'First Project'
      })
    ).rejects.toMatchObject({ code: 'CONFLICT' })

    await expect(
      createCaller(owner.id).projects.update({
        projectId: second.id,
        name: '!!!'
      })
    ).rejects.toBeDefined()

    await expect(
      createCaller(owner.id).projects.update({
        projectId: crypto.randomUUID(),
        name: 'Missing'
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('blocks project rename when the organization is over its seat limit', async () => {
    const owner = await createTestUser()
    const admin = await createTestUser({ email: 'readonly-admin@test.local' })
    const proj = await createTestProject(owner.id, 'Read Only Project')
    await setOrgPlan(proj.organizationId, 'team', 1)
    await addMember({
      organizationId: proj.organizationId,
      userId: admin.id,
      role: 'admin'
    })

    await expect(
      createCaller(admin.id).projects.update({
        projectId: proj.id,
        name: 'Blocked'
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const unchanged = await getTestDb().query.project.findFirst({
      where: eq(project.id, proj.id),
      columns: { name: true }
    })
    expect(unchanged?.name).toBe('Read Only Project')
  })
})
