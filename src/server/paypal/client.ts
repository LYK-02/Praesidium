import { env } from '../config/env';
import { getPayPalAccessToken } from './auth';
import { PayPalError, DisputesListResponseSchema, type DisputesListResponse } from './types';
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
