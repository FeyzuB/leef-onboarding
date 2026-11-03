import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from '@/lib/session';

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active || user.sessionVersion !== session.version) return null;
  return user;
}

export async function startSession(user: Pick<User, 'id' | 'sessionVersion'>) {
  const token = await signSession({ userId: user.id, version: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Any logged-in user. Sends users with a temporary password to the change-password page. */
export async function requireUser(options: { allowMustChange?: boolean } = {}): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword && !options.allowMustChange) redirect('/change-password');
  return user;
}

export function isLead(user: Pick<User, 'appRole'>): boolean {
  return user.appRole === 'LEAD' || user.appRole === 'ADMIN';
}

export function isAdmin(user: Pick<User, 'appRole'>): boolean {
  return user.appRole === 'ADMIN';
}

export async function requireLead(): Promise<User> {
  const user = await requireUser();
  if (!isLead(user)) redirect('/');
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect('/');
  return user;
}

/**
 * Leads work within their own team; admins see every team.
 * Returns a Prisma `where` fragment on `teamId`.
 */
export function teamScope(user: Pick<User, 'appRole' | 'teamId'>): { teamId?: string } {
  if (isAdmin(user)) return {};
  // A lead without a team sees nothing rather than everything.
  return { teamId: user.teamId ?? '__no_team__' };
}

export function inScope(user: Pick<User, 'appRole' | 'teamId'>, teamId: string | null | undefined): boolean {
  return isAdmin(user) || (!!teamId && teamId === user.teamId);
}

/** Throws when a lead acts on a plan outside their team. */
export async function assertPlanAccess(user: User, planId: string, mode: 'view' | 'progress' | 'edit') {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, newHireId: true, newHire: { select: { teamId: true } } },
  });
  if (!plan) throw new Error('Plan not found');
  const own = plan.newHireId === user.id;
  const asLead = isLead(user) && inScope(user, plan.newHire.teamId);
  if (mode === 'edit' ? asLead : own || asLead) return plan;
  throw new Error('You do not have access to this plan');
}
