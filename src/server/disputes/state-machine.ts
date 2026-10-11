/**
 * Praesidium — Dispute Lifecycle State Machine
 * Pipeline: received → classified → evidence_collecting → analysed →
 *           awaiting_approval → submitted | accepted | needs_human → resolved
 */

import { db } from '@/server/db/client';
import { disputes } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { StateTransitionError } from '@/lib/errors';
import { logAudit, type AuditActor } from '@/server/audit/logger';
import { nowUtc } from '@/lib/dates';

export type DisputeLifecycleState =
  | 'received'
  | 'classified'
  | 'evidence_collecting'
  | 'analysed'
  | 'awaiting_approval'
  | 'submitted'
  | 'accepted'
  | 'needs_human'
  | 'under_review'
  | 'resolved';

export const VALID_TRANSITIONS: Record<DisputeLifecycleState, DisputeLifecycleState[]> = {
  received: ['classified', 'needs_human', 'resolved'],
  classified: ['evidence_collecting', 'needs_human', 'resolved'],
  evidence_collecting: ['analysed', 'needs_human', 'resolved'],
  analysed: ['awaiting_approval', 'submitted', 'accepted', 'needs_human', 'resolved'],
  awaiting_approval: ['submitted', 'accepted', 'needs_human', 'resolved'],
  submitted: ['under_review', 'resolved', 'needs_human'],
  under_review: ['resolved', 'needs_human', 'submitted'],
  accepted: ['resolved'],
  needs_human: ['awaiting_approval', 'submitted', 'accepted', 'resolved'],
  resolved: [], // Terminal state
};

/**
 * Checks whether a transition between two lifecycle states is allowed.
 */
export function canTransition(
  currentState: string,
  nextState: DisputeLifecycleState
): boolean {
  if (currentState === nextState) return true; // Idempotent no-op allowed
  const allowed = VALID_TRANSITIONS[currentState as DisputeLifecycleState];
  if (!allowed) return false;
  return allowed.includes(nextState);
}

/**
 * Transitions a dispute to a new lifecycle state.
 * Throws StateTransitionError if the transition is illegal.
 * Emits an audit log entry on state transition.
 */
export async function transitionDispute(
  disputeId: string,
  nextState: DisputeLifecycleState,
  options: {
    actor?: AuditActor;
    reason?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const existing = db.select().from(disputes).where(eq(disputes.id, disputeId)).get();

  if (!existing) {
    throw new StateTransitionError(`Dispute ${disputeId} not found in database`, { disputeId });
  }

  const currentState = existing.status as DisputeLifecycleState;

  if (currentState === nextState) {
    // Idempotent no-op
    return;
  }

  if (!canTransition(currentState, nextState)) {
    throw new StateTransitionError(
      `Illegal state transition from "${currentState}" to "${nextState}" for dispute ${disputeId}`,
      { disputeId, currentState, nextState }
    );
  }

  const updatedAt = nowUtc();

  db.update(disputes)
    .set({
      status: nextState,
      updatedAt,
    })
    .where(eq(disputes.id, disputeId))
    .run();

  await logAudit({
    disputeId,
    actor: options.actor ?? 'system',
    event: 'dispute_state_transition',
    detail: {
      previousState: currentState,
      newState: nextState,
      reason: options.reason ?? 'State transition triggered',
      ...options.metadata,
    },
  });
}
