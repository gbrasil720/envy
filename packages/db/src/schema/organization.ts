import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { subscription } from './billing'
import { project } from './envy'

// ── Enums ──────────────────────────────────────────────────────────────

export const organizationTypeEnum = pgEnum('organization_type', [
  'personal',
  'team'
])

// REVERTIDO: member.role NÃO pode ser pgEnum de valor único. O plugin
// organization() do Better Auth trata role como string, suportando
// múltiplos papéis simultâneos separados por vírgula (ex: "admin,owner"),
// e cria automaticamente um member com role 'owner' ao criar a org
// (creatorRole default). Um enum de valor único quebraria os dois
// comportamentos. Mantido como `text` — a validação de quais papéis são
// aceitos é responsabilidade do plugin (option `roles`), não do banco.

// ── Organization ───────────────────────────────────────────────────────

export const organization = pgTable(
  'organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),

    // Campo customizado, além do schema padrão do Better Auth. Seguro
    // porque tem default — o insert nativo do plugin (que não sabe desse
    // campo) não quebra.
    type: organizationTypeEnum('type').notNull().default('personal'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    metadata: jsonb('metadata'),

    // Soft-delete por retenção fiscal. Nullable — seguro pro insert nativo.
    deletedAt: timestamp('deleted_at')

    // REMOVIDO: ownerId. O schema padrão do plugin não tem esse campo, e
    // como é NOT NULL sem default, o insert nativo de criação de org
    // (que não preenche esse campo) quebraria com violação de constraint.
    // Ownership já tem fonte única de verdade nativa do Better Auth:
    // member.role contém 'owner'. Use isOrganizationOwner() (services.ts)
    // pra checar isso, e SEMPRE use auth.api.* pra mudar ownership — nunca
    // um UPDATE direto — porque o plugin já garante nativamente que o
    // último owner não pode ser removido sem transferir antes.
  },
  (table) => [
    uniqueIndex('organization_slug_uidx').on(table.slug),
    index('organization_type_idx').on(table.type),
    index('organization_deletedAt_idx').on(table.deletedAt)
  ]
)

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Texto, não enum — ver nota acima. Valores esperados pelo plugin:
    // 'owner' | 'admin' | 'member', podendo ser combinados por vírgula.
    role: text('role').default('member').notNull(),

    createdAt: timestamp('created_at').notNull()
  },
  (table) => [
    index('member_organizationId_idx').on(table.organizationId),
    index('member_userId_idx').on(table.userId),
    uniqueIndex('member_organizationId_userId_uidx').on(
      table.organizationId,
      table.userId
    )
  ]
)

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').default('member').notNull(),
    status: text('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
  },
  (table) => [
    index('invitation_organizationId_idx').on(table.organizationId),
    index('invitation_email_idx').on(table.email)
  ]
)

// ── Relations ──────────────────────────────────────────────────────────

export const organizationRelations = relations(
  organization,
  ({ many, one }) => ({
    members: many(member),
    invitations: many(invitation),
    projects: many(project),
    subscription: one(subscription)
  })
)

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id]
  }),
  user: one(user, { fields: [member.userId], references: [user.id] })
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id]
  }),
  user: one(user, { fields: [invitation.inviterId], references: [user.id] })
}))
