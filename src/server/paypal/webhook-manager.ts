
/**
 * Praesidium — PayPal Webhook Manager
 * Manages webhook registration and updates for PayPal Sandbox.
 * Ensures single webhook per tunnel, avoiding duplicate registrations.
 */

import { env } from '../config/env';
import { payPalClient, PayPalClient } from './client';
import { logAudit } from '../audit/logger';

export const DISPUTE_WEBHOOK_EVENT_TYPES = [
  'CUSTOMER.DISPUTE.CREATED',
  'CUSTOMER.DISPUTE.UPDATED',
  'CUSTOMER.DISPUTE.RESOLVED',
];

export interface WebhookRegistrationResult {
  action: 'created' | 'updated' | 'no-op';
  webhookId: string;
  url: string;
}

/**
 * Normalizes input URL so it always targets the /api/webhooks/paypal endpoint.
 */
export function normalizeWebhookUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error(`Invalid URL scheme: "${rawUrl}". Expected http:// or https://`);
  }

  const urlObj = new URL(trimmed);
  if (!urlObj.pathname || urlObj.pathname === '/' || !urlObj.pathname.includes('/api/webhooks/paypal')) {
    urlObj.pathname = '/api/webhooks/paypal';
  }

  return urlObj.toString();
}

/**
 * Masks a sensitive string, revealing only the last 4 characters.
 */
export function maskIdentifier(id: string): string {
  if (!id) return '';
  if (id.length <= 4) return '****';
  return '*'.repeat(Math.max(4, id.length - 4)) + id.slice(-4);
}

/**
 * Registers or updates the Praesidium dispute webhook in PayPal Sandbox.
 * - Refuses to run if PAYPAL_ENV is not 'sandbox'.
 * - Checks existing webhooks:
 *     - If exact URL already registered -> no-op
 *     - If existing dispute/tunnel webhook found -> PATCH url (update)
 *     - If none found -> POST webhook (create)
 */
export async function registerOrUpdateWebhook(
  targetUrl: string,
  client: PayPalClient = payPalClient
): Promise<WebhookRegistrationResult> {
  // Prime Directive: Sandbox Only
  if (env.PAYPAL_ENV !== 'sandbox') {
    throw new Error(
      `FATAL: Webhook registration is strictly restricted to sandbox. Current PAYPAL_ENV: "${env.PAYPAL_ENV}"`
    );
  }

  const normalizedUrl = normalizeWebhookUrl(targetUrl);
  const existingWebhooks = await client.listWebhooks();

  // 1. Check if exact URL already exists
  const exactMatch = existingWebhooks.find((wh) => wh.url === normalizedUrl);
  if (exactMatch) {
    await logAudit({
      actor: 'system',
      event: 'paypal_webhook_registration_noop',
      detail: { webhookId: maskIdentifier(exactMatch.id), url: normalizedUrl },
    });
    return {
      action: 'no-op',
      webhookId: exactMatch.id,
      url: normalizedUrl,
    };
  }

  // 2. Check if a webhook for dispute events or previous tunnel exists to update
  const disputeWebhook = existingWebhooks.find((wh) => {
    const hasDisputeEvents = wh.event_types?.some((e) =>
      DISPUTE_WEBHOOK_EVENT_TYPES.includes(e.name)
    );
    const isWebhookPath = wh.url.includes('/api/webhooks/paypal') || wh.url.includes('trycloudflare.com');
    return hasDisputeEvents || isWebhookPath;
  });

  if (disputeWebhook) {
    const updated = await client.updateWebhookUrl(disputeWebhook.id, normalizedUrl);
    await logAudit({
      actor: 'system',
      event: 'paypal_webhook_registration_updated',
      detail: { webhookId: maskIdentifier(disputeWebhook.id), newUrl: normalizedUrl },
    });
    return {
      action: 'updated',
      webhookId: updated.id || disputeWebhook.id,
      url: normalizedUrl,
    };
  }

  // 3. Create new webhook
  const created = await client.createWebhook(normalizedUrl, DISPUTE_WEBHOOK_EVENT_TYPES);
  await logAudit({
    actor: 'system',
    event: 'paypal_webhook_registration_created',
    detail: { webhookId: maskIdentifier(created.id), url: normalizedUrl },
  });

  return {
    action: 'created',
    webhookId: created.id,
    url: normalizedUrl,
  };
}
