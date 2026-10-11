import { env } from '../config/env';
import { getPayPalAccessToken } from './auth';
import {
  PayPalError,
  DisputesListResponseSchema,
  type DisputesListResponse,
  type ProvideEvidenceInput,
  type AcceptClaimInput,
  type WebhookHeaders,
} from './types';
import { logAudit } from '../audit/logger';
import crypto from 'node:crypto';

export class PayPalClient {
  private get baseUrl(): string {
    return env.PAYPAL_ENV === 'live' && env.ALLOW_LIVE
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const token = await getPayPalAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    // Add idempotency header for mutating calls if not provided
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
      if (!headers.has('PayPal-Request-Id')) {
        headers.set('PayPal-Request-Id', crypto.randomUUID());
      }
    }

    let attempt = 0;
    while (attempt < retries) {
      attempt++;
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // 429 Rate Limit or 5xx Server Error: retry with jittered exponential backoff
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          const delay = Math.pow(2, attempt) * 300 + Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new PayPalError(
            `PayPal API call to ${endpoint} failed (${response.status})`,
            response.status,
            errorBody
          );
        }

        // Return empty object for 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        const data = await response.json();
        return data as T;
      } catch (err) {
        if (attempt >= retries || (err instanceof PayPalError && err.statusCode < 500 && err.statusCode !== 429)) {
          throw err;
        }
      }
    }

    throw new PayPalError(`Exhausted retries calling ${endpoint}`, 500);
  }

  public async listDisputes(pageSize = 20): Promise<DisputesListResponse> {
    const raw = await this.request<unknown>(`/v1/customer/disputes?page_size=${pageSize}`);
    const parsed = DisputesListResponseSchema.safeParse(raw);

    if (!parsed.success) {
      await logAudit({
        actor: 'system',
        event: 'paypal_list_disputes_parse_warning',
        detail: { errors: parsed.error.format() },
      });
      return raw as DisputesListResponse;
    }

    await logAudit({
      actor: 'system',
      event: 'paypal_list_disputes_success',
      detail: { itemCount: parsed.data.items?.length ?? 0 },
    });

    return parsed.data;
  }

  public async getDispute(disputeId: string): Promise<Record<string, unknown>> {
    const data = await this.request<Record<string, unknown>>(`/v1/customer/disputes/${disputeId}`);
    await logAudit({
      disputeId,
      actor: 'system',
      event: 'paypal_get_dispute_success',
      detail: { disputeId },
    });
    return data;
  }

  /**
   * Submits structured dispute evidence (e.g. proof of fulfillment/delivery with tracking).
   * Guarded by PayPal-Request-Id idempotency.
   */
  public async provideEvidence(
    disputeId: string,
    payload: ProvideEvidenceInput,
    idempotencyKey?: string
  ): Promise<Record<string, unknown>> {
    const requestId = idempotencyKey || crypto.randomUUID();
    const endpoint = `/v1/customer/disputes/${disputeId}/provide-evidence`;

    await logAudit({
      disputeId,
      actor: 'agent',
      event: 'paypal_provide_evidence_initiated',
      detail: { disputeId, evidenceType: payload.evidence_type, idempotencyKey: requestId },
    });

    const headers: Record<string, string> = {
      'PayPal-Request-Id': requestId,
    };

    const res = await this.request<Record<string, unknown>>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    await logAudit({
      disputeId,
      actor: 'agent',
      event: 'paypal_provide_evidence_success',
      detail: { disputeId, idempotencyKey: requestId },
    });

    return res;
  }

  /**
   * Accepts buyer claim, issuing a full refund and closing the dispute.
   * Guarded by PayPal-Request-Id idempotency.
   */
  public async acceptClaim(
    disputeId: string,
    payload: AcceptClaimInput,
    idempotencyKey?: string
  ): Promise<Record<string, unknown>> {
    const requestId = idempotencyKey || crypto.randomUUID();
    const endpoint = `/v1/customer/disputes/${disputeId}/accept-claim`;

    await logAudit({
      disputeId,
      actor: 'agent',
      event: 'paypal_accept_claim_initiated',
      detail: { disputeId, reason: payload.accept_claim_reason, idempotencyKey: requestId },
    });

    const headers: Record<string, string> = {
      'PayPal-Request-Id': requestId,
    };

    const res = await this.request<Record<string, unknown>>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    await logAudit({
      disputeId,
      actor: 'agent',
      event: 'paypal_accept_claim_success',
      detail: { disputeId, idempotencyKey: requestId },
    });

    return res;
  }

  /**
   * Verifies incoming webhook signature against PayPal's verification API.
   */
  public async verifyWebhookSignature(
    headers: WebhookHeaders,
    body: Record<string, unknown>
  ): Promise<boolean> {
    const endpoint = '/v1/notifications/verify-webhook-signature';
    const payload = {
      auth_algo: headers.auth_algo,
      cert_url: headers.cert_url,
      transmission_id: headers.transmission_id,
      transmission_sig: headers.transmission_sig,
      transmission_time: headers.transmission_time,
      webhook_id: headers.webhook_id,
      webhook_event: body,
    };

    try {
      const result = await this.request<{ verification_status: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const isVerified = result.verification_status?.toUpperCase() === 'SUCCESS';
      await logAudit({
        actor: 'system',
        event: 'paypal_webhook_signature_verified',
        detail: {
          transmissionId: headers.transmission_id,
          status: result.verification_status,
          isVerified,
        },
      });

      return isVerified;
    } catch (err) {
      await logAudit({
        actor: 'system',
        event: 'paypal_webhook_signature_error',
        detail: {
          error: err instanceof Error ? err.message : String(err),
          transmissionId: headers.transmission_id,
        },
      });
      return false;
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; env: string; status: number }> {
    try {
      const token = await getPayPalAccessToken();
      return { ok: Boolean(token), env: env.PAYPAL_ENV, status: 200 };
    } catch {
      return { ok: false, env: env.PAYPAL_ENV, status: 500 };
    }
  }
}

export const payPalClient = new PayPalClient();
