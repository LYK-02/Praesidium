import { describe, it, expect, beforeEach } from 'vitest';
import { canTransition, transitionDispute } from '@/server/disputes/state-machine';
import { db } from '@/server/db/client';
import { disputes } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { StateTransitionError } from '@/lib/errors';
import { nowUtc } from '@/lib/dates';

describe('Dispute State Machine', () => {
  const testDisputeId = 'TEST-DISPUTE-SM-001';

  beforeEach(() => {
    // Reset test dispute row in DB
    db.delete(disputes).where(eq(disputes.id, testDisputeId)).run();
    db.insert(disputes)
      .values({
        id: testDisputeId,
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        stage: 'CHARGEBACK',
        status: 'received',
        amountMinor: 5000,
        currency: 'USD',
        createdAt: nowUtc(),
        updatedAt: nowUtc(),
      })
      .run();
  });

  it('validates allowed transitions correctly', () => {
    expect(canTransition('received', 'classified')).toBe(true);
    expect(canTransition('classified', 'evidence_collecting')).toBe(true);
    expect(canTransition('evidence_collecting', 'analysed')).toBe(true);
    expect(canTransition('analysed', 'awaiting_approval')).toBe(true);
    expect(canTransition('awaiting_approval', 'submitted')).toBe(true);
    expect(canTransition('awaiting_approval', 'accepted')).toBe(true);
    expect(canTransition('submitted', 'under_review')).toBe(true);
    expect(canTransition('under_review', 'resolved')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('received', 'submitted')).toBe(false);
    expect(canTransition('received', 'under_review')).toBe(false);
    expect(canTransition('resolved', 'analysed')).toBe(false);
  });

  it('executes valid state transition and updates database', async () => {
    await transitionDispute(testDisputeId, 'classified', {
      actor: 'system',
      reason: 'Classifier playbook assigned',
    });

    const row = db.select().from(disputes).where(eq(disputes.id, testDisputeId)).get();
    expect(row?.status).toBe('classified');
  });

  it('throws StateTransitionError on illegal transition', async () => {
    await expect(
      transitionDispute(testDisputeId, 'submitted', {
        actor: 'system',
      })
    ).rejects.toThrow(StateTransitionError);
  });

  it('allows idempotent transition to the same state without error', async () => {
    await transitionDispute(testDisputeId, 'received');
    const row = db.select().from(disputes).where(eq(disputes.id, testDisputeId)).get();
    expect(row?.status).toBe('received');
  });
});
