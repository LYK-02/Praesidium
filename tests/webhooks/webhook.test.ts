import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/paypal/route';
import { db } from '@/server/db/client';
import { webhookEvents } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { payPalClient } from '@/server/paypal/client';
import { env } from '@/server/config/env';

describe('Webhook API Route (/api/webhooks/paypal)', () => {
  const eventId = `WH-TEST-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const validPayload = {
    id: eventId,
    create_time: now,
    resource_type: 'dispute',
    event_type: 'CUSTOMER.DISPUTE.CREATED',
    summary: 'A dispute has been created',
    resource: {
      dispute_id: 'PP-D-TEST-WEBHOOK-99',
      status: 'WAITING_FOR_SELLER_RESPONSE',
      dispute_amount: {
        currency_code: 'USD',
        value: '99.00',
      },
      reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    },
  };

  const paypalHeaders = {
    'content-type': 'application/json',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123',
    'paypal-transmission-id': crypto.randomUUID(),
    'paypal-transmission-sig': 'mock_sig_value',
    'paypal-transmission-time': now,
  };

  beforeEach(() => {
    db.delete(webhookEvents).where(eq(webhookEvents.id, eventId)).run();
    vi.restoreAllMocks();
  });

  it('rejects requests with non-JSON content type', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'not json',
    });

    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it('rejects requests when PAYPAL_WEBHOOK_ID is unconfigured/placeholder', async () => {
    // Temporarily set webhook ID to placeholder
    const origId = env.PAYPAL_WEBHOOK_ID;
    env.PAYPAL_WEBHOOK_ID = 'WEBHOOK_ID_PLACEHOLDER';

    const req = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: paypalHeaders,
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('PAYPAL_WEBHOOK_ID is unconfigured');

    env.PAYPAL_WEBHOOK_ID = origId;
  });

  it('rejects requests without PayPal verification headers in non-simulation mode', async () => {
    // Valid configured webhook ID
    const origId = env.PAYPAL_WEBHOOK_ID;
    env.PAYPAL_WEBHOOK_ID = 'WH-CONFIGURED-REAL-ID';

    const req = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing PayPal verification headers');

    env.PAYPAL_WEBHOOK_ID = origId;
  });

  it('rejects forged webhook requests when PayPal signature verification fails', async () => {
    const origId = env.PAYPAL_WEBHOOK_ID;
    env.PAYPAL_WEBHOOK_ID = 'WH-CONFIGURED-REAL-ID';

    // Mock verifyWebhookSignature returning false (forged request)
    vi.spyOn(payPalClient, 'verifyWebhookSignature').mockResolvedValueOnce(false);

    const req = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: paypalHeaders,
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid webhook signature');

    // Ensure NOTHING is stored in webhook_events
    const row = db.select().from(webhookEvents).where(eq(webhookEvents.id, eventId)).get();
    expect(row).toBeUndefined();

    env.PAYPAL_WEBHOOK_ID = origId;
  });

  it('accepts valid live PayPal webhook with verified signature', async () => {
    const origId = env.PAYPAL_WEBHOOK_ID;
    env.PAYPAL_WEBHOOK_ID = 'WH-CONFIGURED-REAL-ID';

    // Mock verifyWebhookSignature returning true (legitimate PayPal webhook)
    vi.spyOn(payPalClient, 'verifyWebhookSignature').mockResolvedValueOnce(true);

    const req = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: paypalHeaders,
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('accepted');
    expect(body.eventId).toBe(eventId);

    // Verify written to database
    const row = db.select().from(webhookEvents).where(eq(webhookEvents.id, eventId)).get();
    expect(row).toBeDefined();
    expect(row?.status).toBe('pending');

    env.PAYPAL_WEBHOOK_ID = origId;
  });

  it('accepts simulated webhook in non-production mode', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-praesidium-simulation': 'true',
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('accepted');
    expect(body.eventId).toBe(eventId);

    // Verify written to DB
    const row = db.select().from(webhookEvents).where(eq(webhookEvents.id, eventId)).get();
    expect(row).toBeDefined();
    expect(row?.type).toBe('CUSTOMER.DISPUTE.CREATED');
  });

  it('deduplicates identical webhook events on retry', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-praesidium-simulation': 'true',
      },
      body: JSON.stringify(validPayload),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Second call with same eventId
    const req2 = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-praesidium-simulation': 'true',
      },
      body: JSON.stringify(validPayload),
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.status).toBe('already_processed');
  });
});
