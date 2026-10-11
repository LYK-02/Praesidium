# PayPal Sandbox Webhook Setup & Live Verification Checklist

This guide provides the complete, step-by-step verification procedure for registering, forwarding, and validating live PayPal Sandbox webhooks in Praesidium.

---

## Prerequisites

1. **Cloudflared Tunnel**
   - Install `cloudflared` on Windows:
     ```powershell
     winget install --id Cloudflare.cloudflared
     ```
   - Verify installation:
     ```powershell
     cloudflared --version
     ```

2. **Sandbox Credentials in `.env`**
   - `PAYPAL_ENV=sandbox`
   - `PAYPAL_CLIENT_ID=<sandbox_client_id>`
   - `PAYPAL_CLIENT_SECRET=<sandbox_client_secret>`
   - `ALLOW_LIVE=false`

---

## Step 1: Start Dev Server & Tunnel

Run Next.js dev server and Cloudflare tunnel concurrently:
```bash
pnpm dev:tunnel
```
*(Or in separate terminal tabs: `pnpm dev` in Tab 1, `pnpm tunnel` in Tab 2)*

Look for the tunnel URL in the output, e.g.:
```
https://example-random-subdomain.trycloudflare.com
```

---

## Step 2: Register Webhook with PayPal Sandbox

Run the registration script with your tunnel URL:
```bash
pnpm webhook:register https://example-random-subdomain.trycloudflare.com
```

The script will:
- Check existing webhooks via `GET /v1/notifications/webhooks`.
- Update (`PATCH`) any existing tunnel webhook or create (`POST`) a new one for:
  - `CUSTOMER.DISPUTE.CREATED`
  - `CUSTOMER.DISPUTE.UPDATED`
  - `CUSTOMER.DISPUTE.RESOLVED`
- Print your masked Webhook ID and the exact line to paste into `.env`:
  ```
  PAYPAL_WEBHOOK_ID=4JH12345678901234
  ```

Copy and paste `PAYPAL_WEBHOOK_ID=...` into your `.env` file and restart/save.

---

## Step 3: Verification Checklist

### Checklist Item A: Health Check Reachability via Tunnel
Confirm your tunnel routes traffic directly to your Next.js application:
```bash
curl -i https://<your-tunnel-url>.trycloudflare.com/api/health
```
- **Expected Status**: `HTTP/1.1 200 OK`
- **Expected Body**: `{"status":"healthy","paypal":"connected",...}`

---

### Checklist Item B: Forged Webhook Rejection
Send an unverified/forged POST request to your webhook endpoint:
```bash
curl -i -X POST https://<your-tunnel-url>.trycloudflare.com/api/webhooks/paypal \
  -H "Content-Type: application/json" \
  -d '{"id":"WH-FORGED-001","event_type":"CUSTOMER.DISPUTE.CREATED","resource":{"id":"PP-D-FAKE"}}'
```
- **Expected Status**: `HTTP/1.1 400 Bad Request`
- **Expected Body**: `{"error":"Missing PayPal verification headers"}` (or `{"error":"Invalid webhook signature"}` if fake signature headers provided)
- **Audit Log Verification**: Check `audit_log` table or console. Emits event: `webhook_rejected`.
- **Database Verification**: Nothing is stored in `webhook_events`.

---

### Checklist Item C: Real Sandbox Dispute Creation
To test a genuine end-to-end webhook delivery:
1. Log into your **Sandbox Buyer Account** on `https://www.sandbox.paypal.com`.
2. Locate a sandbox transaction made to your merchant account.
3. Open a dispute in the Sandbox Resolution Center (e.g. "Item Not Received").
4. **Observe Live Pipeline**:
   - PayPal Sandbox delivers `CUSTOMER.DISPUTE.CREATED` to `https://<tunnel>/api/webhooks/paypal`.
   - Endpoint verifies PayPal signature using `/v1/notifications/verify-webhook-signature`.
   - Durable insert into `webhook_events` (`status: pending`).
   - In-process queue (`p-queue`) processes event and syncs dispute details into `disputes` table.
   - Dispute state transitions to `received`.
   - All actions recorded in `audit_log` with PII redaction.

---

### Checklist Item D: Re-delivery & Deduplication
Simulate re-delivery of the exact same event ID:
```bash
# Using the local simulator tool with the same event ID:
node scripts/simulate-webhook.mjs created PP-D-12345
```
- **Expected Status**: `HTTP/1.1 200 OK`
- **Expected Body**: `{"status":"already_processed","eventId":"..."}`
- **Verification**: `webhook_events` table contains exactly one row with that event ID. The background job is not duplicated.

---

### Checklist Item E: Tunnel Restart & Re-Registration
Cloudflare Quick Tunnels generate a new URL upon restart.
Whenever you restart the tunnel:
1. Copy the new tunnel URL.
2. Run:
   ```bash
   pnpm webhook:register <new-tunnel-url>
   ```
3. The script will automatically patch the existing webhook URL in PayPal Sandbox without creating duplicate webhook registrations.
