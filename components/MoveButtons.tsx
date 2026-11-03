import { ChevronDown, ChevronUp } from 'lucide-react';

export const iconButtonClass = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';

/** ↑ / ↓ buttons that post `direction` plus the given hidden fields to a server action. */
export function MoveButtons({ action, fields }: { action: (form: FormData) => Promise<void>; fields: Record<string, string> }) {
  return (
    <>
      {(['up', 'down'] as const).map((dir) => (
        <form key={dir} action={action}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input type="hidden" name="direction" value={dir} />
          <button type="submit" className={iconButtonClass} aria-label={`Move ${dir}`} title={`Move ${dir}`}>
            {dir === 'up' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </form>
      ))}
    </>
  );
}
