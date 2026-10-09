# PayPal Sandbox Findings & API Specification

> **Status:** Phase 0 Validation  
> **Last Updated:** October 9, 2026  
> **Target Environment:** `https://api-m.sandbox.paypal.com`

---

## 1. Authentication (OAuth 2.0)

- **Endpoint:** `POST /v1/oauth2/token`
- **Headers:**
  - `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`
  - `Content-Type: application/x-www-form-urlencoded`
- **Body:** `grant_type=client_credentials`
- **Response:**
  ```json
  {
    "scope": "https://uri.paypal.com/services/disputes/read-write ...",
    "access_token": "A21AA...",
    "token_type": "Bearer",
    "app_id": "APP-80W284485P519543T",
    "expires_in": 32400,
    "nonce": "..."
  }
  ```
- **Rule:** Cache token in memory; refresh proactively ~60 seconds before expiry (`expires_in`). Use single-flight promise to prevent concurrent refreshes.

---

## 2. Customer Disputes API Surface

All requests require `Authorization: Bearer <access_token>` and `Content-Type: application/json` (except file multipart uploads).

### 2.1 List Disputes
- **Method & Path:** `GET /v1/customer/disputes`
- **Query Parameters:**
  - `dispute_state`: `REQUIRED_ACTION` | `UNDER_REVIEW` | `RESOLVED`
  - `page_size`: 10..50
  - `start_time`: ISO-8601 UTC timestamp
- **Response Structure (`items[]`):**
  - `dispute_id`: Unique identifier (e.g., `PP-D-12345`)
  - `create_time`: ISO-8601 timestamp
  - `update_time`: ISO-8601 timestamp
  - `dispute_amount`: `{ "currency_code": "USD", "value": "45.00" }`
  - `status`: `OPEN` | `WAITING_FOR_BUYER_RESPONSE` | `WAITING_FOR_SELLER_RESPONSE` | `UNDER_REVIEW` | `RESOLVED`
  - `dispute_life_cycle_stage`: `INQUIRY` | `CHARGEBACK` | `PRE_ARBITRATION` | `ARBITRATION`
  - `dispute_channel`: `INTERNAL` | `EXTERNAL`
  - `reason`: `MERCHANDISE_OR_SERVICE_NOT_RECEIVED` | `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED` | `UNAUTHORISED` | `CREDIT_NOT_PROCESSED` | `DUPLICATE_TRANSACTION`
  - `seller_response_due_date`: ISO-8601 timestamp (Critical deadline)
  - `links`: HATEOAS action links (`self`, `provide_evidence`, `accept_claim`)

### 2.2 Get Dispute Details
- **Method & Path:** `GET /v1/customer/disputes/{dispute_id}`
- **Response Structure:** Complete history including `disputed_transactions[]`, `buyer_response_due_date`, `messages[]`, and previously submitted `evidences[]`.

### 2.3 Provide Evidence (Contest Dispute)
- **Method & Path:** `POST /v1/customer/disputes/{dispute_id}/provide-evidence`
- **Headers:**
  - `PayPal-Request-Id: <UUID>` (Idempotency)
- **Supported Encodings:**
  1. **Structured JSON** (`application/json`):
     ```json
     {
       "evidence_type": "PROOF_OF_FULFILLMENT",
       "evidence_info": {
         "tracking_info": [
           {
             "carrier_name": "FEDEX",
             "tracking_number": "9400100000000000000000"
           }
         ]
       },
       "notes": "Order delivered with direct signature confirmation on 2026-10-04."
     }
     ```
  2. **Multipart Form** (`multipart/form-data`) when attaching binary files (PDF/PNG, max 10MB per file, max 50MB total):
     - `input`: JSON metadata string
     - `file1`: Binary document
- **Allowed States:** Only callable when `status == 'WAITING_FOR_SELLER_RESPONSE'`.

### 2.4 Accept Claim (Liability Acceptance / Refund)
- **Method & Path:** `POST /v1/customer/disputes/{dispute_id}/accept-claim`
- **Headers:**
  - `PayPal-Request-Id: <UUID>` (Idempotency)
- **Body:**
  ```json
  {
    "accept_claim_reason": "DID_NOT_SHIP_ITEM",
    "note": "Merchant liability recognized; refund issued immediately."
  }
  ```
- **Allowed States:** Callable when seller agrees to refund the buyer and close the dispute.

---

## 3. Webhook Verification

- **Method & Path:** `POST /v1/notifications/verify-webhook-signature`
- **Payload:**
  ```json
  {
    "auth_algo": "<from PAYPAL-AUTH-ALGO header>",
    "cert_url": "<from PAYPAL-CERT-URL header>",
    "transmission_id": "<from PAYPAL-TRANSMISSION-ID header>",
    "transmission_sig": "<from PAYPAL-TRANSMISSION-SIG header>",
    "transmission_time": "<from PAYPAL-TRANSMISSION-TIME header>",
    "webhook_id": "<configured PAYPAL_WEBHOOK_ID>",
    "webhook_event": { ...parsed JSON body... }
  }
  ```
- **Verification Response:** `{"verification_status": "SUCCESS"}` or `"FAILURE"`.
- **Primary Events to Handle:**
  - `CUSTOMER.DISPUTE.CREATED`
  - `CUSTOMER.DISPUTE.UPDATED`
  - `CUSTOMER.DISPUTE.RESOLVED`

---

## 4. Phase 0 Open Questions Resolution

| Question | Finding & Resolution |
|---|---|
| **1. Which dispute endpoints work for sandbox business accounts?** | All core endpoints (`GET /v1/customer/disputes`, `GET /{id}`, `provide-evidence`, `accept-claim`) function reliably when authenticated as the seller's sandbox REST app. Mutating actions require the dispute status to be `WAITING_FOR_SELLER_RESPONSE`. |
| **2. Can evidence files upload or only structured evidence?** | Both work, but structured evidence (`PROOF_OF_FULFILLMENT` with `tracking_info` + `notes`) is the most reliable and immediate. Binary PDF uploads can occasionally hit sandbox processing lags; our agent will prioritize rich structured evidence packages with text notes and tracking records, with optional document attachments. |
| **3. Does Agent Toolkit expose all needed dispute tools or REST directly?** | PayPal Agent Toolkit / MCP does not yet cover full dispute representment multipart and fine-grained state transitions. **Decision:** Implement our thin, fully-typed REST client with Zod parsing, retries, and idempotency, wrapping direct REST endpoints. This guarantees total control, zero latency overhead, and robust offline mock capability. |

---

## 5. Seed & Test Plan for Sandbox

To test end-to-end:
1. Log into Developer Dashboard with Sandbox Business account.
2. Generate disputes either:
   - Manually: Create transaction between Sandbox Personal & Business accounts, file dispute via Sandbox Resolution Center (`sandbox.paypal.com`).
   - Programmatically / Seeded: Using `scripts/seed-sandbox.ts` / local seed fixtures that map to real dispute IDs or mock fallbacks when offline.
3. Test suite uses MSW (Mock Service Worker) with exact JSON contract fixtures recorded from PayPal Sandbox to guarantee 100% deterministic test execution in CI.
