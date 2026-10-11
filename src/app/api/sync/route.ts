import { NextResponse } from 'next/server';
import { syncDisputesFromPayPal } from '@/server/disputes/sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncDisputesFromPayPal(50);
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
