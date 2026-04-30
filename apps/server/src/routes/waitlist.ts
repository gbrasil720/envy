// apps/api/src/routes/waitlist.ts
import { db, eq } from '@envy/db'
import { waitlist } from '@envy/db/schema/envy'
import Elysia from 'elysia'

export const waitlistRoutes = new Elysia().post(
  '/waitlist',
  async ({ body, status }) => {
    const { email } = body as { email: string }

    if (!email || !email.includes('@')) {
      return status(400, { message: 'Invalid email' })
    }

    const existing = await db.query.waitlist.findFirst({
      where: eq(waitlist.email, email)
    })

    if (existing) return { success: true }

    await db.insert(waitlist).values({
      id: crypto.randomUUID(),
      email,
      status: 'pending'
    })

    return { success: true }
  }
)
