import type { Goal } from '@prisma/client';
import { Check, Trash2 } from 'lucide-react';
import { deleteGoal } from '@/app/actions/plans';
import { setGoalStatus } from '@/app/actions/progress';
import { ConfirmButton } from '@/components/forms';
import { Badge, EmptyState } from '@/components/ui';
import { APP_TIMEZONE } from '@/lib/config';
import { formatDate, goalDueDate, isOverdue } from '@/lib/logic';

/** Goals by due date, open ones first. With `collapseAfter`, only that many are shown until the reader expands the list. */
export function GoalList({
  goals,
  startDate,
  planId,
  canEdit = false,
  collapseAfter,
}: {
  goals: Goal[];
  startDate: Date;
  planId: string;
  canEdit?: boolean;
  collapseAfter?: number;
}) {
  if (!goals.length) return <EmptyState>No goals set yet.</EmptyState>;
  const now = new Date();
  const sorted = [...goals].sort((a, b) => {
    const doneA = a.status === 'DONE' ? 1 : 0;
    const doneB = b.status === 'DONE' ? 1 : 0;
    const da = goalDueDate(a, startDate)?.getTime() ?? Infinity;
    const db = goalDueDate(b, startDate)?.getTime() ?? Infinity;
    return doneA - doneB || da - db;
  });
  const shown = collapseAfter != null ? sorted.slice(0, collapseAfter) : sorted;
  const hidden = sorted.slice(shown.length);

  const list = (items: Goal[]) => (
    <ul className="divide-y divide-slate-100">
      {items.map((goal) => {
        const due = goalDueDate(goal, startDate);
        const done = goal.status === 'DONE';
        const overdue = !done && isOverdue(due, now, APP_TIMEZONE);
        return (
          <li key={goal.id} className="flex items-start gap-3 py-3">
            <form action={setGoalStatus} className="pt-0.5">
              <input type="hidden" name="goalId" value={goal.id} />
              <input type="hidden" name="status" value={done ? 'OPEN' : 'DONE'} />
              <button
                type="submit"
                aria-label={done ? 'Mark goal as not reached' : 'Mark goal as reached'}
                title={done ? 'Mark goal as not reached' : 'Mark goal as reached'}
                className={
                  done
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600'
                    : 'flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition hover:border-brand-500 hover:text-brand-500'
                }
              >
                <Check size={14} strokeWidth={3} />
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>{goal.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {due ? `Due ${formatDate(due)}` : 'No due date'}
                {goal.withinWeeks != null && !goal.targetDate && ` · within ${goal.withinWeeks} week${goal.withinWeeks === 1 ? '' : 's'}`}
                {done && goal.doneAt && ` · reached ${formatDate(goal.doneAt, APP_TIMEZONE)}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {overdue && <Badge tone="red">Overdue</Badge>}
              {canEdit && (
                <form action={deleteGoal}>
                  <input type="hidden" name="planId" value={planId} />
                  <input type="hidden" name="goalId" value={goal.id} />
                  <ConfirmButton
                    message="Remove this goal from the plan?"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} aria-label="Remove goal" />
                  </ConfirmButton>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  if (!hidden.length) return list(shown);
  return (
    <>
      {list(shown)}
      <details className="border-t border-slate-100 pt-2">
        <summary className="cursor-pointer list-none text-sm font-medium text-brand-700 hover:underline">
          Show {hidden.length} more goal{hidden.length === 1 ? '' : 's'}
        </summary>
        {list(hidden)}
      </details>
    </>
  );
}
