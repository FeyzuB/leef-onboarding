'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import type { AppRole, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { inScope, isAdmin, requireLead } from '@/lib/auth';
import { type FormState, errorMessage, isValidUsername, normaliseUsername, required, text, validateNewPassword } from '@/lib/forms';

const ROLES: AppRole[] = ['NEW_HIRE', 'LEAD', 'ADMIN'];

export async function createUser(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireLead();
  let name = '';
  try {
    name = required(form, 'name', 'Name', 100);
    const username = normaliseUsername(required(form, 'username', 'Username', 50));
    if (!isValidUsername(username)) {
      return { error: 'Username: 3 to 50 characters, lowercase letters, digits, dot, dash or underscore' };
    }
    const password = String(form.get('password') ?? '');
    const problem = validateNewPassword(password);
    if (problem) return { error: problem };

    const requestedRole = text(form, 'appRole') as AppRole;
    const appRole: AppRole = isAdmin(actor) && ROLES.includes(requestedRole) ? requestedRole : 'NEW_HIRE';
    const teamId = isAdmin(actor) ? text(form, 'teamId') || null : actor.teamId;
    if (!teamId && appRole !== 'ADMIN') return { error: 'Choose a team' };

    if (await prisma.user.findUnique({ where: { username } })) return { error: 'That username is already taken' };

    await prisma.user.create({
      data: { name, username, appRole, teamId, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath('/', 'layout');
  return { success: `Account created for ${name}. Give them the temporary password; they change it at first login.` };
}

async function loadManagedUser(actor: User, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !inScope(actor, target.teamId)) throw new Error('User not found');
  if (!isAdmin(actor) && target.appRole !== 'NEW_HIRE') throw new Error('Only an admin can manage lead and admin accounts');
  if (target.id === actor.id) throw new Error('Use "Change password" to manage your own account');
  return target;
}

/**
 * Edits a person's name; admins can also change their app role and team.
 * Same rules as the other account actions: leads manage new hires in their own team, admins everyone but themselves.
 */
export async function updateUser(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireLead();
  try {
    const target = await loadManagedUser(actor, text(form, 'userId'));
    const name = required(form, 'name', 'Name', 100);
    let appRole = target.appRole;
    let teamId = target.teamId;

    if (isAdmin(actor)) {
      const requestedRole = text(form, 'appRole') as AppRole;
      if (!ROLES.includes(requestedRole)) return { error: 'Choose a role' };
      appRole = requestedRole;
      const requestedTeam = text(form, 'teamId') || null;
      if (requestedTeam && !(await prisma.team.findUnique({ where: { id: requestedTeam } }))) return { error: 'Choose a team' };
      teamId = requestedTeam;
    }
    if (!teamId && appRole !== 'ADMIN') return { error: 'Choose a team' };
    if (appRole !== 'NEW_HIRE' && target.appRole === 'NEW_HIRE' && (await prisma.plan.findUnique({ where: { newHireId: target.id } }))) {
      return { error: `${target.name} has an onboarding plan. Delete the plan first to make them a lead or admin.` };
    }

    await prisma.user.update({ where: { id: target.id }, data: { name, appRole, teamId } });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath('/', 'layout');
  return { success: 'Saved' };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requireLead();
  try {
    const target = await loadManagedUser(actor, text(form, 'userId'));
    const password = String(form.get('password') ?? '');
    const problem = validateNewPassword(password);
    if (problem) return { error: problem };
    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
      },
    });
    return { success: `Password reset for ${target.name}. They must change it at next login.` };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function setUserActive(form: FormData) {
  const actor = await requireLead();
  const target = await loadManagedUser(actor, text(form, 'userId'));
  const active = text(form, 'active') === 'true';
  await prisma.user.update({
    where: { id: target.id },
    data: { active, sessionVersion: { increment: 1 } },
  });
  revalidatePath('/', 'layout');
}

/** Deletes the account for good, including a new hire's plan and progress. Plans they lead lose their lead. */
export async function deleteUser(form: FormData) {
  const actor = await requireLead();
  const target = await loadManagedUser(actor, text(form, 'userId'));
  await prisma.user.delete({ where: { id: target.id } });
  revalidatePath('/', 'layout');
}
