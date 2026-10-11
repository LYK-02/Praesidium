import { NextRequest, NextResponse } from 'next/server';
import { executeAcceptClaim } from '@/server/actions/executor';
import { AcceptClaimInputSchema } from '@/server/paypal/types';

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
      // Empty body will use default DID_NOT_SHIP_ITEM reason
    }

    const parseResult = AcceptClaimInputSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid accept claim schema', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get('x-idempotency-key') || undefined;

    const result = await executeAcceptClaim({
      disputeId: id,
      claim: parseResult.data,
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
