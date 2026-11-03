import Link from 'next/link';
import { CalendarDays, Layers } from 'lucide-react';

export type StepView = 'time' | 'subject';

export function stepView(value: string | undefined): StepView {
  return value === 'subject' ? 'subject' : 'time';
}

/** "By time | By subject" for the step lists of templates and plans. */
export function ViewSwitch({ href, view }: { href: string; view: StepView }) {
  const option = (value: StepView, label: string, icon: React.ReactNode) => (
    <Link
      href={value === 'time' ? href : `${href}?view=subject`}
      aria-current={view === value ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        view === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon} {label}
    </Link>
  );
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {option('time', 'By time', <CalendarDays size={14} />)}
      {option('subject', 'By subject', <Layers size={14} />)}
    </div>
  );
}
