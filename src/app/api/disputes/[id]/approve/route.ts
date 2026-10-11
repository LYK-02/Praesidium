import { NextRequest, NextResponse } from 'next/server';
import { executeProvideEvidence } from '@/server/actions/executor';
import { ProvideEvidenceInputSchema } from '@/server/paypal/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    let bodyJson: unknown = {};
    try {
      bodyJson = await req.json();
    } catch {
      // Empty body is acceptable if providing standard proof of fulfillment
    }

    const parseResult = ProvideEvidenceInputSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid evidence input schema', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get('x-idempotency-key') || undefined;

    const result = await executeProvideEvidence({
      disputeId: id,
      evidence: parseResult.data,
      approvedBy: 'human',
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
