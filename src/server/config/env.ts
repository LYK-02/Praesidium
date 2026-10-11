import { z } from 'zod';

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),

  // PayPal Configuration
  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().min(1, 'PAYPAL_CLIENT_ID is required'),
  PAYPAL_CLIENT_SECRET: z.string().min(1, 'PAYPAL_CLIENT_SECRET is required'),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(''),
  ALLOW_LIVE: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),

  // LLM Configuration (NVIDIA NIM by default)
  LLM_PROVIDER: z.string().default('nvidia-nim'),
  NVIDIA_NIM_API_KEY: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  LLM_MODEL: z.string().default('meta/llama-3.3-70b-instruct'),

  // Database
  DATABASE_URL: z.string().default('file:./praesidium.db'),

  // Security & Authentication
  ADMIN_PASSWORD: z.string().min(6, 'ADMIN_PASSWORD must be at least 6 characters').default('Praesidium@Admin2026'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').default('ac33546668f64a3df5af00f6eea1b1a37ca937cfedd14654a8f45d4f10d9c913'),
}).refine(
  (data) => {
    // Hard guard: reject live host if ALLOW_LIVE is false
    if (data.PAYPAL_ENV === 'live' && !data.ALLOW_LIVE) {
      return false;
    }
    return true;
  },
  {
    message: 'FATAL: PAYPAL_ENV=live is blocked unless ALLOW_LIVE=true explicitly.',
    path: ['PAYPAL_ENV'],
  }
);

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:\n', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment configuration validation failed');
  }

  // Derive active LLM API key
  const activeKey = result.data.NVIDIA_NIM_API_KEY || result.data.LLM_API_KEY || '';
  parsedEnv = {
    ...result.data,
    LLM_API_KEY: activeKey,
  };

  return parsedEnv;
}

export const env = getEnv();
