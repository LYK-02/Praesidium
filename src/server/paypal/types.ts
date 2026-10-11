import { z } from 'zod';

export const MoneySchema = z.object({
  currency_code: z.string(),
  value: z.string(),
});

export const DisputeSummarySchema = z.object({
  dispute_id: z.string(),
  create_time: z.string(),
  update_time: z.string().optional(),
  status: z.string(),
  dispute_life_cycle_stage: z.string().optional(),
  dispute_channel: z.string().optional(),
  dispute_amount: MoneySchema,
  reason: z.string(),
  seller_response_due_date: z.string().optional(),
  buyer_response_due_date: z.string().optional(),
  disputed_transactions: z.array(z.object({
    seller_transaction_id: z.string().optional(),
    buyer_transaction_id: z.string().optional(),
    gross_amount: MoneySchema.optional(),
    buyer: z.object({
      name: z.string().optional(),
    }).optional(),
  })).optional(),
});

export const DisputesListResponseSchema = z.object({
  items: z.array(DisputeSummarySchema).optional().default([]),
  links: z.array(z.object({ href: z.string(), rel: z.string(), method: z.string().optional() })).optional(),
  total_items: z.number().optional(),
  total_pages: z.number().optional(),
});

export const TrackingInfoSchema = z.object({
  carrier_name: z.string(),
  tracking_number: z.string(),
});

export const ProvideEvidenceInputSchema = z.object({
  evidence_type: z.enum([
    'PROOF_OF_FULFILLMENT',
    'PROOF_OF_DELIVERY',
    'PROOF_OF_REFUND',
    'PROOF_OF_REPLACEMENT',
    'OTHER',
  ]).default('PROOF_OF_FULFILLMENT'),
  evidence_info: z.object({
    tracking_info: z.array(TrackingInfoSchema).optional(),
  }).optional(),
  notes: z.string().min(1, 'Evidence notes are required'),
});

export const AcceptClaimInputSchema = z.object({
  accept_claim_reason: z.enum([
    'DID_NOT_SHIP_ITEM',
    'TOO_TIME_CONSUMING_TO_DISPUTE',
    'LOST_IN_TRANSIT',
    'OTHER',
  ]).default('DID_NOT_SHIP_ITEM'),
  note: z.string().optional().default('Merchant liability accepted; claim resolved.'),
});

export const WebhookHeadersSchema = z.object({
  auth_algo: z.string().min(1, 'Missing PAYPAL-AUTH-ALGO'),
  cert_url: z.string().url('Invalid PAYPAL-CERT-URL'),
  transmission_id: z.string().min(1, 'Missing PAYPAL-TRANSMISSION-ID'),
  transmission_sig: z.string().min(1, 'Missing PAYPAL-TRANSMISSION-SIG'),
  transmission_time: z.string().min(1, 'Missing PAYPAL-TRANSMISSION-TIME'),
  webhook_id: z.string().min(1, 'Missing webhook_id'),
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  create_time: z.string(),
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string().optional(),
  resource: z.record(z.string(), z.unknown()),
});

export const PayPalWebhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  event_types: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
  })),
  links: z.array(z.object({ href: z.string(), rel: z.string(), method: z.string().optional() })).optional(),
});

export const ListWebhooksResponseSchema = z.object({
  webhooks: z.array(PayPalWebhookSchema).optional().default([]),
});

export type Money = z.infer<typeof MoneySchema>;
export type DisputeSummary = z.infer<typeof DisputeSummarySchema>;
export type DisputesListResponse = z.infer<typeof DisputesListResponseSchema>;
export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;
export type ProvideEvidenceInput = z.infer<typeof ProvideEvidenceInputSchema>;
export type AcceptClaimInput = z.infer<typeof AcceptClaimInputSchema>;
export type WebhookHeaders = z.infer<typeof WebhookHeadersSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type PayPalWebhook = z.infer<typeof PayPalWebhookSchema>;
export type ListWebhooksResponse = z.infer<typeof ListWebhooksResponseSchema>;

export class PayPalError extends Error {
  public statusCode: number;
  public details: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'PayPalError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
