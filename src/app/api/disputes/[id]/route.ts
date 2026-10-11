import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { disputes, actions, evidenceItems, decisions, auditLog } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const dispute = db.select().from(disputes).where(eq(disputes.id, id)).get();
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const disputeActions = db
      .select()
      .from(actions)
      .where(eq(actions.disputeId, id))
      .orderBy(desc(actions.createdAt))
      .all();

    const evidence = db
      .select()
      .from(evidenceItems)
      .where(eq(evidenceItems.disputeId, id))
      .orderBy(desc(evidenceItems.collectedAt))
      .all();

    const disputeDecisions = db
      .select()
      .from(decisions)
      .where(eq(decisions.disputeId, id))
      .orderBy(desc(decisions.createdAt))
      .all();

    const audits = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.disputeId, id))
      .orderBy(desc(auditLog.ts))
      .all();

    return NextResponse.json({
      dispute,
      actions: disputeActions,
      evidence,
      decisions: disputeDecisions,
      auditLog: audits,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
