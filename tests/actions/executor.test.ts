import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeProvideEvidence, executeAcceptClaim } from '@/server/actions/executor';
import { payPalClient } from '@/server/paypal/client';
import { db } from '@/server/db/client';
import { disputes, actions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { nowUtc } from '@/lib/dates';

describe('Action Executors & Idempotency', () => {
  const disputeId = 'TEST-DISPUTE-ACTION-001';

  beforeEach(() => {
    db.delete(actions).where(eq(actions.disputeId, disputeId)).run();
    db.delete(disputes).where(eq(disputes.id, disputeId)).run();

    db.insert(disputes)
      .values({
        id: disputeId,
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        stage: 'CHARGEBACK',
        status: 'awaiting_approval',
        amountMinor: 7500,
        currency: 'USD',
        createdAt: nowUtc(),
        updatedAt: nowUtc(),
      })
      .run();
  });

  it('executes provide-evidence and writes action record', async () => {
    const mockProvideEvidence = vi
      .spyOn(payPalClient, 'provideEvidence')
      .mockResolvedValueOnce({ status: 'SUCCESS' });

    const idempotencyKey = 'IDEMPOTENCY-KEY-001';
    const result = await executeProvideEvidence({
      disputeId,
      evidence: {
        evidence_type: 'PROOF_OF_FULFILLMENT',
        evidence_info: {
          tracking_info: [{ carrier_name: 'FEDEX', tracking_number: '123456789' }],
        },
        notes: 'Order delivered with direct signature confirmation.',
      },
      idempotencyKey,
    });

    expect(result.status).toBe('executed');
    expect(result.idempotencyKey).toBe(idempotencyKey);
    expect(mockProvideEvidence).toHaveBeenCalledTimes(1);

    // Verify DB action row
    const actionRow = db.select().from(actions).where(eq(actions.idempotencyKey, idempotencyKey)).get();
    expect(actionRow?.status).toBe('executed');
    expect(actionRow?.type).toBe('provide_evidence');

    // Verify dispute state transitioned to 'submitted'
    const disputeRow = db.select().from(disputes).where(eq(disputes.id, disputeId)).get();
    expect(disputeRow?.status).toBe('submitted');
  });

  it('prevents double-submit with same idempotency key (replay protection)', async () => {
    const mockProvideEvidence = vi
      .spyOn(payPalClient, 'provideEvidence')
      .mockResolvedValueOnce({ status: 'SUCCESS' });

    const idempotencyKey = 'IDEMPOTENCY-KEY-REPLAY-002';

    // First call
    const firstResult = await executeProvideEvidence({
      disputeId,
      evidence: {
        evidence_type: 'PROOF_OF_FULFILLMENT',
        notes: 'First submit',
      },
      idempotencyKey,
    });
    expect(firstResult.status).toBe('executed');
    expect(mockProvideEvidence).toHaveBeenCalledTimes(1);

    // Second call with the same idempotency key
    const secondResult = await executeProvideEvidence({
      disputeId,
      evidence: {
        evidence_type: 'PROOF_OF_FULFILLMENT',
        notes: 'Second retry submit',
      },
      idempotencyKey,
    });

    expect(secondResult.status).toBe('cached');
    // Ensure PayPal was NOT called a second time
    expect(mockProvideEvidence).toHaveBeenCalledTimes(1);
  });

  it('executes accept-claim and updates state to accepted', async () => {
    const mockAcceptClaim = vi
      .spyOn(payPalClient, 'acceptClaim')
      .mockResolvedValueOnce({ status: 'RESOLVED' });

    const idempotencyKey = 'IDEMPOTENCY-ACCEPT-001';
    const result = await executeAcceptClaim({
      disputeId,
      claim: {
        accept_claim_reason: 'DID_NOT_SHIP_ITEM',
        note: 'Accepted liability due to stock outage.',
      },
      idempotencyKey,
    });

    expect(result.status).toBe('executed');
    expect(mockAcceptClaim).toHaveBeenCalledTimes(1);

    const disputeRow = db.select().from(disputes).where(eq(disputes.id, disputeId)).get();
    expect(disputeRow?.status).toBe('accepted');
  });
});
