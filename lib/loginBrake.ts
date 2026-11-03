import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * Brake on password guessing, stored in the database so it holds across serverless instances.
 *
 * - username + address: 5 failures in 15 minutes. Locks out the guesser, not the real user on another network.
 * - address: 20 failures in 15 minutes. Stops one machine trying many usernames.
 * - username: 50 failures in an hour. Stops a guessing attack on one account spread over many addresses.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = [
  { scope: 'user-ip', max: 5, windowMs: WINDOW_MS },
  { scope: 'ip', max: 20, windowMs: WINDOW_MS },
  { scope: 'user', max: 50, windowMs: 60 * 60 * 1000 },
] as const;
const KEEP_MS = 24 * 60 * 60 * 1000;

/** The client address. On Vercel these headers are set by the platform; elsewhere they may be missing. */
export function clientAddress(): string {
  const h = headers();
  return h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function keys(username: string, address: string) {
  return { 'user-ip': `user-ip:${username}|${address}`, ip: `ip:${address}`, user: `user:${username}` };
}

/** True when this username or address has failed too often recently. */
export async function isBraked(username: string, address: string): Promise<boolean> {
  const k = keys(username, address);
  const now = Date.now();
  const counts = await Promise.all(
    LIMITS.map((limit) => prisma.loginFailure.count({ where: { key: k[limit.scope], createdAt: { gt: new Date(now - limit.windowMs) } } })),
  );
  return counts.some((count, i) => count >= LIMITS[i].max);
}

export async function recordFailure(username: string, address: string) {
  const k = keys(username, address);
  await prisma.$transaction([
    prisma.loginFailure.createMany({ data: Object.values(k).map((key) => ({ key })) }),
    prisma.loginFailure.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_MS) } } }),
  ]);
}

/** After a successful login, forget this user's failures from this address. */
export async function clearFailures(username: string, address: string) {
  await prisma.loginFailure.deleteMany({ where: { key: keys(username, address)['user-ip'] } });
}
