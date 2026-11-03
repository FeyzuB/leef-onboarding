import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleAlert, Clock, Pencil, Plus, RefreshCw, Settings, Target, Trash2, UserRound } from 'lucide-react';
import {
  addGoal,
  addPlanStep,
  deletePlan,
  movePlanModule,
  movePlanStep,
  removePlanStep,
  restoreGoal,
  restorePlanStep,
  syncPlan,
  updatePlanSettings,
  updatePlanStep,
} from '@/app/actions/plans';
import { Drawer } from '@/components/Drawer';
import { GoalList } from '@/components/GoalList';
import { MoveButtons, iconButtonClass } from '@/components/MoveButtons';
import { StepFields } from '@/components/StepFields';
import { StepCheck } from '@/components/StepRow';
import { AddForm, ConfirmButton, SubmitButton } from '@/components/forms';
import {
  Avatar,
  Badge,
  Card,
  CardTitle,
  EmptyState,
  Field,
  PersonSelect,
  ProgressRing,
  buttonClass,
  dangerButtonClass,
  inputClass,
  secondaryButtonClass,
  smallButtonClass,
} from '@/components/ui';
import { inScope, requireLead, teamScope } from '@/lib/auth';
import { APP_TIMEZONE } from '@/lib/config';
import {
  currentWeek,
  formatDate,
  groupByModule,
  isOverdue,
  nextStep,
  planStats,
  resolveContact,
  stepDueDate,
  stepTimingLabel,
  stepVersion,
  toDateInput,
  toLinks,
} from '@/lib/logic';
import { prisma } from '@/lib/prisma';

