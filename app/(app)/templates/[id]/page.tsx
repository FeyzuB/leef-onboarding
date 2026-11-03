import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, CalendarDays, Eye, Link2, Pencil, Plus, RefreshCw, Target, Trash2, UserRound } from 'lucide-react';
import {
  addTemplateGoal,
  addTemplateStep,
  deleteTemplate,
  deleteTemplateGoal,
  deleteTemplateStep,
  moveTemplateModule,
  moveTemplateStep,
  pushTemplateToPlans,
  renameTemplate,
  renameTemplateModule,
  updateTemplateGoal,
  updateTemplateStep,
} from '@/app/actions/templates';
import { Drawer } from '@/components/Drawer';
import { MoveButtons, iconButtonClass } from '@/components/MoveButtons';
import { StepFields } from '@/components/StepFields';
import { toPlainText } from '@/lib/richText';
import { AddForm, ConfirmButton, SubmitButton } from '@/components/forms';
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  Field,
  buttonClass,
  dangerButtonClass,
  inputClass,
  secondaryButtonClass,
  smallButtonClass,
} from '@/components/ui';
import { inScope, requireLead } from '@/lib/auth';
import { groupByModule, groupByPhase, stepVersion, templateContact, templateTimingLabel, toLinks } from '@/lib/logic';
import { ViewSwitch, stepView } from '@/components/ViewSwitch';
import type { GuideOption } from '@/components/StepFields';
import { visibleGuides } from '@/lib/guides';
import type { TemplateStep } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const deleteIconClass = 'rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600';

// Templates have no start date; any date works for ordering steps into phases.
const NO_START = new Date(0);

