import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

// Load .env into process.env if present
const envPath = path.resolve(import.meta.dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k?.trim();
      const val = v.join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Fallback test defaults
if (!process.env.PAYPAL_CLIENT_ID) process.env.PAYPAL_CLIENT_ID = 'test_paypal_client_id';
if (!process.env.PAYPAL_CLIENT_SECRET) process.env.PAYPAL_CLIENT_SECRET = 'test_paypal_client_secret';
if (!process.env.NODE_ENV) Reflect.set(process.env, 'NODE_ENV', 'test');

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
