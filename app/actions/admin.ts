'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { type FormState, text } from '@/lib/forms';

type Kind = 'team' | 'role';

const LABEL: Record<Kind, string> = { team: 'Team', role: 'Role' };

/** Names are unique regardless of capitals, so "leef" can't sit next to "LEEF". */
async function nameTaken(kind: Kind, name: string, exceptId?: string) {
  const where = { name: { equals: name, mode: 'insensitive' as const }, ...(exceptId ? { NOT: { id: exceptId } } : {}) };
  const existing = kind === 'team' ? await prisma.team.findFirst({ where }) : await prisma.role.findFirst({ where });
  return !!existing;
}

function readName(form: FormData): string {
  return text(form, 'name', 80).replace(/\s+/g, ' ');
}

async function add(kind: Kind, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = readName(form);
  if (!name) return { error: `${LABEL[kind]} name is required` };
  if (await nameTaken(kind, name)) return { error: `A ${kind} called "${name}" already exists` };
  if (kind === 'team') await prisma.team.create({ data: { name } });
  else await prisma.role.create({ data: { name } });
  revalidatePath('/', 'layout');
  return { success: `${LABEL[kind]} "${name}" added` };
}

async function rename(kind: Kind, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = text(form, 'id');
  const name = readName(form);
  if (!name) return { error: `${LABEL[kind]} name is required` };
  if (await nameTaken(kind, name, id)) return { error: `A ${kind} called "${name}" already exists` };
  const result =
    kind === 'team'
      ? await prisma.team.updateMany({ where: { id }, data: { name } })
      : await prisma.role.updateMany({ where: { id }, data: { name } });
  if (result.count === 0) return { error: `${LABEL[kind]} not found` };
  revalidatePath('/', 'layout');
  return { success: 'Renamed' };
}

export async function addTeam(_: FormState, form: FormData) {
  return add('team', form);
}

export async function renameTeam(_: FormState, form: FormData) {
  return rename('team', form);
}

export async function addRole(_: FormState, form: FormData) {
  return add('role', form);
}

export async function renameRole(_: FormState, form: FormData) {
  return rename('role', form);
}

/** Only a team nobody belongs to and no template uses can go; its "Where to find things" entries go with it. */
export async function deleteTeam(form: FormData) {
  await requireAdmin();
  const team = await prisma.team.findUnique({
    where: { id: text(form, 'id') },
    include: { _count: { select: { users: true, templates: true } } },
  });
  if (!team) return;
  if (team._count.users || team._count.templates) throw new Error('This team still has people or templates');
  await prisma.team.delete({ where: { id: team.id } });
  revalidatePath('/', 'layout');
}

export async function deleteRole(form: FormData) {
  await requireAdmin();
  const role = await prisma.role.findUnique({
    where: { id: text(form, 'id') },
    include: { _count: { select: { templates: true } } },
  });
  if (!role) return;
  if (role._count.templates) throw new Error('This role is still used by templates');
  await prisma.role.delete({ where: { id: role.id } });
  revalidatePath('/', 'layout');
}
