import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { disputes } from '@/server/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const stage = searchParams.get('stage');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const conditions = [];
    if (status) {
      conditions.push(eq(disputes.status, status));
    }
    if (stage) {
      conditions.push(eq(disputes.stage, stage));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = db
      .select()
      .from(disputes)
      .where(whereClause)
      .orderBy(desc(disputes.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(disputes)
      .where(whereClause)
      .get();

    const total = countResult?.count ?? items.length;

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
