import type { Guide, GuideCategory, Prisma, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdmin, isLead } from '@/lib/auth';
import { text } from '@/lib/forms';

export const GUIDE_CATEGORIES: { value: GuideCategory; label: string; intro: string }[] = [
  { value: 'HOW_TO', label: 'How-to', intro: 'Step by step: how something works.' },
  { value: 'PRACTICAL', label: 'Practical', intro: 'Good to know: the office, hours, agreements.' },
];

export const categoryLabel = (value: GuideCategory) => GUIDE_CATEGORIES.find((c) => c.value === value)?.label ?? value;

/** Guides for everyone, plus those of the user's own team; admins see all. */
export function visibleGuides(user: Pick<User, 'appRole' | 'teamId'>): Prisma.GuideWhereInput {
  if (isAdmin(user)) return {};
  return { OR: [{ teamId: null }, ...(user.teamId ? [{ teamId: user.teamId }] : [])] };
}

export function canSeeGuide(user: Pick<User, 'appRole' | 'teamId'>, guide: Pick<Guide, 'teamId'>): boolean {
  return isAdmin(user) || guide.teamId === null || guide.teamId === user.teamId;
}

/** Leads edit guides for everyone and for their own team; admins edit all. */
export function canEditGuide(user: Pick<User, 'appRole' | 'teamId'>, guide: Pick<Guide, 'teamId'>): boolean {
  if (!isLead(user)) return false;
  return isAdmin(user) || guide.teamId === null || guide.teamId === user.teamId;
}

/** The guide a step points to, from the step form; it must exist. */
export async function guideIdField(form: FormData): Promise<string | null> {
  const id = text(form, 'guideId');
  if (!id) return null;
  if (!(await prisma.guide.findUnique({ where: { id }, select: { id: true } }))) throw new Error('Guide not found');
  return id;
}
