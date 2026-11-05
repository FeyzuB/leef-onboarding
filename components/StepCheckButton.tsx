'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { setStepStatus } from '@/app/actions/progress';

/**
 * The round tick in front of a step. Ticking it off fills the circle right away with a little pop,
 * before the server has answered; the pop only plays on a click, not when a page loads with done steps.
 */
export function StepCheckButton({ stepId, done }: { stepId: string; done: boolean }) {
  // Set on click so the circle shows the new state at once; dropped again when the server state catches up.
  const [pending, setPending] = useState<boolean | null>(null);
  const [popped, setPopped] = useState(false);
  const [lastDone, setLastDone] = useState(done);
  if (lastDone !== done) {
    setLastDone(done);
    setPending(null);
  }
  const shown = pending ?? done;
  const label = shown ? 'Mark as not done' : 'Mark as done';

  return (
    <form
      action={setStepStatus}
      onSubmit={() => {
        setPending(!shown);
        setPopped(!shown);
      }}
    >
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="status" value={shown ? 'OPEN' : 'DONE'} />
      <button
        type="submit"
        aria-label={label}
        title={label}
        className={
          shown
            ? `step-check flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm transition-colors hover:bg-brand-600 ${popped ? 'step-check-pop' : ''}`
            : 'flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-transparent transition hover:border-brand-500 hover:text-brand-500'
        }
      >
        <Check size={14} strokeWidth={3} className={popped && shown ? 'step-check-tick' : ''} />
      </button>
    </form>
  );
}
