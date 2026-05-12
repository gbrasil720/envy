// apps/api/src/routes/waitlist.ts
import { db } from '@envy/db'
import { waitlist } from '@envy/db/schema/envy'
import Elysia from 'elysia'
import { z } from 'zod'

const bodySchema = z.object({
  email: z.string().email().max(254).toLowerCase()
})

export const waitlistRoutes = new Elysia().post(
  '/waitlist',
  async ({ body, status }) => {
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return status(400, { message: 'Invalid email' })
    }

    await db
      .insert(waitlist)
      .values({
        id: crypto.randomUUID(),
        email: parsed.data.email,
        status: 'pending'
      })
      .onConflictDoNothing({ target: waitlist.email })

    return { success: true }
  }
)
