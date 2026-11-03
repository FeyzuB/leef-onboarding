'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireLead } from '@/lib/auth';
import { required, text } from '@/lib/forms';

async function fields(form: FormData, selfId?: string) {
  const reportsToId = text(form, 'reportsToId') || null;
  const teamId = text(form, 'teamId') || null;
  if (teamId && !(await prisma.team.findUnique({ where: { id: teamId } }))) throw new Error('Team not found');
  if (reportsToId) {
    // Walk up the chain to make sure nobody ends up reporting to themselves.
    let current: string | null = reportsToId;
    const seen = new Set<string>();
    while (current) {
      if (current === selfId) throw new Error('That would make someone report to themselves');
      if (seen.has(current)) break;
      seen.add(current);
      const entry: { reportsToId: string | null } | null = await prisma.orgEntry.findUnique({
        where: { id: current },
        select: { reportsToId: true },
      });
      if (!entry) throw new Error('Manager not found');
      current = entry.reportsToId;
    }
  }
  return {
    name: required(form, 'name', 'Name', 120),
    jobTitle: text(form, 'jobTitle', 120),
    teamId,
    reportsToId,
  };
}

export async function addOrgEntry(form: FormData) {
  await requireLead();
  await prisma.orgEntry.create({ data: await fields(form) });
  revalidatePath('/organogram');
}

export async function updateOrgEntry(form: FormData) {
  await requireLead();
  const id = text(form, 'entryId');
  await prisma.orgEntry.update({ where: { id }, data: await fields(form, id) });
  revalidatePath('/organogram');
}

export async function deleteOrgEntry(form: FormData) {
  await requireLead();
  // Direct reports move up to this person's manager.
  const id = text(form, 'entryId');
  const entry = await prisma.orgEntry.findUnique({ where: { id } });
  if (!entry) return;
  await prisma.$transaction([
    prisma.orgEntry.updateMany({ where: { reportsToId: id }, data: { reportsToId: entry.reportsToId } }),
    prisma.orgEntry.delete({ where: { id } }),
  ]);
  revalidatePath('/organogram');
}
