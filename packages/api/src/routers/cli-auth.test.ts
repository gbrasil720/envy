import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test'
import { eq } from '@envy/db'
import { apiKey, cliAuthSession } from '@envy/db/schema/envy'
import type { TRPCError } from '@trpc/server'
import { createCaller } from '../test/caller'
import { assertDbReady, getTestDb, truncateAll } from '../test/db'
import { createTestUser } from '../test/factories'

describe('cliAuth router', () => {
  beforeAll(async () => {
    await assertDbReady()
  })

  beforeEach(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await truncateAll()
  })

  test('start returns session token and browser auth url', async () => {
    const caller = createCaller()
    const result = await caller.cliAuth.start()

    expect(result.session_token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(result.url).toContain('/cli-auth?session=')
    expect(result.expires_at).toBeTruthy()

    const row = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, result.session_token)
    })
    expect(row?.status).toBe('pending')
    expect(row?.browserToken).toBeTruthy()
  })

  test('poll stays pending until approved, then returns api key once', async () => {
    const owner = await createTestUser()
    const anon = createCaller()
    const authed = createCaller(owner.id)

    const started = await anon.cliAuth.start()
    const session = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, started.session_token)
    })
    if (!session) throw new Error('session missing')

    const pending = await anon.cliAuth.poll({ token: started.session_token })
    expect(pending).toEqual({ status: 'pending' })

    await authed.cliAuth.approve({ token: session.browserToken })

    const authorized = await anon.cliAuth.poll({
      token: started.session_token
    })
    expect(authorized.status).toBe('authorized')
    if (authorized.status !== 'authorized') {
      throw new Error('expected authorized')
    }
    expect(authorized.api_key.startsWith('envy_live_')).toBe(true)

    // one-shot: session row deleted after first poll
    const after = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, started.session_token)
    })
    expect(after).toBeUndefined()

    try {
      await anon.cliAuth.poll({ token: started.session_token })
      expect.unreachable('expected NOT_FOUND on second poll')
    } catch (err) {
      expect((err as TRPCError).code).toBe('NOT_FOUND')
    }

    const keys = await getTestDb().query.apiKey.findMany({
      where: eq(apiKey.userId, owner.id)
    })
    expect(keys).toHaveLength(1)
    expect(keys[0]?.keyPrefix).toContain('...')
  })

  test('approve requires authentication', async () => {
    const started = await createCaller().cliAuth.start()
    const session = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, started.session_token)
    })
    if (!session) throw new Error('session missing')

    try {
      await createCaller().cliAuth.approve({ token: session.browserToken })
      expect.unreachable('expected UNAUTHORIZED')
    } catch (err) {
      expect((err as TRPCError).code).toBe('UNAUTHORIZED')
    }
  })

  test('poll rejects expired sessions', async () => {
    const token = crypto.randomUUID()
    const browserToken = crypto.randomUUID()
    await getTestDb()
      .insert(cliAuthSession)
      .values({
        id: crypto.randomUUID(),
        sessionToken: token,
        browserToken,
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000)
      })

    try {
      await createCaller().cliAuth.poll({ token })
      expect.unreachable('expected UNAUTHORIZED')
    } catch (err) {
      expect((err as TRPCError).code).toBe('UNAUTHORIZED')
      expect((err as TRPCError).message).toContain('expired')
    }

    // Expired sessions are deleted on poll, not marked 'expired'
    const row = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, token)
    })
    expect(row).toBeUndefined()
  })

  test('cancel marks session cancelled and poll reports it', async () => {
    const started = await createCaller().cliAuth.start()
    const session = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, started.session_token)
    })
    if (!session) throw new Error('session missing')

    await createCaller().cliAuth.cancel({ token: session.browserToken })
    const polled = await createCaller().cliAuth.poll({
      token: started.session_token
    })
    expect(polled).toEqual({ status: 'cancelled' })
  })

  test('getSession returns status for browser token', async () => {
    const started = await createCaller().cliAuth.start()
    const session = await getTestDb().query.cliAuthSession.findFirst({
      where: eq(cliAuthSession.sessionToken, started.session_token)
    })
    if (!session) throw new Error('session missing')

    const info = await createCaller().cliAuth.getSession({
      token: session.browserToken
    })
    expect(info.status).toBe('pending')
    expect(info.expiresAt).toBeTruthy()
  })

  test('start cleans up expired pending sessions', async () => {
    await getTestDb()
      .insert(cliAuthSession)
      .values({
        id: crypto.randomUUID(),
        sessionToken: crypto.randomUUID(),
        browserToken: crypto.randomUUID(),
        status: 'pending',
        expiresAt: new Date(Date.now() - 60_000)
      })

    await createCaller().cliAuth.start()

    const expiredLeft = await getTestDb().query.cliAuthSession.findMany({
      where: eq(cliAuthSession.status, 'pending')
    })
    // only the freshly created session should remain pending and not expired
    expect(expiredLeft).toHaveLength(1)
    const remaining = expiredLeft[0]
    expect(remaining).toBeDefined()
    expect(remaining?.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })
})
