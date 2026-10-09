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
  dispute_amount: MoneySchema,
  reason: z.string(),
  seller_response_due_date: z.string().optional(),
  buyer_response_due_date: z.string().optional(),
});

export const DisputesListResponseSchema = z.object({
  items: z.array(DisputeSummarySchema).optional().default([]),
  links: z.array(z.object({ href: z.string(), rel: z.string(), method: z.string().optional() })).optional(),
  total_items: z.number().optional(),
  total_pages: z.number().optional(),
});

export type DisputeSummary = z.infer<typeof DisputeSummarySchema>;
export type DisputesListResponse = z.infer<typeof DisputesListResponseSchema>;

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