export default async function PlanEditorPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const actor = await requireLead();
  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
    include: { newHire: { include: { team: true } }, lead: true, manager: true, buddy: true, template: true, steps: true, goals: true },
  });
  if (!plan || !inScope(actor, plan.newHire.teamId)) notFound();

  const [leads, people] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, OR: [{ appRole: 'ADMIN' }, { appRole: 'LEAD', ...teamScope(actor) }] },
      orderBy: { name: 'asc' },
    }),
    prisma.orgEntry.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const now = new Date();
  const visible = plan.steps.filter((s) => !s.removed);
  const removed = plan.steps.filter((s) => s.removed);
  const goals = plan.goals.filter((g) => !g.removed);
  const removedGoals = plan.goals.filter((g) => g.removed);
  const groups = groupByModule(visible);
  const modules = groups.map((g) => g.module);
  const stats = planStats(plan, now, APP_TIMEZONE);
  const behind = plan.template && plan.templateVersion < plan.template.version;
  const next = nextStep(
    groups.flatMap((g) => g.items),
    plan.startDate,
  );
  const overdue = stats.overdueSteps + stats.overdueGoals;
  const week = currentWeek(plan.startDate, now, APP_TIMEZONE);

  return (
    <>
      <Link href="/overview" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Overview
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={plan.newHire.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{plan.newHire.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {[
                plan.template ? `Template “${plan.template.title}”` : 'No template',
                `started ${formatDate(plan.startDate)}`,
                week >= 1 ? `week ${week}` : 'not started yet',
              ].join(' · ')}
            </p>
          </div>
        </div>
        <Drawer
          key={[plan.startDate.toISOString(), plan.leadId, plan.managerId, plan.buddyId].join('|')}
          title="Plan settings"
          triggerClassName={secondaryButtonClass}
          trigger={
            <>
              <Settings size={16} /> Plan settings
            </>
          }
        >
          <form action={updatePlanSettings} className="space-y-4">
            <input type="hidden" name="planId" value={plan.id} />
            <Field label="Start date">
              <input type="date" name="startDate" required defaultValue={toDateInput(plan.startDate)} className={inputClass} />
            </Field>
            <Field label="Lead" hint="The account that edits this plan">
              <select name="leadId" defaultValue={plan.leadId ?? ''} className={inputClass}>
                <option value="">No lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </select>
            </Field>
            <PersonSelect label="Manager" name="managerId" value={plan.managerId} people={people} />
            <PersonSelect label="Buddy" name="buddyId" value={plan.buddyId} people={people} />
            <SubmitButton>Save settings</SubmitButton>
          </form>
        </Drawer>
      </div>

      {behind && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="flex items-center gap-2 text-sm text-brand-800">
            <RefreshCw size={16} />
            The template has changed. Pushing keeps the steps you tailored and all progress.
          </p>
          <form action={syncPlan}>
            <input type="hidden" name="planId" value={plan.id} />
            <SubmitButton>Push template changes</SubmitButton>
          </form>
        </div>
      )}

      <div className="mb-10 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>Progress</CardTitle>
          <div className="flex items-center gap-4">
            <ProgressRing percent={stats.percent} size={76} />
            <div className="text-sm">
              <p className="font-semibold text-slate-900">
                {stats.doneSteps}/{stats.totalSteps} steps
              </p>
              <p className="text-slate-500">
                {stats.doneGoals}/{stats.totalGoals} goals
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stats.blockedSteps > 0 && (
              <Badge tone="red">
                <CircleAlert size={12} /> {stats.blockedSteps} stuck
              </Badge>
            )}
            {overdue > 0 && (
              <Badge tone="amber">
                <Clock size={12} /> {overdue} overdue
              </Badge>
            )}
            {!stats.blockedSteps && !overdue && <Badge tone="green">On track</Badge>}
          </div>
          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            {[
              ['Manager', plan.manager?.name],
              ['Buddy', plan.buddy?.name],
              ['Lead', plan.lead?.name],
            ].map(([role, name]) => (
              <div key={role} className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">{role}</dt>
                <dd className="flex items-center gap-2 font-medium text-slate-800">
                  {name ? (
                    <>
                      <Avatar name={name} size="sm" /> {name}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle icon={<Target size={14} />}>Goals</CardTitle>
            <Drawer
              key={`goals-${plan.goals.length}`}
              title="Add a goal"
              triggerClassName={smallButtonClass}
              trigger={
                <>
                  <Plus size={14} /> Add goal
                </>
              }
            >
              <AddForm action={addGoal} className="space-y-4">
                <input type="hidden" name="planId" value={plan.id} />
                <Field label="Goal">
                  <input name="title" required maxLength={300} placeholder="e.g. A LEEF bug resolved" className={inputClass} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Within weeks" hint="From the start date">
                    <input name="withinWeeks" type="number" min={1} max={104} className={inputClass} />
                  </Field>
                  <Field label="Or by date">
                    <input name="targetDate" type="date" className={inputClass} />
                  </Field>
                </div>
                <SubmitButton>Add goal</SubmitButton>
              </AddForm>
            </Drawer>
          </div>
          <GoalList goals={goals} startDate={plan.startDate} planId={plan.id} canEdit collapseAfter={6} />
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Steps</h2>
        <Drawer
          wide
          key={`steps-${plan.steps.length}`}
          title="Add a step to this plan"
          triggerClassName={buttonClass}
          trigger={
            <>
              <Plus size={16} /> Add step
            </>
          }
        >
          <AddForm action={addPlanStep} className="space-y-4">
            <input type="hidden" name="planId" value={plan.id} />
            <StepFields withDate listId="modules-new" modules={modules} />
            <SubmitButton>Add step</SubmitButton>
          </AddForm>
        </Drawer>
      </div>

      {groups.length === 0 && <EmptyState>This plan has no steps yet. Add the first one.</EmptyState>}
      <ol className="space-y-4">
        {groups.map((group, index) => {
          const doneInGroup = group.items.filter((s) => s.status === 'DONE').length;
          return (
            <li key={group.module} className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-200">
                  {index + 1}
                </span>
                <h3 className="min-w-0 flex-1 font-semibold text-slate-900">{group.module}</h3>
                <span className="text-xs font-medium text-slate-500">
                  {doneInGroup}/{group.items.length}
                </span>
                <div className="flex">
                  <MoveButtons action={movePlanModule} fields={{ planId: plan.id, module: group.module }} />
                </div>
              </div>
              <ol className="divide-y divide-slate-100">
                {group.items.map((step) => {
                  const done = step.status === 'DONE';
                  const contact = resolveContact(step, plan, people);
                  const timing = stepTimingLabel(step, plan.startDate);
                  const late = !done && isOverdue(stepDueDate(step, plan.startDate), now, APP_TIMEZONE);
                  return (
                    <li
                      key={step.id}
                      id={`step-${step.id}`}
                      className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${step.id === next?.id ? 'bg-accent-50/60' : ''}`}
                    >
                      <div className="pt-0.5">
                        <StepCheck step={step} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>{step.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {timing && <span className={late ? 'font-medium text-amber-700' : ''}>{timing}</span>}
                          {contact && (
                            <span className="inline-flex items-center gap-1">
                              <UserRound size={12} /> {contact.text}
                            </span>
                          )}
                          {step.tailored ? <Badge tone="accent">Tailored</Badge> : step.templateStepId && <Badge>From template</Badge>}
                          {step.status === 'BLOCKED' && <Badge tone="red">Stuck: {step.note || 'no note'}</Badge>}
                          {late && <Badge tone="amber">Overdue</Badge>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <MoveButtons action={movePlanStep} fields={{ planId: plan.id, stepId: step.id }} />
                        <Drawer
                          wide
                          key={stepVersion(step)}
                          title="Edit step"
                          triggerClassName={iconButtonClass}
                          triggerLabel="Edit step"
                          trigger={<Pencil size={15} />}
                        >
                          <form action={updatePlanStep} className="space-y-4">
                            <input type="hidden" name="planId" value={plan.id} />
                            <input type="hidden" name="stepId" value={step.id} />
                            <StepFields withDate listId={`modules-${step.id}`} modules={modules} defaults={{ ...step, links: toLinks(step.links) }} />
                            <SubmitButton>Save step</SubmitButton>
                          </form>
                        </Drawer>
                        <form action={removePlanStep}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="stepId" value={step.id} />
                          <ConfirmButton
                            message={`Remove “${step.title}” from this plan?`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} aria-label="Remove step" />
                          </ConfirmButton>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>

      {removed.length + removedGoals.length > 0 && (
        <Card className="mt-8">
          <CardTitle>Removed from this plan</CardTitle>
          <ul className="divide-y divide-slate-100">
            {removed.map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-2 py-2 text-sm text-slate-600">
                <span>
                  {step.module}: {step.title}
                </span>
                <form action={restorePlanStep}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="stepId" value={step.id} />
                  <SubmitButton className={smallButtonClass}>Restore</SubmitButton>
                </form>
              </li>
            ))}
            {removedGoals.map((goal) => (
              <li key={goal.id} className="flex items-center justify-between gap-2 py-2 text-sm text-slate-600">
                <span>Goal: {goal.title}</span>
                <form action={restoreGoal}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="goalId" value={goal.id} />
                  <SubmitButton className={smallButtonClass}>Restore</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-8 border-red-200">
        <CardTitle>Danger zone</CardTitle>
        <form action={deletePlan} className="flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" name="confirm" value="yes" required className="accent-red-600" /> Delete this plan and all its progress
          </label>
          <SubmitButton className={dangerButtonClass}>Delete plan</SubmitButton>
        </form>
      </Card>
    </>
  );
}
