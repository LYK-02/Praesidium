import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/server/audit/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      await logAudit({
        actor: 'user',
        event: 'auth_login_failed',
        detail: { reason: 'Invalid password' },
      });
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await createSessionToken({
      role: 'admin',
      sub: 'merchant-admin',
    });

    await logAudit({
      actor: 'user',
      event: 'auth_login_success',
      detail: { role: 'admin' },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
