import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { webhookEvents } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { payPalClient } from '@/server/paypal/client';
import { env } from '@/server/config/env';
import { enqueueJob } from '@/server/jobs/queue';
import { logAudit } from '@/server/audit/logger';
import { nowUtc } from '@/lib/dates';
import { WebhookEventSchema, type WebhookHeaders } from '@/server/paypal/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Content-Type and size validation
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported Content-Type. Expected application/json' }, { status: 415 });
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  // Cap size at 512KB
  if (rawBodyText.length > 512 * 1024) {
    return NextResponse.json({ error: 'Payload exceeds maximum size' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBodyText);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  // Parse structured event
  const parsedEvent = WebhookEventSchema.safeParse(body);
  if (!parsedEvent.success) {
    return NextResponse.json({ error: 'Invalid PayPal webhook event schema', details: parsedEvent.error.format() }, { status: 400 });
  }

  const event = parsedEvent.data;
  const isSimulation = req.headers.get('x-praesidium-simulation') === 'true' && env.NODE_ENV !== 'production';

  // 2. Signature verification
  if (!isSimulation) {
    const authAlgo = req.headers.get('paypal-auth-algo');
    const certUrl = req.headers.get('paypal-cert-url');
    const transmissionId = req.headers.get('paypal-transmission-id');
    const transmissionSig = req.headers.get('paypal-transmission-sig');
    const transmissionTime = req.headers.get('paypal-transmission-time');

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      await logAudit({
        actor: 'system',
        event: 'webhook_missing_headers',
        detail: { eventId: event.id, eventType: event.event_type },
      });
      return NextResponse.json({ error: 'Missing PayPal verification headers' }, { status: 400 });
    }

    const headers: WebhookHeaders = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: env.PAYPAL_WEBHOOK_ID || 'WEBHOOK_ID_PLACEHOLDER',
    };

    const isVerified = await payPalClient.verifyWebhookSignature(headers, body as Record<string, unknown>);
    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
  }

  // 3. Deduplication check
  const existing = db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, event.id))
    .get();

  if (existing) {
    await logAudit({
      actor: 'system',
      event: 'webhook_deduplicated',
      detail: { eventId: event.id, eventType: event.event_type },
    });
    return NextResponse.json({ status: 'already_processed', eventId: event.id }, { status: 200 });
  }

  // 4. Durable write to webhook_events
  const receivedAt = nowUtc();
  db.insert(webhookEvents)
    .values({
      id: event.id,
      type: event.event_type,
      payload: JSON.stringify(body),
      receivedAt,
      processedAt: null,
      status: 'pending',
    })
    .run();

  await logAudit({
    actor: 'system',
    event: 'webhook_received_stored',
    detail: {
      eventId: event.id,
      eventType: event.event_type,
      isSimulation,
    },
  });

  // 5. Enqueue background job
  await enqueueJob('process_webhook', {
    eventId: event.id,
    eventType: event.event_type,
    resource: event.resource,
  });

  // 6. Fast 200 response to caller
  return NextResponse.json({ status: 'accepted', eventId: event.id }, { status: 200 });
}
