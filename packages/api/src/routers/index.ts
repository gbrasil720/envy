import { publicProcedure, router } from '../index'
import { auditLogRouter } from './auditLog'
import { authRouter } from './auth'
import { cliAuthRouter } from './cli-auth'
import { meRouter } from './me'
import { membersRouter } from './members'
import { projectsRouter } from './projects'
import { secretsRouter } from './secrets'

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return 'OK'
  }),
  me: meRouter,
  auth: authRouter,
  cliAuth: cliAuthRouter,
  projects: projectsRouter,
  secrets: secretsRouter,
  members: membersRouter,
  auditLog: auditLogRouter
})
export type AppRouter = typeof appRouter
