import { db } from '../db/client';
import { auditLog } from '../db/schema';
import { redactObject } from './redact';
import crypto from 'node:crypto';

export type AuditActor = 'agent' | 'user' | 'system';

export interface AuditParams {
  disputeId?: string | null;
  actor: AuditActor;
  event: string;
  detail: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  const redactedDetail = redactObject(params.detail);
  const ts = new Date().toISOString();

  // Print to console with correlation
  console.log(`[AUDIT] [${ts}] [${params.actor.toUpperCase()}] [${params.event}]` +
    (params.disputeId ? ` [Dispute: ${params.disputeId}]` : ''),
    JSON.stringify(redactedDetail)
  );

  try {
    db.insert(auditLog).values({
      id: crypto.randomUUID(),
      disputeId: params.disputeId ?? null,
      actor: params.actor,
      event: params.event,
      detail: JSON.stringify(redactedDetail),
      ts,
    }).run();
  } catch (err) {
    console.error('Failed to write to audit_log table:', err);
  }
}
