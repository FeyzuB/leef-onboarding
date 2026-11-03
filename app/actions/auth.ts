'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { endSession, getCurrentUser, requireUser, startSession } from '@/lib/auth';
import { clearFailures, clientAddress, isBraked, recordFailure } from '@/lib/loginBrake';
import { type FormState, normaliseUsername, text, validateNewPassword } from '@/lib/forms';

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

  const address = await clientAddress();
  if (await isBraked(username, address)) {
    return { error: 'Too many failed attempts. Try again in 15 minutes or ask your lead to reset your password.' };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await hashForMissingUser()));
  if (!user || !valid || !user.active) {
    await recordFailure(username, address);
    return { error: 'Wrong username or password' };
  }

  await clearFailures(username, address);
  await startSession(user);
  redirect(user.mustChangePassword ? '/change-password' : '/');
}

export async function logout() {
  // Bump the session version so a copied session cookie stops working too.
  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  await endSession();
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
