/**
 * Praesidium — Webhook Registration Script
 *
 * Usage:
 *   pnpm webhook:register [tunnel_url]
 *
 * Example:
 *   pnpm webhook:register https://my-tunnel.trycloudflare.com
 */

import { registerOrUpdateWebhook, maskIdentifier, normalizeWebhookUrl } from '../src/server/paypal/webhook-manager';
import { env } from '../src/server/config/env';

async function main() {
  console.log('====================================================');
  console.log('   Praesidium — PayPal Sandbox Webhook Registrar    ');
  console.log('====================================================\n');

  // 1. Sandbox guard
  if (env.PAYPAL_ENV !== 'sandbox') {
    console.error('❌ Error: Webhook registration is strictly permitted in sandbox mode only.');
    console.error(`   Current PAYPAL_ENV: ${env.PAYPAL_ENV}`);
    process.exit(1);
  }

  // 2. Determine target URL
  const inputArg = process.argv[2]?.trim();
  const rawUrl = inputArg || env.PUBLIC_BASE_URL;

  if (!rawUrl || rawUrl === 'http://localhost:3000') {
    console.error('❌ Error: A public tunnel URL is required.');
    console.error('   PayPal Sandbox cannot deliver webhooks to localhost.\n');
    console.error('   Steps to obtain a tunnel URL:');
    console.error('   1. Run: pnpm tunnel');
    console.error('   2. Copy the generated URL (e.g., https://abc-xyz.trycloudflare.com)');
    console.error('   3. Run: pnpm webhook:register https://abc-xyz.trycloudflare.com\n');
    process.exit(1);
  }

  const endpointUrl = normalizeWebhookUrl(rawUrl);
  console.log(`Target Webhook Endpoint: ${endpointUrl}`);
  console.log('Connecting to PayPal Sandbox API (OAuth 2.0)...');

  try {
    const result = await registerOrUpdateWebhook(endpointUrl);

    console.log('\n----------------------------------------------------');
    if (result.action === 'created') {
      console.log('✅ Status: Successfully CREATED new PayPal Sandbox webhook.');
    } else if (result.action === 'updated') {
      console.log('✅ Status: Successfully UPDATED existing PayPal Sandbox webhook URL.');
    } else {
      console.log('✅ Status: Webhook already configured for this URL (NO-OP).');
    }

    console.log(`Masked Webhook ID : ${maskIdentifier(result.webhookId)}`);
    console.log(`Registered URL    : ${result.url}`);
    console.log('----------------------------------------------------\n');

    console.log('👉 Paste this exact line into your .env file:');
    console.log(`PAYPAL_WEBHOOK_ID=${result.webhookId}\n`);
    console.log('⚠️  Notice: Never commit your .env file to version control.');
  } catch (err) {
    console.error('\n❌ Failed to register/update webhook:');
    console.error((err as Error).message);
    process.exit(1);
  }
}

void main();
