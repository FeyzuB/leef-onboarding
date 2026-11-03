import type { ReactNode } from 'react';
import type { PlanStep } from '@prisma/client';
import { BookOpen, Check, ChevronRight, CircleAlert, Flag, Link2, UserRound } from 'lucide-react';
import { setStepStatus } from '@/app/actions/progress';
import { SubmitButton } from '@/components/forms';
import { RichText } from '@/components/RichText';
import { StepLinks } from '@/components/StepFields';
import { Badge, inputClass, secondaryButtonClass, smallButtonClass } from '@/components/ui';
import { APP_TIMEZONE } from '@/lib/config';
import { formatDate, isOverdue, stepDueDate, stepTimingLabel, toLinks, type ResolvedContact } from '@/lib/logic';

function StatusForm({
  stepId,
  status,
  children,
  className,
  label,
}: {
  stepId: string;
  status: string;
  children: ReactNode;
  className: string;
  label: string;
}) {
  return (
    <form action={setStepStatus}>
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" aria-label={label} title={label} className={className}>
        {children}
      </button>
    </form>
  );
}

/** A contact, linked to their card on Who is who when they are on it. */
export function ContactName({ contact }: { contact: ResolvedContact }) {
  const suffix = contact.role && contact.person ? ` (${contact.role})` : '';
  if (!contact.person) return <>{contact.text}</>;
  return (
    <>
      <a href={`/organogram#person-${contact.person.id}`} className="font-medium text-brand-700 hover:underline">
        {contact.text}
      </a>
      {suffix}
    </>
  );
}

/** The round tick in front of a step: ticks it off, or opens it again. */
export function StepCheck({ step, readOnly = false }: { step: PlanStep; readOnly?: boolean }) {
  const done = step.status === 'DONE';
  // Previews show the circle without a form.
  if (readOnly) return <span aria-hidden className="block h-6 w-6 rounded-full border-2 border-slate-300 bg-white" />;
  return done ? (
    <StatusForm
      stepId={step.id}
      status="OPEN"
      label="Mark as not done"
      className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm transition hover:bg-brand-600"
    >
      <Check size={14} strokeWidth={3} />
    </StatusForm>
  ) : (
    <StatusForm
      stepId={step.id}
      status="DONE"
      label="Mark as done"
      className="group flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-transparent transition hover:border-brand-500 hover:text-brand-500"
    >
      <Check size={14} strokeWidth={3} />
    </StatusForm>
  );
}

/**
 * One step as a compact row: tick, title, when and who; the explanation, links and "I'm stuck" open on click.
 * Render it inside an <li key={step.id}>: keys on server components are not kept.
 */
export function StepRow({
  step,
  startDate,
  contact,
  highlight = false,
  readOnly = false,
  showModule = false,
}: {
  step: PlanStep;
  startDate: Date;
  contact: ResolvedContact | null;
  highlight?: boolean;
  /** For previews: no tick, no "I'm stuck". */
  readOnly?: boolean;
  /** Show the step's subject (module) as a small label, for views grouped by time. */
  showModule?: boolean;
}) {
  const done = step.status === 'DONE';
  const blocked = step.status === 'BLOCKED';
  const timing = stepTimingLabel(step, startDate);
  const overdue = !done && isOverdue(stepDueDate(step, startDate), new Date(), APP_TIMEZONE);
  const links = toLinks(step.links);

  return (
    <div
      id={`step-${step.id}`}
      className={`flex scroll-mt-24 gap-3 rounded-xl px-3 py-3 transition ${highlight ? 'bg-accent-50/70 ring-1 ring-accent-200' : 'hover:bg-slate-50'}`}
    >
      <div className="pt-0.5">
        <StepCheck step={step} readOnly={readOnly} />
      </div>
      <details className="min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>{step.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {highlight && (
                <span className="inline-flex items-center gap-1 font-semibold text-accent-600">
                  <Flag size={12} /> Next up
                </span>
              )}
              {showModule && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{step.module}</span>}
              {timing && <span className={overdue ? 'font-medium text-amber-700' : ''}>{timing}</span>}
              {contact && (
                <span className="inline-flex items-center gap-1">
                  <UserRound size={12} />
                  {contact.text}
                </span>
              )}
              {links.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Link2 size={12} /> {links.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {overdue && <Badge tone="amber">Overdue</Badge>}
            {blocked && <Badge tone="red">Stuck</Badge>}
            <ChevronRight size={16} className="details-chevron mt-0.5 text-slate-400 transition-transform" />
          </div>
        </summary>

        <div className="mt-3 space-y-3 border-l-2 border-brand-100 pl-4 text-sm">
          <RichText value={step.explanation} className="text-slate-700" />
          {step.guideId && (
            <a
              href={`/guides/${step.guideId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100"
            >
              <BookOpen size={15} /> Read the guide
            </a>
          )}
          <StepLinks links={links} />
          {(contact || step.doneWhen) && (
            <dl className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
              {contact && (
                <div>
                  <dt className="inline font-semibold">Contact: </dt>
                  <dd className="inline">
                    <ContactName contact={contact} />
                  </dd>
                </div>
              )}
              {step.doneWhen && (
                <div>
                  <dt className="inline font-semibold">Done when: </dt>
                  <dd className="inline">{step.doneWhen}</dd>
                </div>
              )}
            </dl>
          )}
          {done && step.doneAt && <p className="text-xs text-brand-700">Completed {formatDate(step.doneAt, APP_TIMEZONE)}</p>}

          {readOnly ? null : blocked ? (
            <div className="rounded-lg bg-red-50 p-3 text-red-800">
              <p className="flex items-center gap-1.5 font-medium">
                <CircleAlert size={14} /> You&apos;re stuck on this
              </p>
              <p className="mt-1">{step.note || 'No note given'}</p>
              <form action={setStepStatus} className="mt-2">
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="status" value="OPEN" />
                <SubmitButton className={smallButtonClass}>No longer stuck</SubmitButton>
              </form>
            </div>
          ) : (
            !done && (
              <details>
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700">
                  <CircleAlert size={13} /> I&apos;m stuck
                </summary>
                <form action={setStepStatus} className="mt-2 flex flex-col gap-2 sm:max-w-md">
                  <input type="hidden" name="stepId" value={step.id} />
                  <input type="hidden" name="status" value="BLOCKED" />
                  <textarea name="note" rows={2} maxLength={1000} required placeholder="What is blocking you?" className={inputClass} />
                  <SubmitButton className={secondaryButtonClass}>Tell my lead</SubmitButton>
                </form>
              </details>
            )
          )}
        </div>
      </details>
    </div>
  );
}
