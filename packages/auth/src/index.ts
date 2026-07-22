import { dash } from '@better-auth/infra'
import { and, createDb, eq } from '@envy/db'
import * as envySchema from '@envy/db/schema/envy'
// Barrel em schema/index — export map `./*` resolve `schema/index` → src/schema/index.ts
// (não `@envy/db/schema`, que procuraria src/schema.ts e falha).
// Adapter precisa do schema INTEIRO pra enxergar organization/member/invitation/subscription.
import * as schema from '@envy/db/schema/index'
import { env } from '@envy/env/server'
import { APIError, betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { openAPI, organization } from 'better-auth/plugins'
import { nanoid } from 'nanoid' // ajuste pro gerador de ID que o resto do
// projeto já usa — precisa ser o MESMO padrão usado nas outras tabelas,
// senão os IDs de organization/member criados aqui ficam inconsistentes
// com os criados pelas rotas normais do plugin.

export function createAuth() {
  const db = createDb()

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema
    }),
    socialProviders: {
      github: {
        clientId:
          env.NODE_ENV === 'development'
            ? env.GITHUB_CLIENT_ID_DEV
            : env.GITHUB_CLIENT_ID,
        clientSecret:
          env.NODE_ENV === 'development'
            ? env.GITHUB_CLIENT_SECRET_DEV
            : env.GITHUB_CLIENT_SECRET,
        // Must match the GitHub OAuth App "Authorization callback URL" exactly.
        // Mismatch here surfaces as GitHub bad_verification_code on token exchange.
        redirectURI: `${env.BETTER_AUTH_URL.replace(/\/$/, '')}/api/auth/callback/github`
      }
    },
    trustedOrigins: [
      env.CORS_ORIGIN,
      env.BETTER_AUTH_URL,
      ...(env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) ?? [])
    ],
    databaseHooks: {
      user: {
        create: {
          // FIX: faltava inteiramente. Sem isso, o modelo de "org pessoal
          // implícita" que decidimos não existe na prática — usuário
          // cadastra e não tem organização nenhuma pra sessão apontar.
          //
          // Feito via insert direto (não auth.api.createOrganization),
          // porque neste ponto do ciclo de vida ainda não existe sessão
          // ativa pro usuário recém-criado — createOrganization do plugin
          // espera contexto de sessão. Como é uma ação de sistema (não
          // uma decisão de negócio do usuário), inserir direto é seguro
          // CONTANTO que os campos batam exatamente com o que o plugin
          // esperaria ter criado.
          after: async (user) => {
            const organizationId = nanoid()
            const memberId = nanoid()
            const subscriptionId = nanoid()
            const now = new Date()

            await db.insert(schema.organization).values({
              id: organizationId,
              name: user.name ?? 'Personal',
              slug: `personal-${user.id}`, // precisa ser único — ajuste
              // a estratégia de slug se `user.id` não for adequado pra URL
              type: 'personal',
              createdAt: now
            })

            await db.insert(schema.member).values({
              id: memberId,
              organizationId,
              userId: user.id,
              role: 'owner', // string, não enum — ver organization.ts
              createdAt: now
            })

            // Fail-closed seatLimit for assertOrganizationWritable
            await db.insert(schema.subscription).values({
              id: subscriptionId,
              organizationId,
              plan: 'free',
              status: 'active',
              dodoCustomerId: 'free',
              seatLimit: 1,
              createdAt: now,
              updatedAt: now
            })

            // Nota: NÃO seta session.activeOrganizationId aqui — a sessão
            // ainda não existe neste hook. O fallback de "sem org ativa
            // = usa a pessoal" precisa estar na camada de leitura de
            // sessão (ou setar activeOrganizationId no hook de
            // session.create.before, buscando a org pessoal do usuário).
          }
        }
      },
      session: {
        create: {
          before: async (session) => {
            const dbUser = await db.query.user.findFirst({
              where: (u, { eq }) => eq(u.id, session.userId)
            })

            if (!dbUser?.email) {
              throw new APIError('FORBIDDEN', {
                message: 'No email associated with this account'
              })
            }

            const [entry] = await db
              .select()
              .from(envySchema.waitlist)
              .where(
                and(
                  eq(envySchema.waitlist.email, dbUser.email),
                  eq(envySchema.waitlist.status, 'approved')
                )
              )
              .limit(1)

            if (!entry) {
              // Distinct message so the server can map waitlist rejection
              // separately from OAuth state/code failures.
              throw new APIError('FORBIDDEN', {
                message:
                  'WAITLIST_NOT_APPROVED: This email is not approved for early access'
              })
            }

            // FIX: complementa o hook de user.create.after — se a sessão
            // ainda não tem activeOrganizationId (primeiro login), aponta
            // pra org pessoal do usuário automaticamente (não arquivada).
            if (!session.activeOrganizationId) {
              const personalOrg = await db.query.member.findFirst({
                where: (m, { eq }) => eq(m.userId, session.userId),
                with: { organization: true }
              })

              const org = personalOrg?.organization
              if (
                personalOrg &&
                org?.type === 'personal' &&
                org.deletedAt == null
              ) {
                session.activeOrganizationId = personalOrg.organizationId
              }
            }
          }
        }
      }
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL.replace(/\/$/, ''),
    // Cookie-backed OAuth state: the full payload lives in an encrypted cookie
    // set on the API host during sign-in. Database strategy failed here with
    // "verification not found" on callback (adapter/DB write not durable in
    // this stack); cookie state matches Better Auth's cross-port localhost flow.
    account: {
      storeStateStrategy: 'cookie'
    },
    // When OAuth state is unreadable, Better Auth redirects here (not the
    // errorCallbackURL stored inside state). Always land on the web login page.
    onAPIError: {
      errorURL: `${env.CORS_ORIGIN.replace(/\/$/, '')}/login`
    },
    advanced: {
      defaultCookieAttributes: {
        // localhost:3000 and localhost:3001 are same-site (schemeful localhost).
        // Production web/api on different sites need None+Secure+domain.
        sameSite: env.NODE_ENV === 'development' ? 'lax' : 'none',
        secure: env.NODE_ENV !== 'development',
        httpOnly: true,
        path: '/',
        domain: env.NODE_ENV === 'development' ? undefined : '.useenvy.dev'
      }
    },
    plugins: [
      organization({
        // Sem isso, allowUserToCreateOrganization default permite qualquer
        // usuário criar múltiplas orgs de time à vontade — confirme se é
        // isso que você quer, ou restrinja aqui (ex: exigir plano pago).
      }),
      dash(),
      openAPI()
    ]
  })
}

export const auth = createAuth()
