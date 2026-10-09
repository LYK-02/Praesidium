// @ts-check
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('   Praesidium — Phase 0 Sandbox & NIM Validator    ');
console.log('====================================================\n');

// 1. Check for .env file
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  Notice: .env file not found.');
  console.log('   Please copy .env.example to .env and fill in your credentials:');
  console.log('   - PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET (from developer.paypal.com)');
  console.log('   - NVIDIA_NIM_API_KEY (from build.nvidia.com)\n');
  process.exit(0);
}

// Simple env loader
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [k, ...v] = trimmed.split('=');
    env[k.trim()] = v.join('=').trim();
  }
}

async function testPayPalSandbox() {
  console.log('[1/2] Testing PayPal Sandbox Connection...');
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.includes('your_paypal')) {
    console.log('  ⏭️  Skipping PayPal check: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not configured.');
    return;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`  ❌ PayPal OAuth failed (HTTP ${tokenRes.status}):`, err);
      return;
    }

    const tokenData = await tokenRes.json();
    console.log('  ✅ PayPal OAuth token acquired successfully.');
    console.log(`     Token Type: ${tokenData.token_type}, Expires in: ${tokenData.expires_in}s`);

    // Test List Disputes
    const disputesRes = await fetch('https://api-m.sandbox.paypal.com/v1/customer/disputes?page_size=10', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!disputesRes.ok) {
      const err = await disputesRes.text();
      console.warn(`  ⚠️  GET /v1/customer/disputes returned HTTP ${disputesRes.status}:`, err);
    } else {
      const disputesData = await disputesRes.json();
      const count = disputesData.items ? disputesData.items.length : 0;
      console.log(`  ✅ Successfully queried PayPal Disputes API. Active disputes in sandbox: ${count}`);
    }
  } catch (err) {
    console.error('  ❌ Network error contacting PayPal sandbox:', err.message);
  }
}

async function testNvidiaNim() {
  console.log('\n[2/2] Testing NVIDIA NIM Connection...');
  const apiKey = env.NVIDIA_NIM_API_KEY || env.LLM_API_KEY;
  const baseUrl = env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = env.LLM_MODEL || 'meta/llama-3.3-70b-instruct';

  if (!apiKey || apiKey.includes('your_nvidia')) {
    console.log('  ⏭️  Skipping NVIDIA NIM check: NVIDIA_NIM_API_KEY not configured.');
    return;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are Praesidium dispute analyzer. Reply in valid JSON only.' },
          { role: 'user', content: 'Output a JSON object with {"status": "ok", "provider": "nvidia-nim"}.' },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ NVIDIA NIM request failed (HTTP ${res.status}):`, err);
      return;
    }

    const data = await res.json();
    console.log('  ✅ NVIDIA NIM responded successfully:');
    console.log(`     Model: ${data.model}`);
    console.log(`     Content: ${data.choices?.[0]?.message?.content?.trim()}`);
  } catch (err) {
    console.error('  ❌ Network error contacting NVIDIA NIM:', err.message);
  }
}

async function main() {
  await testPayPalSandbox();
  await testNvidiaNim();
  console.log('\n====================================================');
  console.log('   Phase 0 validation check complete.             ');
  console.log('====================================================\n');
}

main();
