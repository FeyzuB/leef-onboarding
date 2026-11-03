import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
export const buttonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60';
export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60';
export const smallButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40';
export const dangerButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50';

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1.5 text-sm text-slate-600">{intro}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card ${className}`}>{children}</section>;
}

/** Small uppercase heading inside a card. */
export function CardTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {icon}
      {children}
    </h2>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const badgeStyles = {
  green: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  accent: 'bg-accent-50 text-accent-700 ring-accent-500/25',
};

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: keyof typeof badgeStyles }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeStyles[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'DONE') return <Badge tone="green">Done</Badge>;
  if (status === 'BLOCKED') return <Badge tone="red">Stuck</Badge>;
  return <Badge>Open</Badge>;
}

export function ProgressBar({ percent, showLabel = true }: { percent: number; showLabel?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      {showLabel && <span className="w-10 text-right text-xs font-semibold text-slate-700">{percent}%</span>}
    </div>
  );
}

/** Round progress indicator with the percentage in the middle. */
export function ProgressRing({ percent, size = 72, light = false }: { percent: number; size?: number; light?: boolean }) {
  const stroke = Math.max(5, size / 12);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={light ? 'stroke-white/25' : 'stroke-slate-100'} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className={light ? 'stroke-white' : 'stroke-brand-500'}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${light ? 'text-white' : 'text-slate-900'}`}>
        {percent}%
      </span>
    </div>
  );
}

const avatarColors = ['bg-brand-100 text-brand-800', 'bg-accent-100 text-accent-700', 'bg-sky-100 text-sky-800', 'bg-violet-100 text-violet-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800'];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** A round avatar with initials; the colour follows the name so a person always looks the same. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const dims = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' }[size];
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${dims} ${avatarColors[hash % avatarColors.length]}`}>
      {initials(name)}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">{children}</p>;
}

/** Pick someone from Who is who, e.g. a plan's manager or buddy. */
export function PersonSelect({
  label,
  name,
  value,
  people,
}: {
  label: string;
  name: string;
  value: string | null;
  people: { id: string; name: string; jobTitle: string }[];
}) {
  return (
    <Field label={label} hint="From Who is who">
      <select name={name} defaultValue={value ?? ''} className={inputClass}>
        <option value="">Nobody</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
            {person.jobTitle ? ` (${person.jobTitle})` : ''}
          </option>
        ))}
      </select>
    </Field>
  );
}
