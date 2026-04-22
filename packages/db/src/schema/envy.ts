import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { organization, user } from './auth'

// ─── PROJECTS ────────────────────────────────────────────────────────────────

export const project = pgTable(
  'project',
  {
    // mesmo ID da organization do Better Auth — são a mesma entidade
    id: text('id')
      .primaryKey()
      .references(() => organization.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),

    // master key criptografada — AES-256-GCM
    encryptedMk: text('encrypted_mk').notNull(),
    mkIv: text('mk_iv').notNull(),
    mkTag: text('mk_tag').notNull(),

    // plano fica no metadata da organization — não duplicar aqui
    // billing é gerenciado pelo plugin do DodoPayments no usuário

    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex('project_slug_uidx').on(table.slug),
    index('project_createdBy_idx').on(table.createdBy)
  ]
)

// ─── ENVIRONMENTS ─────────────────────────────────────────────────────────────

export const environment = pgTable(
  'environment',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('environment_projectId_name_uidx').on(
      table.projectId,
      table.name
    ),
    index('environment_projectId_idx').on(table.projectId)
  ]
)

// ─── SECRETS ──────────────────────────────────────────────────────────────────

export const secret = pgTable(
  'secret',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environment.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    encryptedVal: text('encrypted_val').notNull(),
    valIv: text('val_iv').notNull(),
    valTag: text('val_tag').notNull(),
    valHash: text('val_hash').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex('secret_projectId_environmentId_key_uidx').on(
      table.projectId,
      table.environmentId,
      table.key
    ),
    index('secret_projectId_idx').on(table.projectId),
    index('secret_environmentId_idx').on(table.environmentId)
  ]
)

// ─── API KEYS ─────────────────────────────────────────────────────────────────

export const apiKey = pgTable(
  'api_key',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').default('CLI').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('api_key_userId_idx').on(table.userId),
    index('api_key_keyPrefix_idx').on(table.keyPrefix)
  ]
)

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    environment: text('environment'),
    action: text('action').notNull(),
    targetKey: text('target_key'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('audit_log_projectId_idx').on(table.projectId),
    index('audit_log_userId_idx').on(table.userId),
    index('audit_log_createdAt_idx').on(table.createdAt)
  ]
)

// ─── CLI AUTH SESSIONS ────────────────────────────────────────────────────────

export const cliAuthSession = pgTable(
  'cli_auth_session',
  {
    id: text('id').primaryKey(),
    sessionToken: text('session_token').notNull().unique(),
    status: text('status').notNull().default('pending'),
    rawKey: text('raw_key'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('cli_auth_session_token_uidx').on(table.sessionToken),
    index('cli_auth_session_expiresAt_idx').on(table.expiresAt),
    index('cli_auth_session_status_idx').on(table.status)
  ]
)

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const projectRelations = relations(project, ({ one, many }) => ({
  organization: one(organization, {
    fields: [project.id],
    references: [organization.id]
  }),
  creator: one(user, { fields: [project.createdBy], references: [user.id] }),
  environments: many(environment),
  secrets: many(secret),
  apiKeys: many(apiKey),
  auditLogs: many(auditLog)
}))

export const environmentRelations = relations(environment, ({ one, many }) => ({
  project: one(project, {
    fields: [environment.projectId],
    references: [project.id]
  }),
  secrets: many(secret)
}))

export const secretRelations = relations(secret, ({ one }) => ({
  project: one(project, {
    fields: [secret.projectId],
    references: [project.id]
  }),
  environment: one(environment, {
    fields: [secret.environmentId],
    references: [environment.id]
  }),
  createdBy: one(user, { fields: [secret.createdBy], references: [user.id] }),
  updatedBy: one(user, { fields: [secret.updatedBy], references: [user.id] })
}))

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, { fields: [apiKey.userId], references: [user.id] })
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  project: one(project, {
    fields: [auditLog.projectId],
    references: [project.id]
  }),
  user: one(user, { fields: [auditLog.userId], references: [user.id] })
}))
