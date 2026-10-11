/**
 * Praesidium — Mutating Action Executors
 * Executes provide-evidence and accept-claim with idempotency keys,
 * database audit trails, and state machine transitions.
 */

import { db } from '@/server/db/client';
import { actions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { payPalClient } from '@/server/paypal/client';
import { transitionDispute } from '@/server/disputes/state-machine';
import { redactObject } from '@/server/audit/redact';
import { logAudit } from '@/server/audit/logger';
import { nowUtc } from '@/lib/dates';
import type { ProvideEvidenceInput, AcceptClaimInput } from '@/server/paypal/types';

export interface ExecuteProvideEvidenceParams {
  disputeId: string;
  evidence: ProvideEvidenceInput;
  approvedBy?: string;
  idempotencyKey?: string;
}

export interface ExecuteAcceptClaimParams {
  disputeId: string;
  claim: AcceptClaimInput;
  approvedBy?: string;
  idempotencyKey?: string;
}

export interface ActionExecutionResult {
  actionId: string;
  status: 'executed' | 'cached' | 'failed';
  disputeId: string;
  type: 'provide_evidence' | 'accept_claim';
  idempotencyKey: string;
  response: Record<string, unknown>;
}

/**
 * Executes a provide-evidence mutation against PayPal with idempotency.
 */
export async function executeProvideEvidence(
  params: ExecuteProvideEvidenceParams
): Promise<ActionExecutionResult> {
  const { disputeId, evidence, approvedBy = 'human' } = params;
  const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

  // 1. Idempotency Check: check if already executed with this key
  const existingAction = db
    .select()
    .from(actions)
    .where(eq(actions.idempotencyKey, idempotencyKey))
    .get();

  if (existingAction && existingAction.status === 'executed') {
    return {
      actionId: existingAction.id,
      status: 'cached',
      disputeId,
      type: 'provide_evidence',
      idempotencyKey,
      response: existingAction.response ? JSON.parse(existingAction.response) : {},
    };
  }

  const actionId = existingAction?.id || crypto.randomUUID();
  const createdAt = nowUtc();
  const redactedRequest = JSON.stringify(redactObject(evidence as unknown as Record<string, unknown>));

  if (!existingAction) {
    db.insert(actions)
      .values({
        id: actionId,
        disputeId,
        type: 'provide_evidence',
        status: 'pending',
        approvedBy,
        idempotencyKey,
        request: redactedRequest,
        response: null,
        createdAt,
      })
      .run();
  }

  try {
    // 2. Call PayPal Sandbox API
    const payPalResponse = await payPalClient.provideEvidence(disputeId, evidence, idempotencyKey);
    const redactedResponse = JSON.stringify(redactObject(payPalResponse));

    // 3. Mark action as executed
    db.update(actions)
      .set({
        status: 'executed',
        response: redactedResponse,
      })
      .where(eq(actions.id, actionId))
      .run();

    // 4. Update dispute state machine to 'submitted'
    try {
      await transitionDispute(disputeId, 'submitted', {
        actor: approvedBy === 'agent' ? 'agent' : 'user',
        reason: 'Evidence provided to PayPal',
        metadata: { actionId, idempotencyKey },
      });
    } catch (stateErr) {
      // Log transition warning if dispute is already in advanced state
      await logAudit({
        disputeId,
        actor: 'system',
        event: 'dispute_state_transition_warning',
        detail: { error: stateErr instanceof Error ? stateErr.message : String(stateErr) },
      });
    }

    return {
      actionId,
      status: 'executed',
      disputeId,
      type: 'provide_evidence',
      idempotencyKey,
      response: payPalResponse,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    db.update(actions)
      .set({
        status: 'failed',
        response: JSON.stringify({ error: errorMsg }),
      })
      .where(eq(actions.id, actionId))
      .run();

    await logAudit({
      disputeId,
      actor: 'system',
      event: 'action_provide_evidence_failed',
      detail: { actionId, idempotencyKey, error: errorMsg },
    });

    throw err;
  }
}

/**
 * Executes an accept-claim mutation against PayPal with idempotency.
 */
export async function executeAcceptClaim(
  params: ExecuteAcceptClaimParams
): Promise<ActionExecutionResult> {
  const { disputeId, claim, approvedBy = 'human' } = params;
  const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

  // 1. Idempotency Check
  const existingAction = db
    .select()
    .from(actions)
    .where(eq(actions.idempotencyKey, idempotencyKey))
    .get();

  if (existingAction && existingAction.status === 'executed') {
    return {
      actionId: existingAction.id,
      status: 'cached',
      disputeId,
      type: 'accept_claim',
      idempotencyKey,
      response: existingAction.response ? JSON.parse(existingAction.response) : {},
    };
  }

  const actionId = existingAction?.id || crypto.randomUUID();
  const createdAt = nowUtc();
  const redactedRequest = JSON.stringify(redactObject(claim as unknown as Record<string, unknown>));

  if (!existingAction) {
    db.insert(actions)
      .values({
        id: actionId,
        disputeId,
        type: 'accept_claim',
        status: 'pending',
        approvedBy,
        idempotencyKey,
        request: redactedRequest,
        response: null,
        createdAt,
      })
      .run();
  }

  try {
    // 2. Call PayPal Sandbox API
    const payPalResponse = await payPalClient.acceptClaim(disputeId, claim, idempotencyKey);
    const redactedResponse = JSON.stringify(redactObject(payPalResponse));

    // 3. Mark action as executed
    db.update(actions)
      .set({
        status: 'executed',
        response: redactedResponse,
      })
      .where(eq(actions.id, actionId))
      .run();

    // 4. Update dispute state machine to 'accepted'
    try {
      await transitionDispute(disputeId, 'accepted', {
        actor: approvedBy === 'agent' ? 'agent' : 'user',
        reason: 'Claim accepted / refund approved for buyer',
        metadata: { actionId, idempotencyKey },
      });
    } catch (stateErr) {
      await logAudit({
        disputeId,
        actor: 'system',
        event: 'dispute_state_transition_warning',
        detail: { error: stateErr instanceof Error ? stateErr.message : String(stateErr) },
      });
    }

    return {
      actionId,
      status: 'executed',
      disputeId,
      type: 'accept_claim',
      idempotencyKey,
      response: payPalResponse,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    db.update(actions)
      .set({
        status: 'failed',
        response: JSON.stringify({ error: errorMsg }),
      })
      .where(eq(actions.id, actionId))
      .run();

    await logAudit({
      disputeId,
      actor: 'system',
      event: 'action_accept_claim_failed',
      detail: { actionId, idempotencyKey, error: errorMsg },
    });

    throw err;
  }
}
