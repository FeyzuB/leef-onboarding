import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Goal, PlanStep } from '@prisma/client';
import { ArrowLeft, Eye } from 'lucide-react';
import { PlanView } from '@/components/PlanView';
import { inputClass, secondaryButtonClass } from '@/components/ui';
import { inScope, requireLead } from '@/lib/auth';
import { APP_TIMEZONE } from '@/lib/config';
import { parseDateInput, todayInput } from '@/lib/logic';
import { prisma } from '@/lib/prisma';

const PREVIEW = 'preview';

/**
 * "View as new hire": the template shown the way a new plan made from it looks on My plan,
 * for a start date the lead picks. Nothing is saved; ticks and "I'm stuck" are switched off.
 */
export default async function TemplatePreviewPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ start?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const actor = await requireLead();
  const template = await prisma.template.findUnique({ where: { id: params.id }, include: { steps: true, goals: true } });
  if (!template || !inScope(actor, template.teamId)) notFound();

  const today = todayInput(new Date(), APP_TIMEZONE);
  const start = parseDateInput(searchParams.start ?? '') ?? parseDateInput(today)!;
  const startInput = searchParams.start && parseDateInput(searchParams.start) ? searchParams.start : today;
  const people = await prisma.orgEntry.findMany({ select: { id: true, name: true } });

  // The same copy a new plan would get, without saving it.
  const steps: PlanStep[] = template.steps.map((step) => ({
    id: step.id,
    planId: PREVIEW,
    templateStepId: step.id,
    tailored: false,
    removed: false,
    module: step.module,
    position: step.position,
    title: step.title,
    explanation: step.explanation,
    links: step.links,
    contact: step.contact,
    contactRole: step.contactRole,
    doneWhen: step.doneWhen,
    week: step.week,
    dueDate: null,
    status: 'OPEN',
    note: '',
    doneAt: null,
  }));
  const goals: Goal[] = template.goals.map((goal) => ({
    id: goal.id,
    planId: PREVIEW,
    templateGoalId: goal.id,
    tailored: false,
    removed: false,
    title: goal.title,
    targetDate: null,
    withinWeeks: goal.withinWeeks,
    status: 'OPEN',
    doneAt: null,
    createdAt: start,
  }));

  return (
    <>
      <Link
        href={`/templates/${template.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={15} /> {template.title}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-accent-200 bg-accent-50 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600 ring-1 ring-accent-200">
          <Eye size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-accent-800">Preview: what a new hire sees</p>
          <p className="text-sm text-accent-700">
            A new plan made from this template, before any tailoring. Pick a start date to see a different week. Nothing is saved.
          </p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-accent-800">Start date</span>
            <input type="date" name="start" defaultValue={startInput} className={`${inputClass} w-auto`} />
          </label>
          <button type="submit" className={secondaryButtonClass}>
            Show
          </button>
        </form>
      </div>

      <PlanView
        firstName="new colleague"
        startDate={start}
        steps={steps}
        goals={goals}
        planId={PREVIEW}
        manager={null}
        buddy={null}
        supporters={[
          { role: 'Manager', name: 'Set per plan' },
          { role: 'Buddy', name: 'Set per plan' },
        ]}
        people={people}
        readOnly
      />
    </>
  );
}
