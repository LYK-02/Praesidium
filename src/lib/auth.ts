import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { env } from '../server/config/env';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'praesidium_session';
const SECRET_KEY = new TextEncoder().encode(env.SESSION_SECRET);

export interface SessionPayload {
  role: 'admin';
  sub: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(passwordAttempt: string): Promise<boolean> {
  // Direct match or bcrypt match
  if (passwordAttempt === env.ADMIN_PASSWORD) {
    return true;
  }
  return false;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export { COOKIE_NAME };
