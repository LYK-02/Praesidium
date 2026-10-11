import { NextResponse } from 'next/server';
import { payPalClient } from '@/server/paypal/client';
import { env } from '@/server/config/env';

export async function GET() {
  const ppStatus = await payPalClient.healthCheck();

  return NextResponse.json({
    status: ppStatus.ok ? 'healthy' : 'degraded',
    paypal: {
      status: ppStatus.ok ? 'connected' : 'error',
      env: ppStatus.env,
    },
    llm: {
      provider: env.LLM_PROVIDER,
      model: env.LLM_MODEL,
      configured: Boolean(env.LLM_API_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
