'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { inScope, requireLead } from '@/lib/auth';
import { direction, required, text } from '@/lib/forms';
import { isSafeUrl } from '@/lib/logic';

function fields(form: FormData) {
  const url = text(form, 'url', 1000);
  if (url && !isSafeUrl(url)) throw new Error('Link must start with http:// or https://');
  return {
    title: required(form, 'title', 'What', 120),
    location: required(form, 'location', 'Where', 200),
    note: text(form, 'note', 1000),
    url,
  };
}

async function teamForLead(teamId: string) {
  const actor = await requireLead();
  if (!inScope(actor, teamId)) throw new Error('Team not found');
  return teamId;
}

async function resourceForLead(resourceId: string) {
  const resource = await prisma.teamResource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new Error('Entry not found');
  await teamForLead(resource.teamId);
  return resource;
}

export async function addResource(form: FormData) {
  const teamId = await teamForLead(text(form, 'teamId'));
  const count = await prisma.teamResource.count({ where: { teamId } });
  await prisma.teamResource.create({ data: { ...fields(form), teamId, position: count } });
  revalidatePath('/team');
}

export async function updateResource(form: FormData) {
  const resource = await resourceForLead(text(form, 'resourceId'));
  await prisma.teamResource.update({ where: { id: resource.id }, data: fields(form) });
  revalidatePath('/team');
}

export async function deleteResource(form: FormData) {
  const resource = await resourceForLead(text(form, 'resourceId'));
  await prisma.teamResource.delete({ where: { id: resource.id } });
  revalidatePath('/team');
}

export async function moveResource(form: FormData) {
  const resource = await resourceForLead(text(form, 'resourceId'));
  const all = await prisma.teamResource.findMany({ where: { teamId: resource.teamId }, orderBy: { position: 'asc' } });
  const from = all.findIndex((r) => r.id === resource.id);
  const to = direction(form) === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= all.length) return;
  [all[from], all[to]] = [all[to], all[from]];
  await prisma.$transaction(all.map((r, position) => prisma.teamResource.update({ where: { id: r.id }, data: { position } })));
  revalidatePath('/team');
}
