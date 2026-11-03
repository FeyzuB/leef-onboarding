'use server';

import { cleanExplanation } from '@/lib/richText';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertPlanAccess, inScope, isLead, requireLead } from '@/lib/auth';
import { contactFields, direction, optionalInt, required, text } from '@/lib/forms';
import { displayOrder, moveModule, moveStep, parseDateInput, parseLinks } from '@/lib/logic';
import { createPlanFromTemplate, renumberPlanSteps, syncPlanWithTemplate } from '@/lib/plans';

function done() {
  revalidatePath('/', 'layout');
}

async function editablePlan(form: FormData) {
  const actor = await requireLead();
  const planId = text(form, 'planId');
  await assertPlanAccess(actor, planId, 'edit');
  return prisma.plan.findUniqueOrThrow({ where: { id: planId }, include: { steps: true } });
}

/** The plan's lead: an active admin, or an active lead from the actor's team. */
async function validLeadId(actor: User, leadId: string) {
  if (!leadId) return null;
  const lead = await prisma.user.findUnique({ where: { id: leadId } });
  const ok = !!lead && lead.active && isLead(lead) && (lead.appRole === 'ADMIN' || inScope(actor, lead.teamId));
  if (!ok) throw new Error('Choose a valid lead');
  return lead.id;
}

/** Manager or buddy: someone from Who is who, or nobody. */
async function orgEntryId(form: FormData, key: string) {
  const id = text(form, key);
  if (!id) return null;
  if (!(await prisma.orgEntry.findUnique({ where: { id } }))) throw new Error('Choose someone from Who is who');
  return id;
}

function startDate(form: FormData) {
  const date = parseDateInput(text(form, 'startDate'));
  if (!date) throw new Error('Choose a valid start date');
  return date;
}

export async function createPlan(form: FormData) {
  const actor = await requireLead();
  const newHire = await prisma.user.findUnique({ where: { id: text(form, 'newHireId') }, include: { plan: true } });
  if (!newHire || newHire.appRole !== 'NEW_HIRE' || !newHire.active || !inScope(actor, newHire.teamId)) throw new Error('New hire not found');
  if (newHire.plan) redirect(`/plans/${newHire.plan.id}`);
  const template = await prisma.template.findUnique({ where: { id: text(form, 'templateId') } });
  if (!template || !inScope(actor, template.teamId)) throw new Error('Template not found');

  const plan = await createPlanFromTemplate({
    newHireId: newHire.id,
    templateId: template.id,
    leadId: await validLeadId(actor, text(form, 'leadId')),
    startDate: startDate(form),
    managerId: await orgEntryId(form, 'managerId'),
    buddyId: await orgEntryId(form, 'buddyId'),
  });
  done();
  redirect(`/plans/${plan.id}`);
}

export async function updatePlanSettings(form: FormData) {
  const actor = await requireLead();
  const plan = await editablePlan(form);
  await prisma.plan.update({
    where: { id: plan.id },
    data: {
      startDate: startDate(form),
      leadId: await validLeadId(actor, text(form, 'leadId')),
      managerId: await orgEntryId(form, 'managerId'),
      buddyId: await orgEntryId(form, 'buddyId'),
    },
  });
  done();
}

export async function deletePlan(form: FormData) {
  const plan = await editablePlan(form);
  if (text(form, 'confirm') !== 'yes') throw new Error('Tick the box to confirm');
  await prisma.plan.delete({ where: { id: plan.id } });
  done();
  redirect('/overview');
}

export async function syncPlan(form: FormData) {
  const plan = await editablePlan(form);
  await syncPlanWithTemplate(plan.id);
  done();
}

// ---------- Steps (anything the lead adds or edits becomes "tailored") ----------

function stepFields(form: FormData) {
  return {
    module: required(form, 'module', 'Module', 120),
    title: required(form, 'title', 'Title', 200),
    explanation: cleanExplanation(text(form, 'explanation', 20000)),
    links: parseLinks(text(form, 'links', 4000)),
    ...contactFields(form),
    doneWhen: text(form, 'doneWhen', 500),
    week: optionalInt(form, 'week', 1, 52),
    dueDate: optionalDate(form, 'dueDate', 'Choose a valid date'),
  };
}

