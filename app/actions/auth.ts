'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { endSession, requireUser, startSession } from '@/lib/auth';
import { type FormState, normaliseUsername, text, validateNewPassword } from '@/lib/forms';

// Simple in-memory brake on password guessing: 5 failures locks a username for 15 minutes.
// Resets on restart, which is acceptable for a single internal instance.
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; firstAt: number }>();

let dummyHash: string | undefined;
async function hashForMissingUser() {
  // Compare against a real hash even when the user does not exist, so timing does not reveal valid usernames.
  dummyHash ??= await bcrypt.hash('no-such-user-placeholder', 12);
  return dummyHash;
}

function rawPassword(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.slice(0, 200) : '';
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const username = normaliseUsername(text(form, 'username', 100));
  const password = rawPassword(form, 'password');
  if (!username || !password) return { error: 'Enter your username and password' };

  const record = failures.get(username);
  if (record && Date.now() - record.firstAt > LOCK_MS) failures.delete(username);
  if ((failures.get(username)?.count ?? 0) >= MAX_FAILURES) {
    return { error: 'Too many failed attempts. Try again in 15 minutes or ask your lead to reset your password.' };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await hashForMissingUser()));
  if (!user || !valid || !user.active) {
    const current = failures.get(username);
    failures.set(username, { count: (current?.count ?? 0) + 1, firstAt: current?.firstAt ?? Date.now() });
    return { error: 'Wrong username or password' };
  }

  failures.delete(username);
  await startSession(user);
  redirect(user.mustChangePassword ? '/change-password' : '/');
}

export async function logout() {
  endSession();
  redirect('/login');
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser({ allowMustChange: true });
  const current = rawPassword(form, 'current');
  const next = rawPassword(form, 'next');
  const confirm = rawPassword(form, 'confirm');

  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: 'Current password is wrong' };
  const problem = validateNewPassword(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: 'The new passwords do not match' };
  if (next === current) return { error: 'Choose a password different from the current one' };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(next, 12),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });
  await startSession(updated);
  redirect('/');
}
