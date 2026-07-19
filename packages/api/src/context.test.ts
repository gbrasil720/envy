import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { generateApiToken, hashToken, tokenPrefix } from '@envy/crypto'
import { apiKey } from '@envy/db/schema/envy'
import { createTRPCContext } from './context'
import { assertDbReady, getTestDb, truncateAll } from './test/db'
import { createTestUser } from './test/factories'

describe('createTRPCContext', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('returns null session when unauthenticated', async () => {
    const ctx = await createTRPCContext({
      headers: new Headers(),
      db: getTestDb(),
      resolveCookieSession: async () => null
    })
    expect(ctx.session).toBeNull()
    expect(ctx.apiKeyId).toBeNull()
  })

  test('authenticates valid Bearer API key', async () => {
    const user = await createTestUser()
    const raw = generateApiToken()
    const keyId = crypto.randomUUID()
    await getTestDb()
      .insert(apiKey)
      .values({
        id: keyId,
        userId: user.id,
        name: 'CLI',
        keyHash: await hashToken(raw),
        keyPrefix: tokenPrefix(raw)
      })

    const headers = new Headers({ Authorization: `Bearer ${raw}` })
    const ctx = await createTRPCContext({
      headers,
      db: getTestDb(),
      resolveCookieSession: async () => {
        throw new Error('cookie resolver should not run when bearer works')
      }
    })

    expect(ctx.session?.user.id).toBe(user.id)
    expect(ctx.apiKeyId).toBe(keyId)
    expect(ctx.authHeader).toBe(`Bearer ${raw}`)
  })

  test('ignores revoked or unknown Bearer tokens', async () => {
    const user = await createTestUser()
    const raw = generateApiToken()
    await getTestDb()
      .insert(apiKey)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        name: 'CLI',
        keyHash: await hashToken(raw),
        keyPrefix: tokenPrefix(raw),
        revokedAt: new Date()
      })

    const revoked = await createTRPCContext({
      headers: new Headers({ Authorization: `Bearer ${raw}` }),
      db: getTestDb(),
      resolveCookieSession: async () => null
    })
    expect(revoked.session).toBeNull()

    const unknown = await createTRPCContext({
      headers: new Headers({ Authorization: 'Bearer envy_live_notarealtoken' }),
      db: getTestDb(),
      resolveCookieSession: async () => null
    })
    expect(unknown.session).toBeNull()
  })

  test('falls back to cookie session when no valid bearer', async () => {
    const user = await createTestUser()
    const headers = new Headers({ cookie: 'session=abc' })

    const ctx = await createTRPCContext({
      headers,
      db: getTestDb(),
      resolveCookieSession: async () => ({ user: { id: user.id } })
    })

    expect(ctx.session?.user.id).toBe(user.id)
    expect(ctx.apiKeyId).toBeNull()
    expect(ctx.cookieHeader).toBe('session=abc')
  })

  test('bearer takes precedence over cookie', async () => {
    const apiUser = await createTestUser({ email: 'api@test.local' })
    const cookieUser = await createTestUser({ email: 'cookie@test.local' })
    const raw = generateApiToken()
    const keyId = crypto.randomUUID()
    await getTestDb()
      .insert(apiKey)
      .values({
        id: keyId,
        userId: apiUser.id,
        name: 'CLI',
        keyHash: await hashToken(raw),
        keyPrefix: tokenPrefix(raw)
      })

    const ctx = await createTRPCContext({
      headers: new Headers({
        Authorization: `Bearer ${raw}`,
        cookie: 'session=abc'
      }),
      db: getTestDb(),
      resolveCookieSession: async () => ({ user: { id: cookieUser.id } })
    })

    expect(ctx.session?.user.id).toBe(apiUser.id)
    expect(ctx.apiKeyId).toBe(keyId)
  })
})
