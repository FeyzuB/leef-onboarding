// Integration test for plan creation and template pushes. Needs a running database (DATABASE_URL).
// Run with: npm run test:db  — it creates its own throwaway team and removes it afterwards.
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import { createPlanFromTemplate, syncPlanWithTemplate } from '@/lib/plans';
import { groupByModule } from '@/lib/logic';

const tag = `test-${Date.now()}`;

async function planTitles(planId: string) {
  const steps = await prisma.planStep.findMany({ where: { planId, removed: false } });
  return groupByModule(steps).flatMap((g) => g.items.map((s) => `${g.module}:${s.title}`));
}

async function main() {
  const team = await prisma.team.create({ data: { name: tag } });
  const role = await prisma.role.create({ data: { name: tag } });
  const user = await prisma.user.create({ data: { name: 'Test hire', username: tag, passwordHash: 'x', teamId: team.id } });
  try {
    const template = await prisma.template.create({
      data: {
        title: 'T',
        teamId: team.id,
        roleId: role.id,
        steps: {
          create: [
            { module: 'M1', position: 0, title: 'A', week: 1, contactRole: 'BUDDY' },
            { module: 'M1', position: 1, title: 'B' },
            { module: 'M2', position: 2, title: 'C' },
          ],
        },
        goals: {
          create: [
            { position: 0, title: 'G1', withinWeeks: 4 },
            { position: 1, title: 'G2', withinWeeks: 8 },
            { position: 2, title: 'G3' },
          ],
        },
      },
      include: { steps: true, goals: true },
    });
    const tGoal = (title: string) => template.goals.find((g) => g.title === title)!;
    const goalTitles = async (planId: string) =>
      (await prisma.goal.findMany({ where: { planId, removed: false }, orderBy: { title: 'asc' } })).map((g) => `${g.title}/${g.withinWeeks}`);
    const tStep = (title: string) => template.steps.find((s) => s.title === title)!;

    const plan = await createPlanFromTemplate({ newHireId: user.id, templateId: template.id, leadId: null, startDate: new Date() });
    assert.deepEqual(await planTitles(plan.id), ['M1:A', 'M1:B', 'M2:C']);
    assert.equal(plan.templateVersion, template.version);
    const copiedA = await prisma.planStep.findFirstOrThrow({ where: { planId: plan.id, title: 'A' } });
    assert.equal(copiedA.week, 1, 'week is copied');
    assert.equal(copiedA.contactRole, 'BUDDY', 'contact role is copied');
    assert.deepEqual(await goalTitles(plan.id), ['G1/4', 'G2/8', 'G3/null'], 'goals are copied');

    // Goals: the lead removes G2 and adds an own goal; the new hire finishes G3.
    const goals = await prisma.goal.findMany({ where: { planId: plan.id } });
    const pGoal = (title: string) => goals.find((g) => g.title === title)!;
    await prisma.goal.update({ where: { id: pGoal('G2').id }, data: { removed: true } });
    await prisma.goal.update({ where: { id: pGoal('G3').id }, data: { status: 'DONE', doneAt: new Date() } });
    await prisma.goal.create({ data: { planId: plan.id, title: 'Own', withinWeeks: 2, tailored: true } });

    // The lead tailors the plan and the new hire makes progress.
    const steps = await prisma.planStep.findMany({ where: { planId: plan.id } });
    const pStep = (title: string) => steps.find((s) => s.title === title)!;
    await prisma.planStep.update({ where: { id: pStep('A').id }, data: { status: 'DONE', doneAt: new Date() } });
    await prisma.planStep.update({ where: { id: pStep('B').id }, data: { title: 'B custom', tailored: true } });
    await prisma.planStep.update({ where: { id: pStep('C').id }, data: { removed: true } });
    await prisma.planStep.create({ data: { planId: plan.id, module: 'M1', position: 3, title: 'X', tailored: true } });

    // The template changes: A and B renamed, C deleted, D inserted after A, E in a new module.
    await prisma.templateStep.update({ where: { id: tStep('A').id }, data: { title: 'A2' } });
    await prisma.templateStep.update({ where: { id: tStep('B').id }, data: { title: 'B2', position: 2 } });
    await prisma.templateStep.delete({ where: { id: tStep('C').id } });
    await prisma.templateStep.create({ data: { templateId: template.id, module: 'M1', position: 1, title: 'D' } });
    await prisma.templateStep.create({ data: { templateId: template.id, module: 'M3', position: 3, title: 'E' } });
    await prisma.templateStep.update({ where: { id: tStep('A').id }, data: { week: 2, contactRole: 'MANAGER' } });
    // Template goals: G1 changes, G2 changes (but was removed in the plan), G3 is deleted (but done), G4 is new.
    await prisma.templateGoal.update({ where: { id: tGoal('G1').id }, data: { title: 'G1b', withinWeeks: 5 } });
    await prisma.templateGoal.update({ where: { id: tGoal('G2').id }, data: { title: 'G2b' } });
    await prisma.templateGoal.delete({ where: { id: tGoal('G3').id } });
    await prisma.templateGoal.create({ data: { templateId: template.id, position: 3, title: 'G4', withinWeeks: 12 } });
    await prisma.template.update({ where: { id: template.id }, data: { version: { increment: 1 } } });

    await syncPlanWithTemplate(plan.id);

    const pushedA = await prisma.planStep.findFirstOrThrow({ where: { planId: plan.id, title: 'A2' } });
    assert.equal(pushedA.week, 2, 'week follows the template');
    assert.equal(pushedA.contactRole, 'MANAGER', 'contact role follows the template');
    assert.deepEqual(await goalTitles(plan.id), ['G1b/5', 'G3/null', 'G4/12', 'Own/2'], 'goals follow the template; removed, done and own goals are kept');
    assert.equal((await prisma.goal.findFirstOrThrow({ where: { planId: plan.id, title: 'G3' } })).tailored, true, "a done goal deleted from the template becomes the lead's own");
    assert.equal((await prisma.goal.findFirstOrThrow({ where: { planId: plan.id, removed: true } })).title, 'G2', 'a removed goal stays hidden and unchanged');

    assert.deepEqual(await planTitles(plan.id), ['M1:A2', 'M1:D', 'M1:B custom', 'M1:X', 'M3:E']);
    const a2 = await prisma.planStep.findFirstOrThrow({ where: { planId: plan.id, title: 'A2' } });
    assert.equal(a2.status, 'DONE', 'progress is kept when the template text changes');
    assert.equal(await prisma.planStep.count({ where: { planId: plan.id, title: 'C' } }), 0, 'untouched deleted step is gone');
    const synced = await prisma.plan.findUniqueOrThrow({ where: { id: plan.id }, include: { template: true } });
    assert.equal(synced.templateVersion, synced.template!.version);

    // A second push changes nothing.
    await syncPlanWithTemplate(plan.id);
    assert.deepEqual(await planTitles(plan.id), ['M1:A2', 'M1:D', 'M1:B custom', 'M1:X', 'M3:E']);
    assert.deepEqual(await goalTitles(plan.id), ['G1b/5', 'G3/null', 'G4/12', 'Own/2']);

    // Deleting a template step the new hire already finished keeps it in the plan.
    await prisma.templateStep.delete({ where: { id: tStep('A').id } });
    await syncPlanWithTemplate(plan.id);
    const kept = await prisma.planStep.findFirstOrThrow({ where: { planId: plan.id, title: 'A2' } });
    assert.equal(kept.tailored, true);
    assert.equal(kept.status, 'DONE');

    console.log('✔ plan creation and template push behave as specified');
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.team.delete({ where: { id: team.id } });
    await prisma.role.delete({ where: { id: role.id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
