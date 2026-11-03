import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'onboarding_session';
const SESSION_HOURS = 10;

type SessionPayload = { userId: string; version: number };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'], requiredClaims: ['exp', 'iat'] });
    if (typeof payload.userId !== 'string' || typeof payload.version !== 'number') return null;
    return { userId: payload.userId, version: payload.version };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Secure by default in production; COOKIE_SECURE=false allows plain http (e.g. the local Docker stack).
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_HOURS * 60 * 60,
};
