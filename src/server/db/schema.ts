import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const disputes = sqliteTable('disputes', {
  id: text('id').primaryKey(), // PayPal dispute_id (e.g., PP-D-12345)
  reason: text('reason').notNull(),
  stage: text('stage').notNull(),
  status: text('status').notNull(),
  amountMinor: integer('amount_minor').notNull(), // cents / minor units
  currency: text('currency').notNull().default('USD'),
  buyerRef: text('buyer_ref'),
  transactionId: text('transaction_id'),
  dueAt: text('due_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  paypalRaw: text('paypal_raw'), // redacted JSON
});

export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey(), // PayPal event_id (dedupe key)
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  receivedAt: text('received_at').notNull(),
  processedAt: text('processed_at'),
  status: text('status').notNull().default('pending'),
});

export const evidenceItems = sqliteTable('evidence_items', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id').notNull().references(() => disputes.id),
  kind: text('kind').notNull(), // tracking | delivery_proof | order_history | chat_log
  source: text('source').notNull(),
  summary: text('summary').notNull(),
  payload: text('payload').notNull(), // JSON
  collectedAt: text('collected_at').notNull(),
});

export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id').notNull().references(() => disputes.id),
  action: text('action').notNull(), // contest | accept | needs_human
  winProbability: real('win_probability').notNull(),
  confidence: real('confidence').notNull(),
  rationale: text('rationale').notNull(),
  citations: text('citations').notNull(), // JSON array
  missingEvidence: text('missing_evidence'), // JSON array
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  createdAt: text('created_at').notNull(),
});

export const actions = sqliteTable('actions', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id').notNull().references(() => disputes.id),
  type: text('type').notNull(), // provide_evidence | accept_claim
  status: text('status').notNull(), // pending | executed | failed
  approvedBy: text('approved_by').notNull().default('human'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  request: text('request'), // redacted JSON
  response: text('response'), // redacted JSON
  createdAt: text('created_at').notNull(),
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id'),
  actor: text('actor').notNull(), // agent | user | system
  event: text('event').notNull(),
  detail: text('detail').notNull(), // redacted JSON
  ts: text('ts').notNull(),
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  runAt: text('run_at').notNull(),
  lastError: text('last_error'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
