'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireLead } from '@/lib/auth';
import { required, text } from '@/lib/forms';

/** Team ids from checkboxes; every one must exist. */
async function teamIds(form: FormData, key: string): Promise<{ id: string }[]> {
  const ids = [...new Set(form.getAll(key).filter((v): v is string => typeof v === 'string' && v.length > 0))];
  if (ids.length && (await prisma.team.count({ where: { id: { in: ids } } })) !== ids.length) throw new Error('Team not found');
  return ids.map((id) => ({ id }));
}

async function fields(form: FormData, selfId?: string) {
  const reportsToId = text(form, 'reportsToId') || null;
  const teams = await teamIds(form, 'teamIds');
  const managedTeams = await teamIds(form, 'managedTeamIds');
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
    reportsToId,
    teams,
    managedTeams,
  };
}

export async function addOrgEntry(form: FormData) {
  await requireLead();
  const { teams, managedTeams, ...rest } = await fields(form);
  await prisma.orgEntry.create({ data: { ...rest, teams: { connect: teams }, managedTeams: { connect: managedTeams } } });
  revalidatePath('/organogram');
}

export async function updateOrgEntry(form: FormData) {
  await requireLead();
  const id = text(form, 'entryId');
  const { teams, managedTeams, ...rest } = await fields(form, id);
  await prisma.orgEntry.update({ where: { id }, data: { ...rest, teams: { set: teams }, managedTeams: { set: managedTeams } } });
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
