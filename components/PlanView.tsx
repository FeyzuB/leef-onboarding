import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Target } from 'lucide-react';
import type { Goal, OrgEntry, PlanStep } from '@prisma/client';
import { GoalList } from '@/components/GoalList';
import { StepCheck, StepRow } from '@/components/StepRow';
import { Avatar, Card, CardTitle, EmptyState, ProgressBar, ProgressRing } from '@/components/ui';
import { APP_TIMEZONE } from '@/lib/config';
import { currentWeek, formatDate, groupByModule, nextStep, planStats, resolveContact, stepTimingLabel, thisWeekSteps } from '@/lib/logic';

type Person = Pick<OrgEntry, 'id' | 'name'>;

/**
 * What a new hire sees of their plan: welcome, "This week", goals and the journey by module.
 * Used for My plan, and read-only for the lead's "View as new hire" preview of a template.
 */
export function PlanView({
  firstName,
  startDate,
  steps,
  goals,
  planId,
  manager,
  buddy,
  supporters,
  people,
  now = new Date(),
  readOnly = false,
}: {
  firstName: string;
  startDate: Date;
  steps: PlanStep[];
  goals: Goal[];
  planId: string;
  manager: Person | null;
  buddy: Person | null;
  supporters: { role: string; name: string }[];
  people: Person[];
  now?: Date;
  readOnly?: boolean;
}) {
  const stats = planStats({ steps, goals, startDate }, now, APP_TIMEZONE);
  const groups = groupByModule(steps);
  const ordered = groups.flatMap((g) => g.items);
  const next = nextStep(ordered, startDate);
  const thisWeek = thisWeekSteps(ordered, startDate, now, APP_TIMEZONE);
  const hasTiming = ordered.some((s) => s.week != null || s.dueDate);
  const week = currentWeek(startDate, now, APP_TIMEZONE);
  const weekItems = [...thisWeek.overdue, ...thisWeek.due];
  const contactPlan = { manager, buddy };

  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-lift sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-400/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-100">
              <CalendarDays size={15} />
              {week >= 1 ? `Week ${week} of your onboarding` : `Your onboarding starts on ${formatDate(startDate)}`}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {firstName}</h1>
            {supporters.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {supporters.map((person) => (
                  <span
                    key={person.role}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm ring-1 ring-white/20"
                  >
                    <Avatar name={person.name} size="sm" />
                    <span>
                      <span className="text-brand-100">{person.role}</span> · {person.name}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {next && (
              <a
                href={`#step-${next.id}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
              >
                Next up: {next.title}
                <ArrowRight size={16} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <ProgressRing percent={stats.percent} size={88} light />
            <div className="text-sm">
              <p className="font-semibold">
                {stats.doneSteps} of {stats.totalSteps} steps
              </p>
              <p className="text-brand-100">
                {stats.doneGoals} of {stats.totalGoals} goals
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className={`mb-10 grid gap-6 ${hasTiming ? 'lg:grid-cols-5' : ''}`}>
        {hasTiming && (
          <Card className="lg:col-span-3">
            <CardTitle icon={<CalendarDays size={14} />}>This week · week {thisWeek.week}</CardTitle>
            {weekItems.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-slate-600">
                <CheckCircle2 size={18} className="text-brand-500" /> All done for this week. Carry on with your next step.
              </p>
            ) : (
              <ul className="-mx-2">
                {weekItems.map((step) => (
                  <li key={step.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <div className="pt-0.5">
                      <StepCheck step={step} readOnly={readOnly} />
                    </div>
                    <a href={`#step-${step.id}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{step.title}</p>
                      <p className="text-xs text-slate-500">
                        {thisWeek.overdue.includes(step) && <span className="font-semibold text-amber-700">Overdue · </span>}
                        {stepTimingLabel(step, startDate)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        <Card className={hasTiming ? 'lg:col-span-2' : ''}>
          <CardTitle icon={<Target size={14} />}>Your goals</CardTitle>
          <GoalList goals={goals} startDate={startDate} planId={planId} collapseAfter={4} readOnly={readOnly} />
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-900">Your journey</h2>
      {groups.length === 0 && <EmptyState>Your plan has no steps yet.</EmptyState>}
      <ol className="space-y-4">
        {groups.map((group, index) => {
          const doneInGroup = group.items.filter((s) => s.status === 'DONE').length;
          const complete = doneInGroup === group.items.length;
          const percent = Math.round((doneInGroup / group.items.length) * 100);
          return (
            <li key={group.module}>
              <details open={!complete} className="group rounded-2xl border border-slate-200/80 bg-white shadow-card">
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4 sm:p-5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      complete ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    }`}
                  >
                    {complete ? <CheckCircle2 size={18} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{group.module}</h3>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="max-w-xs flex-1">
                        <ProgressBar percent={percent} showLabel={false} />
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {doneInGroup}/{group.items.length}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="details-chevron shrink-0 text-slate-400 transition-transform" />
                </summary>
                <ol className="space-y-1 border-t border-slate-100 p-2 sm:p-3">
                  {group.items.map((step) => (
                    <li key={step.id}>
                      <StepRow
                        step={step}
                        startDate={startDate}
                        contact={resolveContact(step, contactPlan, people)}
                        highlight={step.id === next?.id}
                        readOnly={readOnly}
                      />
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
    </>
  );
}
