import type { Prisma, TemplateGoal, TemplateStep } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { displayOrder, type Positioned } from '@/lib/logic';

type Tx = Prisma.TransactionClient;

/** Writes positions 0..n in the given order. */
export async function renumberTemplateSteps(tx: Tx, ids: string[]) {
  for (const [position, id] of ids.entries()) {
    await tx.templateStep.update({ where: { id }, data: { position } });
  }
}

export async function renumberPlanSteps(tx: Tx, ids: string[]) {
  for (const [position, id] of ids.entries()) {
    await tx.planStep.update({ where: { id }, data: { position } });
  }
}

/** Marks the template as changed so plans built from it show as behind. */
export async function bumpTemplateVersion(tx: Tx, templateId: string) {
  await tx.template.update({ where: { id: templateId }, data: { version: { increment: 1 } } });
}

/** The fields a plan step copies from its template step. */
function stepContent(step: TemplateStep) {
  return {
    title: step.title,
    explanation: step.explanation,
    links: step.links as Prisma.InputJsonValue,
    contact: step.contact,
    contactRole: step.contactRole,
    doneWhen: step.doneWhen,
    week: step.week,
  };
}

function inOrder<T extends Positioned>(items: T[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return displayOrder(items).map((id) => byId.get(id)!);
}

export async function createPlanFromTemplate(input: {
  newHireId: string;
  templateId: string;
  leadId: string | null;
  startDate: Date;
  managerId?: string | null;
  buddyId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.template.findUniqueOrThrow({
      where: { id: input.templateId },
      include: { steps: true, goals: true },
    });
    return tx.plan.create({
      data: {
        newHireId: input.newHireId,
        leadId: input.leadId,
        managerId: input.managerId ?? null,
        buddyId: input.buddyId ?? null,
        templateId: template.id,
        templateVersion: template.version,
        startDate: input.startDate,
        steps: {
          create: inOrder(template.steps).map((step, position) => ({
            templateStepId: step.id,
            module: step.module,
            position,
            ...stepContent(step),
          })),
        },
        goals: {
          create: template.goals.map((goal) => ({ templateGoalId: goal.id, title: goal.title, withinWeeks: goal.withinWeeks })),
        },
      },
    });
  });
}

/**
 * Brings a plan up to date with its template:
 * - steps the lead never touched get the template's current text;
 * - new template steps are added next to their neighbours;
 * - template steps that were deleted disappear from the plan unless the new hire already made progress on them;
 * - steps the lead added or edited, and steps the lead removed, are left alone;
 * - progress (status, notes) is never reset.
 * Goals follow the same rules.
 */
export async function syncPlanWithTemplate(planId: string) {
  await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.findUniqueOrThrow({
      where: { id: planId },
      include: { steps: true, template: { include: { steps: true, goals: true } } },
    });
    if (!plan.template) throw new Error('This plan is not linked to a template');
    const templateSteps = inOrder(plan.template.steps);

    // Template step deleted: drop the plan step if untouched, otherwise keep it as the lead's own.
    const orphaned = plan.steps.filter((s) => !s.templateStepId && !s.tailored);
    const toDelete = orphaned.filter((s) => s.status === 'OPEN').map((s) => s.id);
    const toDetach = orphaned.filter((s) => s.status !== 'OPEN').map((s) => s.id);
    if (toDelete.length) await tx.planStep.deleteMany({ where: { id: { in: toDelete } } });
    if (toDetach.length) await tx.planStep.updateMany({ where: { id: { in: toDetach } }, data: { tailored: true } });

    // Working list in display order, with fractional positions so inserts can go in between.
    const kept = inOrder(plan.steps.filter((s) => !toDelete.includes(s.id)));
    const items = kept.map((s, index) => ({ id: s.id, module: s.module, position: index }));
    const byTemplateStep = new Map(kept.filter((s) => s.templateStepId).map((s) => [s.templateStepId!, s]));

    for (const [index, templateStep] of templateSteps.entries()) {
      const existing = byTemplateStep.get(templateStep.id);
      if (existing) {
        if (!existing.tailored && !existing.removed) {
          await tx.planStep.update({
            where: { id: existing.id },
            data: { module: templateStep.module, ...stepContent(templateStep) },
          });
          items.find((i) => i.id === existing.id)!.module = templateStep.module;
        }
        continue;
      }

      // New template step: place it after the previous template step of the same module, if the plan has it.
      const previous = templateSteps
        .slice(0, index)
        .reverse()
        .find((t) => t.module === templateStep.module && byTemplateStep.has(t.id));
      const previousItem = previous && items.find((i) => i.id === byTemplateStep.get(previous.id)!.id);
      const moduleItems = items.filter((i) => i.module === templateStep.module);
      const position = previousItem
        ? previousItem.position + 0.001
        : moduleItems.length
          ? Math.min(...moduleItems.map((i) => i.position)) - 0.001
          : Math.max(-1, ...items.map((i) => i.position)) + 1;

      const created = await tx.planStep.create({
        data: {
          planId: plan.id,
          templateStepId: templateStep.id,
          module: templateStep.module,
          position: 0,
          ...stepContent(templateStep),
        },
      });
      items.push({ id: created.id, module: created.module, position });
      byTemplateStep.set(templateStep.id, created);
    }

    await renumberPlanSteps(tx, displayOrder(items));
    await syncGoals(tx, plan.id, plan.template.goals);
    await tx.plan.update({ where: { id: plan.id }, data: { templateVersion: plan.template.version } });
  });
}

/** The goal half of a template push; same rules as for steps. */
async function syncGoals(tx: Tx, planId: string, templateGoals: TemplateGoal[]) {
  const goals = await tx.goal.findMany({ where: { planId } });

  const orphaned = goals.filter((g) => !g.templateGoalId && !g.tailored);
  const toDelete = orphaned.filter((g) => g.status === 'OPEN').map((g) => g.id);
  const toDetach = orphaned.filter((g) => g.status !== 'OPEN').map((g) => g.id);
  if (toDelete.length) await tx.goal.deleteMany({ where: { id: { in: toDelete } } });
  if (toDetach.length) await tx.goal.updateMany({ where: { id: { in: toDetach } }, data: { tailored: true } });

  const byTemplateGoal = new Map(goals.filter((g) => g.templateGoalId).map((g) => [g.templateGoalId!, g]));
  for (const templateGoal of templateGoals) {
    const existing = byTemplateGoal.get(templateGoal.id);
    const content = { title: templateGoal.title, withinWeeks: templateGoal.withinWeeks };
    if (!existing) {
      await tx.goal.create({ data: { planId, templateGoalId: templateGoal.id, ...content } });
    } else if (!existing.tailored && !existing.removed) {
      await tx.goal.update({ where: { id: existing.id }, data: { ...content, targetDate: null } });
    }
  }
}