export default async function TemplateEditorPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const view = stepView(searchParams.view);
  const actor = await requireLead();
  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: { team: true, role: true, steps: true, goals: true, plans: { select: { templateVersion: true } } },
  });
  if (!template || !inScope(actor, template.teamId)) notFound();
  const guides = await prisma.guide.findMany({ where: visibleGuides(actor), select: { id: true, title: true }, orderBy: { title: 'asc' } });

  const groups = groupByModule(template.steps);
  const modules = groups.map((g) => g.module);
  const phases = groupByPhase(
    template.steps.map((step) => ({ ...step, dueDate: null })),
    NO_START,
    false,
  );
  const behind = template.plans.filter((p) => p.templateVersion < template.version).length;
  const goals = [...template.goals].sort((a, b) => (a.withinWeeks ?? Infinity) - (b.withinWeeks ?? Infinity) || a.position - b.position);

  return (
    <>
      <Link href="/templates" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Templates
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{template.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone="brand">{template.team.name}</Badge>
            <Badge>{template.role.name}</Badge>
            <span>
              {template.steps.length} steps · {template.goals.length} goals · used by {template.plans.length} plan
              {template.plans.length === 1 ? '' : 's'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/templates/${template.id}/preview`} className={secondaryButtonClass}>
            <Eye size={15} /> View as new hire
          </Link>
          <Drawer
            key={template.title}
            title="Rename template"
            triggerClassName={secondaryButtonClass}
            trigger={
              <>
                <Pencil size={15} /> Rename
              </>
            }
          >
            <form action={renameTemplate} className="space-y-4">
              <input type="hidden" name="templateId" value={template.id} />
              <Field label="Template name">
                <input name="title" required maxLength={120} defaultValue={template.title} className={inputClass} />
              </Field>
              <SubmitButton>Save name</SubmitButton>
            </form>
          </Drawer>
        </div>
      </div>

      <div
        className={`mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${behind ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'}`}
      >
        <p className={`flex items-center gap-2 text-sm ${behind ? 'text-brand-800' : 'text-slate-600'}`}>
          <RefreshCw size={16} />
          {behind
            ? `${behind} plan${behind === 1 ? ' is' : 's are'} behind this template. Pushing keeps tailored steps and all progress.`
            : 'All plans are up to date. Changes here reach existing plans only when you push them.'}
        </p>
        {behind > 0 && (
          <form action={pushTemplateToPlans}>
            <input type="hidden" name="templateId" value={template.id} />
            <SubmitButton>Push to all plans</SubmitButton>
          </form>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Steps</h2>
          <ViewSwitch href={`/templates/${template.id}`} view={view} />
        </div>
        <Drawer
          wide
          key={`steps-${template.steps.length}`}
          title="Add a step"
          triggerClassName={buttonClass}
          trigger={
            <>
              <Plus size={16} /> Add step
            </>
          }
        >
          <AddForm action={addTemplateStep} className="space-y-4">
            <input type="hidden" name="templateId" value={template.id} />
            <StepFields listId="modules-new" modules={modules} guides={guides} />
            <SubmitButton>Add step</SubmitButton>
          </AddForm>
        </Drawer>
      </div>

      {groups.length === 0 && <EmptyState>No steps yet. Add the first one.</EmptyState>}
      {view === 'time' && groups.length > 0 && (
        <p className="-mt-1 mb-4 text-sm text-slate-500">
          The order a new hire follows, by each step&apos;s timing. To move steps by hand, switch to &ldquo;By subject&rdquo;.
        </p>
      )}
      <ol className="space-y-4">
        {view === 'time'
          ? phases.map((phase) => (
              <li key={phase.key} className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                    <CalendarDays size={15} />
                  </span>
                  <h3 className="min-w-0 flex-1 font-semibold text-slate-900">{phase.label}</h3>
                  <span className="text-xs font-medium text-slate-500">{phase.items.length} steps</span>
                </div>
                <ol className="divide-y divide-slate-100">
                  {phase.items.map((step) => (
                    <StepItem key={step.id} step={step} templateId={template.id} modules={modules} guides={guides} showModule />
                  ))}
                </ol>
              </li>
            ))
          : groups.map((group, index) => (
              <li key={group.module} className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-200">
                    {index + 1}
                  </span>
                  <h3 className="min-w-0 flex-1 font-semibold text-slate-900">{group.module}</h3>
                  <span className="text-xs font-medium text-slate-500">{group.items.length} steps</span>
                  <div className="flex items-center">
                    <MoveButtons action={moveTemplateModule} fields={{ templateId: template.id, module: group.module }} />
                    <Drawer
                      key={group.module}
                      title="Rename module"
                      triggerClassName={iconButtonClass}
                      triggerLabel="Rename module"
                      trigger={<Pencil size={15} />}
                    >
                      <form action={renameTemplateModule} className="space-y-4">
                        <input type="hidden" name="templateId" value={template.id} />
                        <input type="hidden" name="module" value={group.module} />
                        <Field label="Module name">
                          <input name="newModule" required maxLength={120} defaultValue={group.module} className={inputClass} />
                        </Field>
                        <SubmitButton>Save name</SubmitButton>
                      </form>
                    </Drawer>
                  </div>
                </div>
                <ol className="divide-y divide-slate-100">
                  {group.items.map((step) => (
                    <StepItem key={step.id} step={step} templateId={template.id} modules={modules} guides={guides} movable />
                  ))}
                </ol>
              </li>
            ))}
      </ol>

      <Card className="mt-10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle icon={<Target size={14} />}>Goals</CardTitle>
            <p className="-mt-1 mb-3 text-sm text-slate-600">Copied into every new plan. The lead can remove or add goals per person.</p>
          </div>
          <Drawer
            key={`goals-${template.goals.length}`}
            title="Add a goal"
            triggerClassName={smallButtonClass}
            trigger={
              <>
                <Plus size={14} /> Add goal
              </>
            }
          >
            <AddForm action={addTemplateGoal} className="space-y-4">
              <input type="hidden" name="templateId" value={template.id} />
              <Field label="Goal">
                <input name="title" required maxLength={300} className={inputClass} />
              </Field>
              <Field label="Within weeks" hint="From the start date">
                <input name="withinWeeks" type="number" min={1} max={104} className={inputClass} />
              </Field>
              <SubmitButton>Add goal</SubmitButton>
            </AddForm>
          </Drawer>
        </div>
        {goals.length === 0 && <EmptyState>No goals in this template yet.</EmptyState>}
        <ul className="divide-y divide-slate-100">
          {goals.map((goal) => (
            <li key={goal.id} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-200">
                <Target size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{goal.title}</p>
                <p className="text-xs text-slate-500">
                  {goal.withinWeeks != null ? `Within ${goal.withinWeeks} week${goal.withinWeeks === 1 ? '' : 's'} of start` : 'No due date'}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <Drawer
                  key={`${goal.title}|${goal.withinWeeks}`}
                  title="Edit goal"
                  triggerClassName={iconButtonClass}
                  triggerLabel="Edit goal"
                  trigger={<Pencil size={15} />}
                >
                  <form action={updateTemplateGoal} className="space-y-4">
                    <input type="hidden" name="templateId" value={template.id} />
                    <input type="hidden" name="goalId" value={goal.id} />
                    <Field label="Goal">
                      <input name="title" required maxLength={300} defaultValue={goal.title} className={inputClass} />
                    </Field>
                    <Field label="Within weeks" hint="From the start date">
                      <input name="withinWeeks" type="number" min={1} max={104} defaultValue={goal.withinWeeks ?? ''} className={inputClass} />
                    </Field>
                    <SubmitButton>Save goal</SubmitButton>
                  </form>
                </Drawer>
                <form action={deleteTemplateGoal}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <input type="hidden" name="goalId" value={goal.id} />
                  <ConfirmButton message="Delete this goal from the template?" className={deleteIconClass}>
                    <Trash2 size={15} aria-label="Delete goal" />
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-8 border-red-200">
        <CardTitle>Danger zone</CardTitle>
        {template.plans.length > 0 && (
          <p className="mb-3 text-sm text-slate-600">
            The {template.plans.length} plan{template.plans.length === 1 ? '' : 's'} made from it keep their steps and progress, but can no longer
            receive template updates.
          </p>
        )}
        <form action={deleteTemplate} className="flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="templateId" value={template.id} />
          <label className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" name="confirm" value="yes" required className="accent-red-600" /> Delete this template and all its steps
          </label>
          <SubmitButton className={dangerButtonClass}>Delete template</SubmitButton>
        </form>
      </Card>
    </>
  );
}

/** One template step: what it says, its timing and who to ask, with edit, delete and (in the subject view) move. */
function StepItem({
  step,
  templateId,
  modules,
  guides,
  movable = false,
  showModule = false,
}: {
  step: TemplateStep;
  templateId: string;
  modules: string[];
  guides: GuideOption[];
  movable?: boolean;
  showModule?: boolean;
}) {
  const links = toLinks(step.links);
  const contact = templateContact(step);
  const timing = templateTimingLabel(step);
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{step.title}</p>
        {step.explanation && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{toPlainText(step.explanation)}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {showModule && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{step.module}</span>}
          {timing && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {timing}
            </span>
          )}
          {contact && (
            <span className="inline-flex items-center gap-1">
              <UserRound size={12} /> {contact}
            </span>
          )}
          {links.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Link2 size={12} /> {links.length} link{links.length === 1 ? '' : 's'}
            </span>
          )}
          {step.guideId && (
            <span className="inline-flex items-center gap-1">
              <BookOpen size={12} /> Guide
            </span>
          )}
          {step.doneWhen && <span>Done when: {step.doneWhen}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        {movable && <MoveButtons action={moveTemplateStep} fields={{ templateId, stepId: step.id }} />}
        <Drawer
          wide
          key={stepVersion(step)}
          title="Edit step"
          triggerClassName={iconButtonClass}
          triggerLabel="Edit step"
          trigger={<Pencil size={15} />}
        >
          <form action={updateTemplateStep} className="space-y-4">
            <input type="hidden" name="templateId" value={templateId} />
            <input type="hidden" name="stepId" value={step.id} />
            <StepFields listId={`modules-${step.id}`} modules={modules} guides={guides} defaults={{ ...step, links }} />
            <SubmitButton>Save step</SubmitButton>
          </form>
        </Drawer>
        <form action={deleteTemplateStep}>
          <input type="hidden" name="templateId" value={templateId} />
          <input type="hidden" name="stepId" value={step.id} />
          <ConfirmButton message={`Delete “${step.title}” from the template?`} className={deleteIconClass}>
            <Trash2 size={15} aria-label="Delete step" />
          </ConfirmButton>
        </form>
      </div>
    </li>
  );
}