function optionalDate(form: FormData, key: string, message: string) {
  const value = text(form, key);
  if (!value) return null;
  const date = parseDateInput(value);
  if (!date) throw new Error(message);
  return date;
}

export async function addPlanStep(form: FormData) {
  const plan = await editablePlan(form);
  const fields = stepFields(form);
  await prisma.$transaction(async (tx) => {
    const created = await tx.planStep.create({
      data: { ...fields, planId: plan.id, tailored: true, position: plan.steps.length },
    });
    await renumberPlanSteps(tx, displayOrder([...plan.steps, created]));
  });
  done();
}

export async function updatePlanStep(form: FormData) {
  const plan = await editablePlan(form);
  const stepId = text(form, 'stepId');
  if (!plan.steps.some((s) => s.id === stepId)) throw new Error('Step not found');
  const fields = stepFields(form);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.planStep.update({ where: { id: stepId }, data: { ...fields, tailored: true } });
    const steps = plan.steps.map((s) =>
      s.id === stepId ? { ...updated, position: s.module === updated.module ? s.position : Number.MAX_SAFE_INTEGER } : s,
    );
    await renumberPlanSteps(tx, displayOrder(steps));
  });
  done();
}

export async function removePlanStep(form: FormData) {
  const plan = await editablePlan(form);
  const step = plan.steps.find((s) => s.id === text(form, 'stepId'));
  if (!step) throw new Error('Step not found');
  if (step.templateStepId) {
    // Keep a hidden marker so pushing template changes does not bring the step back.
    await prisma.planStep.update({ where: { id: step.id }, data: { removed: true } });
  } else {
    await prisma.planStep.delete({ where: { id: step.id } });
  }
  done();
}

export async function restorePlanStep(form: FormData) {
  const plan = await editablePlan(form);
  const step = plan.steps.find((s) => s.id === text(form, 'stepId'));
  if (!step) throw new Error('Step not found');
  await prisma.planStep.update({ where: { id: step.id }, data: { removed: false } });
  done();
}

export async function movePlanStep(form: FormData) {
  const plan = await editablePlan(form);
  const visible = plan.steps.filter((s) => !s.removed);
  const order = moveStep(visible, text(form, 'stepId'), direction(form));
  const hidden = plan.steps.filter((s) => s.removed).map((s) => s.id);
  await prisma.$transaction((tx) => renumberPlanSteps(tx, [...order, ...hidden]));
  done();
}

export async function movePlanModule(form: FormData) {
  const plan = await editablePlan(form);
  const visible = plan.steps.filter((s) => !s.removed);
  const order = moveModule(visible, text(form, 'module', 120), direction(form));
  const hidden = plan.steps.filter((s) => s.removed).map((s) => s.id);
  await prisma.$transaction((tx) => renumberPlanSteps(tx, [...order, ...hidden]));
  done();
}

// ---------- Goals ----------

export async function addGoal(form: FormData) {
  const plan = await editablePlan(form);
  const title = required(form, 'title', 'Goal', 300);
  const targetDate = optionalDate(form, 'targetDate', 'Choose a valid target date');
  const withinWeeks = targetDate ? null : optionalInt(form, 'withinWeeks', 1, 104);
  await prisma.goal.create({ data: { planId: plan.id, title, targetDate, withinWeeks, tailored: true } });
  done();
}

export async function deleteGoal(form: FormData) {
  const plan = await editablePlan(form);
  const goal = await prisma.goal.findFirst({ where: { id: text(form, 'goalId'), planId: plan.id } });
  if (!goal) throw new Error('Goal not found');
  if (goal.templateGoalId) {
    // Like template steps: hide it, so pushing template changes does not bring it back.
    await prisma.goal.update({ where: { id: goal.id }, data: { removed: true } });
  } else {
    await prisma.goal.delete({ where: { id: goal.id } });
  }
  done();
}

export async function restoreGoal(form: FormData) {
  const plan = await editablePlan(form);
  await prisma.goal.updateMany({ where: { id: text(form, 'goalId'), planId: plan.id }, data: { removed: false } });
  done();
}
