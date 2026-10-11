import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { registerOrUpdateWebhook } from '@/server/paypal/webhook-manager';
import { PayPalClient } from '@/server/paypal/client';

const mockWebhookId = 'WH-MOCK-ID-9999';

// Setup MSW server to intercept PayPal OAuth and Webhook endpoints
const server = setupServer(
  // Intercept OAuth token refresh
  http.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', () => {
    return HttpResponse.json({
      access_token: 'mock_sandbox_access_token',
      token_type: 'Bearer',
      expires_in: 32400,
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PayPal Webhook Registration Logic (MSW)', () => {
  const client = new PayPalClient();

  it('no-op when a webhook with the exact URL is already registered', async () => {
    const targetUrl = 'https://active-tunnel.trycloudflare.com/api/webhooks/paypal';

    server.use(
      http.get('https://api-m.sandbox.paypal.com/v1/notifications/webhooks', () => {
        return HttpResponse.json({
          webhooks: [
            {
              id: mockWebhookId,
              url: targetUrl,
              event_types: [{ name: 'CUSTOMER.DISPUTE.CREATED' }],
            },
          ],
        });
      })
    );

    const result = await registerOrUpdateWebhook(targetUrl, client);

    expect(result.action).toBe('no-op');
    expect(result.webhookId).toBe(mockWebhookId);
    expect(result.url).toBe(targetUrl);
  });

  it('updates (PATCH) existing webhook when an old tunnel URL is present', async () => {
    const oldUrl = 'https://old-expired-tunnel.trycloudflare.com/api/webhooks/paypal';
    const newTunnelUrl = 'https://new-tunnel-subdomain.trycloudflare.com/api/webhooks/paypal';

    let patchCalled = false;
    let patchedValue = '';

    server.use(
      http.get('https://api-m.sandbox.paypal.com/v1/notifications/webhooks', () => {
        return HttpResponse.json({
          webhooks: [
            {
              id: mockWebhookId,
              url: oldUrl,
              event_types: [{ name: 'CUSTOMER.DISPUTE.CREATED' }],
            },
          ],
        });
      }),
      http.patch(`https://api-m.sandbox.paypal.com/v1/notifications/webhooks/${mockWebhookId}`, async ({ request }) => {
        patchCalled = true;
        const body = (await request.json()) as Array<{ op: string; path: string; value: string }>;
        patchedValue = body[0]?.value || '';
        return HttpResponse.json({
          id: mockWebhookId,
          url: patchedValue,
          event_types: [{ name: 'CUSTOMER.DISPUTE.CREATED' }],
        });
      })
    );

    const result = await registerOrUpdateWebhook(newTunnelUrl, client);

    expect(result.action).toBe('updated');
    expect(result.webhookId).toBe(mockWebhookId);
    expect(result.url).toBe(newTunnelUrl);
    expect(patchCalled).toBe(true);
    expect(patchedValue).toBe(newTunnelUrl);
  });

  it('creates (POST) new webhook when no existing webhook matches', async () => {
    const newUrl = 'https://brand-new-tunnel.trycloudflare.com/api/webhooks/paypal';
    let createCalled = false;

    server.use(
      http.get('https://api-m.sandbox.paypal.com/v1/notifications/webhooks', () => {
        return HttpResponse.json({ webhooks: [] });
      }),
      http.post('https://api-m.sandbox.paypal.com/v1/notifications/webhooks', async ({ request }) => {
        createCalled = true;
        const body = (await request.json()) as { url: string; event_types: Array<{ name: string }> };
        return HttpResponse.json({
          id: 'WH-NEW-1234',
          url: body.url,
          event_types: body.event_types,
        });
      })
    );

    const result = await registerOrUpdateWebhook(newUrl, client);

    expect(result.action).toBe('created');
    expect(result.webhookId).toBe('WH-NEW-1234');
    expect(result.url).toBe(newUrl);
    expect(createCalled).toBe(true);
  });
});
