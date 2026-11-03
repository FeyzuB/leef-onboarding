'use server';

import { cleanExplanation } from '@/lib/richText';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { inScope, isAdmin, requireLead } from '@/lib/auth';
import { contactFields, direction, optionalInt, required, text } from '@/lib/forms';
import { displayOrder, moveModule, moveStep, parseLinks } from '@/lib/logic';
import { bumpTemplateVersion, renumberTemplateSteps, syncPlanWithTemplate } from '@/lib/plans';

async function loadTemplate(templateId: string) {
  const actor = await requireLead();
  const template = await prisma.template.findUnique({ where: { id: templateId }, include: { steps: true, goals: true } });
  if (!template || !inScope(actor, template.teamId)) throw new Error('Template not found');
  return template;
}

function stepFields(form: FormData) {
  return {
    module: required(form, 'module', 'Module', 120),
    title: required(form, 'title', 'Title', 200),
    explanation: cleanExplanation(text(form, 'explanation', 20000)),
    links: parseLinks(text(form, 'links', 4000)),
    ...contactFields(form),
    doneWhen: text(form, 'doneWhen', 500),
    week: optionalInt(form, 'week', 1, 52),
  };
}

function done() {
  revalidatePath('/', 'layout');
}

export async function createTemplate(form: FormData) {
  const actor = await requireLead();
  const title = required(form, 'title', 'Title', 120);
  const roleId = required(form, 'roleId', 'Role');
  const teamId = isAdmin(actor) ? required(form, 'teamId', 'Team') : actor.teamId;
  if (!teamId) throw new Error('You are not in a team');
  const existing = await prisma.template.findUnique({ where: { teamId_roleId: { teamId, roleId } } });
  if (existing) redirect(`/templates/${existing.id}`);
  const template = await prisma.template.create({ data: { title, teamId, roleId } });
  done();
  redirect(`/templates/${template.id}`);
}

export async function renameTemplate(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  await prisma.template.update({ where: { id: template.id }, data: { title: required(form, 'title', 'Title', 120) } });
  done();
}

/** Plans made from the template keep their steps and progress; they just lose the link. */
export async function deleteTemplate(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  if (text(form, 'confirm') !== 'yes') throw new Error('Tick the box to confirm');
  await prisma.template.delete({ where: { id: template.id } });
  done();
  redirect('/templates');
}

export async function addTemplateStep(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const fields = stepFields(form);
  await prisma.$transaction(async (tx) => {
    const created = await tx.templateStep.create({
      data: { ...fields, templateId: template.id, position: template.steps.length },
    });
    await renumberTemplateSteps(tx, displayOrder([...template.steps, created]));
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function updateTemplateStep(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const stepId = text(form, 'stepId');
  if (!template.steps.some((s) => s.id === stepId)) throw new Error('Step not found');
  const fields = stepFields(form);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.templateStep.update({ where: { id: stepId }, data: fields });
    // A step moved to another module goes to the end of that module.
    const steps = template.steps.map((s) =>
      s.id === stepId ? { ...updated, position: s.module === updated.module ? s.position : Number.MAX_SAFE_INTEGER } : s,
    );
    await renumberTemplateSteps(tx, displayOrder(steps));
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function deleteTemplateStep(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const stepId = text(form, 'stepId');
  if (!template.steps.some((s) => s.id === stepId)) throw new Error('Step not found');
  await prisma.$transaction(async (tx) => {
    await tx.templateStep.delete({ where: { id: stepId } });
    await renumberTemplateSteps(tx, displayOrder(template.steps.filter((s) => s.id !== stepId)));
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function moveTemplateStep(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const order = moveStep(template.steps, text(form, 'stepId'), direction(form));
  await prisma.$transaction(async (tx) => {
    await renumberTemplateSteps(tx, order);
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function moveTemplateModule(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const order = moveModule(template.steps, text(form, 'module', 120), direction(form));
  await prisma.$transaction(async (tx) => {
    await renumberTemplateSteps(tx, order);
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function renameTemplateModule(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const from = text(form, 'module', 120);
  const to = required(form, 'newModule', 'Module name', 120);
  await prisma.$transaction(async (tx) => {
    await tx.templateStep.updateMany({ where: { templateId: template.id, module: from }, data: { module: to } });
    const steps = template.steps.map((s) => (s.module === from ? { ...s, module: to } : s));
    await renumberTemplateSteps(tx, displayOrder(steps));
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

/** F10: push the template's current content into every plan that is behind. */
export async function pushTemplateToPlans(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const behind = await prisma.plan.findMany({
    where: { templateId: template.id, templateVersion: { lt: template.version } },
    select: { id: true },
  });
  for (const plan of behind) await syncPlanWithTemplate(plan.id);
  done();
}

// ---------- Goals ----------

function goalFields(form: FormData) {
  return {
    title: required(form, 'title', 'Goal', 300),
    withinWeeks: optionalInt(form, 'withinWeeks', 1, 104),
  };
}

export async function addTemplateGoal(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  await prisma.$transaction(async (tx) => {
    await tx.templateGoal.create({ data: { ...goalFields(form), templateId: template.id, position: template.goals.length } });
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function updateTemplateGoal(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const goalId = text(form, 'goalId');
  if (!template.goals.some((g) => g.id === goalId)) throw new Error('Goal not found');
  await prisma.$transaction(async (tx) => {
    await tx.templateGoal.update({ where: { id: goalId }, data: goalFields(form) });
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}

export async function deleteTemplateGoal(form: FormData) {
  const template = await loadTemplate(text(form, 'templateId'));
  const goalId = text(form, 'goalId');
  if (!template.goals.some((g) => g.id === goalId)) throw new Error('Goal not found');
  await prisma.$transaction(async (tx) => {
    await tx.templateGoal.delete({ where: { id: goalId } });
    await bumpTemplateVersion(tx, template.id);
  });
  done();
}
