import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { organization } from './organization'

// ── Enums ──────────────────────────────────────────────────────────────

// Plano concreto vendido — mapeia 1:1 com os price/product IDs do
// DodoPayments. Mantenha isso em sync manualmente; não derive de string livre.
export const planEnum = pgEnum('plan', ['free', 'pro', 'team'])

// Dodo's subscription lifecycle. A missing row represents the Free plan;
// subscription rows are only created after Dodo has identified a customer.
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'on_hold',
  'cancelled',
  'expired',
  'failed'
])

// ── Subscription ───────────────────────────────────────────────────────

export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),

    // FK única (1:1) — cada organização tem no máximo UMA subscription
    // ativa por vez. Orgs 'personal' carregam free/pro; orgs 'team'
    // carregam o plano team. Nunca aponta pra user.id. Pra saber quem é
    // responsável/notificar sobre billing, consulte member.role = 'owner'
    // dessa organização (ver isOrganizationOwner em services.ts) — não
    // existe mais organization.ownerId, essa é a fonte nativa do Better Auth.
    organizationId: text('organization_id')
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: 'cascade' }),

    plan: planEnum('plan').notNull(),
    status: subscriptionStatusEnum('status').notNull().default('active'),

    // IDs do DodoPayments — necessários pra reconciliar webhook <-> linha.
    // The customer is created at the first organization checkout, rather than
    // at sign-up. This keeps Dodo customers scoped to the billed organization.
    dodoCustomerId: text('dodo_customer_id').notNull(),
    dodoSubscriptionId: text('dodo_subscription_id').unique(),
    dodoProductId: text('dodo_product_id'),

    // Limite de membros do plano atual — congelado no momento da assinatura.
    // Free/Pro = 1, Team = 5. Evita hardcode espalhado; se o preço mudar
    // pra um plano existente, assinaturas antigas mantêm o limite contratado.
    seatLimit: integer('seat_limit').notNull().default(1),

    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: timestamp('cancel_at_period_end'),
    canceledAt: timestamp('canceled_at'),
    readOnlyNotifiedAt: timestamp('read_only_notified_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex('subscription_organizationId_uidx').on(table.organizationId),
    index('subscription_dodoCustomerId_idx').on(table.dodoCustomerId),
    index('subscription_status_idx').on(table.status)
  ]
)

// Customer identity is separate from a subscription so an organization can
// start checkout without manufacturing a synthetic Free subscription row.
export const billingCustomer = pgTable(
  'billing_customer',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: 'cascade' }),
    dodoCustomerId: text('dodo_customer_id').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex('billing_customer_organizationId_uidx').on(
      table.organizationId
    ),
    uniqueIndex('billing_customer_dodoCustomerId_uidx').on(table.dodoCustomerId)
  ]
)

// Histórico bruto de eventos de webhook — guarda o payload como veio,
// pra debug e reprocessamento se algum handler tiver bug. Não é fonte
// de verdade de estado (subscription é), é log de auditoria de billing.
export const billingEvent = pgTable(
  'billing_event',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'set null'
    }),
    dodoEventId: text('dodo_event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    payload: text('payload').notNull(), // JSON bruto do webhook
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('billing_event_dodoEventId_uidx').on(table.dodoEventId),
    index('billing_event_organizationId_idx').on(table.organizationId)
  ]
)

// ── Relations ──────────────────────────────────────────────────────────

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  organization: one(organization, {
    fields: [subscription.organizationId],
    references: [organization.id]
  })
}))

export const billingCustomerRelations = relations(
  billingCustomer,
  ({ one }) => ({
    organization: one(organization, {
      fields: [billingCustomer.organizationId],
      references: [organization.id]
    })
  })
)

export const billingEventRelations = relations(billingEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [billingEvent.organizationId],
    references: [organization.id]
  })
}))
