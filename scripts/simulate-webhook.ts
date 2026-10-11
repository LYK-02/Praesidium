/**
 * Praesidium — Webhook Simulation Script
 * Simulates real PayPal Sandbox dispute webhook events against the local endpoint.
 *
 * Usage:
 *   node scripts/simulate-webhook.mjs [eventType] [disputeId] [reason]
 *
 * Examples:
 *   node scripts/simulate-webhook.mjs created PP-D-10001 MERCHANDISE_OR_SERVICE_NOT_RECEIVED
 *   node scripts/simulate-webhook.mjs resolved PP-D-10001
 */

import crypto from 'node:crypto';

const targetUrl = process.env.WEBHOOK_TARGET_URL || 'http://localhost:3000/api/webhooks/paypal';
const args = process.argv.slice(2);
const eventArg = (args[0] || 'created').toLowerCase();
const disputeId = args[1] || `PP-D-${Math.floor(10000 + Math.random() * 90000)}`;
const disputeReason = args[2] || 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED';

type EventType = 'CUSTOMER.DISPUTE.CREATED' | 'CUSTOMER.DISPUTE.UPDATED' | 'CUSTOMER.DISPUTE.RESOLVED';

let eventType: EventType = 'CUSTOMER.DISPUTE.CREATED';
if (eventArg === 'updated') {
  eventType = 'CUSTOMER.DISPUTE.UPDATED';
} else if (eventArg === 'resolved') {
  eventType = 'CUSTOMER.DISPUTE.RESOLVED';
}

const eventId = `WH-${crypto.randomUUID()}`;
const now = new Date().toISOString();
const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

const mockPayload = {
  id: eventId,
  create_time: now,
  resource_type: 'dispute',
  event_version: '1.0',
  event_type: eventType,
  summary: `Dispute ${disputeId} ${eventType.split('.').pop()?.toLowerCase()}`,
  resource: {
    dispute_id: disputeId,
    create_time: now,
    update_time: now,
    status: eventType === 'CUSTOMER.DISPUTE.RESOLVED' ? 'RESOLVED' : 'WAITING_FOR_SELLER_RESPONSE',
    dispute_life_cycle_stage: 'CHARGEBACK',
    dispute_channel: 'INTERNAL',
    dispute_amount: {
      currency_code: 'USD',
      value: '149.99',
    },
    reason: disputeReason,
    seller_response_due_date: dueDate,
    disputed_transactions: [
      {
        seller_transaction_id: `TX-${crypto.randomUUID().slice(0, 8)}`,
        buyer_transaction_id: `TX-${crypto.randomUUID().slice(0, 8)}`,
        gross_amount: {
          currency_code: 'USD',
          value: '149.99',
        },
        buyer: {
          name: 'Jane Doe',
        },
      },
    ],
  },
};

console.log('====================================================');
console.log('   Praesidium — PayPal Webhook Event Simulator      ');
console.log('====================================================');
console.log(`Target URL : ${targetUrl}`);
console.log(`Event ID   : ${eventId}`);
console.log(`Event Type : ${eventType}`);
console.log(`Dispute ID : ${disputeId}`);
console.log(`Reason     : ${disputeReason}`);
console.log('----------------------------------------------------');

async function sendWebhook() {
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Praesidium-Simulation': 'true',
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123',
        'paypal-transmission-id': crypto.randomUUID(),
        'paypal-transmission-sig': 'simulated_sig_base64',
        'paypal-transmission-time': now,
      },
      body: JSON.stringify(mockPayload),
    });

    const body = await res.json();
    console.log(`Response Status: HTTP ${res.status}`);
    console.log('Response Body  :', JSON.stringify(body, null, 2));

    if (res.ok) {
      console.log('\n✅ Webhook simulated and delivered successfully!');
    } else {
      console.error('\n❌ Webhook delivery failed.');
    }
  } catch (err) {
    console.error('\n❌ Connection error delivering webhook:', (err as Error).message);
    console.log('   Ensure Next.js dev server is running on http://localhost:3000');
  }
}

sendWebhook();
