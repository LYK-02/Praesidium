import { env } from '../config/env';
import { PayPalError } from './types';
import { logAudit } from '../audit/logger';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // unix ms
}

let cachedToken: CachedToken | null = null;
let refreshPromise: Promise<string> | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();

  // Return existing token if valid for at least another 60 seconds
  if (cachedToken && cachedToken.expiresAt - now > 60_000) {
    return cachedToken.accessToken;
  }

  // Single-flight deduplication: if refresh is in flight, await it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const baseUrl = env.PAYPAL_ENV === 'live' && env.ALLOW_LIVE
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const credentials = Buffer.from(
        `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64');

      const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PayPalError(
          `OAuth token request failed with HTTP ${response.status}`,
          response.status,
          errorText
        );
      }

      const data = await response.json();
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;

      cachedToken = {
        accessToken: data.access_token,
        expiresAt: now + expiresInSec * 1000,
      };

      await logAudit({
        actor: 'system',
        event: 'paypal_token_refreshed',
        detail: {
          tokenType: data.token_type,
          expiresInSeconds: expiresInSec,
        },
      });

      return cachedToken.accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
