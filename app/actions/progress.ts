'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { assertPlanAccess, requireUser } from '@/lib/auth';
import { text } from '@/lib/forms';

/** New hires (and their leads) tick steps off or flag them as blocked. */
export async function setStepStatus(form: FormData) {
  const user = await requireUser();
  const step = await prisma.planStep.findUnique({ where: { id: text(form, 'stepId') } });
  if (!step || step.removed) throw new Error('Step not found');
  await assertPlanAccess(user, step.planId, 'progress');

  const value = text(form, 'status');
  const status = value === 'DONE' || value === 'BLOCKED' ? value : 'OPEN';
  await prisma.planStep.update({
    where: { id: step.id },
    data: {
      status,
      doneAt: status === 'DONE' ? new Date() : null,
      note: status === 'BLOCKED' ? text(form, 'note', 1000) : '',
    },
  });
  revalidatePath('/', 'layout');
}

export async function setGoalStatus(form: FormData) {
  const user = await requireUser();
  const goal = await prisma.goal.findUnique({ where: { id: text(form, 'goalId') } });
  if (!goal) throw new Error('Goal not found');
  await assertPlanAccess(user, goal.planId, 'progress');

  const status = text(form, 'status') === 'DONE' ? 'DONE' : 'OPEN';
  await prisma.goal.update({
    where: { id: goal.id },
    data: { status, doneAt: status === 'DONE' ? new Date() : null },
  });
  revalidatePath('/', 'layout');
}
