'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { GuideCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdmin, requireLead } from '@/lib/auth';
import { direction, required, text } from '@/lib/forms';
import { GUIDE_CATEGORIES, canEditGuide } from '@/lib/guides';
import { sanitizeRichText } from '@/lib/richText';
import { plainToHtml } from '@/lib/richTextFormat';

// ---------- Guides ----------

async function guideFields(form: FormData) {
  const actor = await requireLead();
  const category = text(form, 'category') as GuideCategory;
  if (!GUIDE_CATEGORIES.some((c) => c.value === category)) throw new Error('Choose a category');
  // Empty = for everyone. A lead can only pick their own team; admins any team.
  const teamId = text(form, 'teamId') || null;
  if (teamId && !isAdmin(actor) && teamId !== actor.teamId) throw new Error('You can only add guides for your own team');
  if (teamId && !(await prisma.team.findUnique({ where: { id: teamId } }))) throw new Error('Team not found');
  return {
    actor,
    data: {
      title: required(form, 'title', 'Title', 160),
      category,
      teamId,
      body: sanitizeRichText(plainToHtml(text(form, 'body', 3_500_000))),
    },
  };
}

async function editableGuide(id: string) {
  const actor = await requireLead();
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide || !canEditGuide(actor, guide)) throw new Error('Guide not found');
  return guide;
}

export async function addGuide(form: FormData) {
  const { data } = await guideFields(form);
  const guide = await prisma.guide.create({ data });
  revalidatePath('/guides');
  redirect(`/guides/${guide.id}`);
}

export async function updateGuide(form: FormData) {
  const guide = await editableGuide(text(form, 'guideId'));
  const { data } = await guideFields(form);
  await prisma.guide.update({ where: { id: guide.id }, data });
  revalidatePath('/guides');
  revalidatePath(`/guides/${guide.id}`);
}

/** Steps that pointed to the guide keep working, they just lose the "Read the guide" button. */
export async function deleteGuide(form: FormData) {
  const guide = await editableGuide(text(form, 'guideId'));
  await prisma.guide.delete({ where: { id: guide.id } });
  revalidatePath('/guides');
  redirect('/guides');
}

// ---------- Help contacts ("Need help?") ----------

function contactFields(form: FormData) {
  return {
    topic: required(form, 'topic', 'For', 120),
    contact: required(form, 'contact', 'Contact', 200),
    note: text(form, 'note', 300),
    urgent: form.get('urgent') === 'on',
  };
}

function helpChanged() {
  // The help panel sits in the sidebar of every page.
  revalidatePath('/', 'layout');
}

export async function addHelpContact(form: FormData) {
  await requireLead();
  const count = await prisma.helpContact.count();
  await prisma.helpContact.create({ data: { ...contactFields(form), position: count } });
  helpChanged();
}

export async function updateHelpContact(form: FormData) {
  await requireLead();
  await prisma.helpContact.update({ where: { id: text(form, 'contactId') }, data: contactFields(form) });
  helpChanged();
}

export async function deleteHelpContact(form: FormData) {
  await requireLead();
  await prisma.helpContact.delete({ where: { id: text(form, 'contactId') } });
  helpChanged();
}

export async function moveHelpContact(form: FormData) {
  await requireLead();
  const all = await prisma.helpContact.findMany({ orderBy: { position: 'asc' } });
  const from = all.findIndex((c) => c.id === text(form, 'contactId'));
  const to = direction(form) === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= all.length) return;
  [all[from], all[to]] = [all[to], all[from]];
  await prisma.$transaction(all.map((c, position) => prisma.helpContact.update({ where: { id: c.id }, data: { position } })));
  helpChanged();
}
