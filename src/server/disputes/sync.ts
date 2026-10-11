/**
 * Praesidium — Dispute Synchronization Service
 * Ingests and synchronizes disputes from PayPal Sandbox into SQLite `disputes` table.
 */

import { db } from '@/server/db/client';
import { disputes } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { payPalClient } from '@/server/paypal/client';
import { toMinorUnits } from '@/lib/money';
import { nowUtc } from '@/lib/dates';
import { redactObject } from '@/server/audit/redact';
import { logAudit } from '@/server/audit/logger';
import type { DisputeSummary } from '@/server/paypal/types';

export interface SyncResult {
  totalFetched: number;
  created: number;
  updated: number;
  disputeIds: string[];
}

/**
 * Normalizes PayPal status to domain lifecycle state on initial ingestion.
 */
function mapInitialLifecycleStatus(paypalStatus: string): string {
  const upper = paypalStatus.toUpperCase();
  if (upper === 'RESOLVED') return 'resolved';
  if (upper === 'UNDER_REVIEW') return 'under_review';
  return 'received';
}

/**
 * Upserts a single dispute from PayPal into the database.
 */
export async function upsertDisputeRecord(
  item: DisputeSummary & { [key: string]: unknown }
): Promise<'created' | 'updated'> {
  const disputeId = item.dispute_id;
  const existing = db.select().from(disputes).where(eq(disputes.id, disputeId)).get();

  const amountMinor = toMinorUnits(item.dispute_amount.value);
  const currency = item.dispute_amount.currency_code || 'USD';
  const stage = item.dispute_life_cycle_stage || 'INQUIRY';
  const reason = item.reason || 'GENERAL_DISPUTE';
  const dueAt = item.seller_response_due_date || item.buyer_response_due_date || null;
  const createdAt = item.create_time || nowUtc();
  const updatedAt = nowUtc();

  // Extract transaction ID and buyer ref if available
  let transactionId: string | null = null;
  let buyerRef: string | null = null;

  if (Array.isArray(item.disputed_transactions) && item.disputed_transactions.length > 0) {
    const tx = item.disputed_transactions[0];
    if (tx) {
      transactionId = tx.seller_transaction_id || tx.buyer_transaction_id || null;
      buyerRef = tx.buyer?.name || null;
    }
  }

  const redactedPayload = JSON.stringify(redactObject(item as Record<string, unknown>));

  if (existing) {
    // If dispute already exists, do not overwrite downstream progress unless PayPal marked it resolved or under_review
    let statusToSet = existing.status;
    const paypalUpper = item.status.toUpperCase();
    if (paypalUpper === 'RESOLVED') {
      statusToSet = 'resolved';
    } else if (paypalUpper === 'UNDER_REVIEW' && existing.status === 'submitted') {
      statusToSet = 'under_review';
    }

    db.update(disputes)
      .set({
        reason,
        stage,
        status: statusToSet,
        amountMinor,
        currency,
        buyerRef: buyerRef || existing.buyerRef,
        transactionId: transactionId || existing.transactionId,
        dueAt: dueAt || existing.dueAt,
        updatedAt,
        paypalRaw: redactedPayload,
      })
      .where(eq(disputes.id, disputeId))
      .run();

    await logAudit({
      disputeId,
      actor: 'system',
      event: 'dispute_synced_updated',
      detail: { disputeId, status: statusToSet, stage },
    });

    return 'updated';
  } else {
    const initialStatus = mapInitialLifecycleStatus(item.status);

    db.insert(disputes)
      .values({
        id: disputeId,
        reason,
        stage,
        status: initialStatus,
        amountMinor,
        currency,
        buyerRef,
        transactionId,
        dueAt,
        createdAt,
        updatedAt,
        paypalRaw: redactedPayload,
      })
      .run();

    await logAudit({
      disputeId,
      actor: 'system',
      event: 'dispute_synced_created',
      detail: { disputeId, status: initialStatus, stage, amountMinor, currency },
    });

    return 'created';
  }
}

/**
 * Fetches and synchronizes disputes from PayPal Sandbox.
 */
export async function syncDisputesFromPayPal(pageSize = 20): Promise<SyncResult> {
  const response = await payPalClient.listDisputes(pageSize);
  const items = response.items || [];

  let created = 0;
  let updated = 0;
  const disputeIds: string[] = [];

  for (const item of items) {
    const res = await upsertDisputeRecord(item as DisputeSummary & { [key: string]: unknown });
    if (res === 'created') created++;
    else updated++;
    disputeIds.push(item.dispute_id);
  }

  await logAudit({
    actor: 'system',
    event: 'disputes_sync_completed',
    detail: { totalFetched: items.length, created, updated },
  });

  return {
    totalFetched: items.length,
    created,
    updated,
    disputeIds,
  };
}

/**
 * Synchronizes a single dispute by ID from PayPal.
 */
export async function syncSingleDispute(disputeId: string): Promise<'created' | 'updated'> {
  const raw = await payPalClient.getDispute(disputeId);
  const item = raw as unknown as DisputeSummary & { [key: string]: unknown };
  return upsertDisputeRecord(item);
}
