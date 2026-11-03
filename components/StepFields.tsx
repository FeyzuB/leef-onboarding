import { RichTextEditor } from '@/components/RichTextEditor';
import { Field, inputClass } from '@/components/ui';
import { formatLinks, toDateInput, type Link } from '@/lib/logic';

type StepDefaults = {
  module?: string;
  title?: string;
  explanation?: string;
  links?: Link[];
  contact?: string;
  contactRole?: string | null;
  doneWhen?: string;
  week?: number | null;
  dueDate?: Date | null;
};

/** The shared inputs for a template step or a plan step. Plan steps can also get a fixed date (`withDate`). */
export function StepFields({
  defaults = {},
  modules,
  listId,
  withDate = false,
}: {
  defaults?: StepDefaults;
  modules: string[];
  listId: string;
  withDate?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Module" hint="Pick an existing module or type a new one">
        <input name="module" required maxLength={120} list={listId} defaultValue={defaults.module} className={inputClass} />
        <datalist id={listId}>
          {modules.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>
      <Field label="Title">
        <input name="title" required maxLength={200} defaultValue={defaults.title} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Explanation" hint="Paste from Word or Outlook keeps bold, links, lists and colours. Use the box for e.g. a signature template.">
          <RichTextEditor name="explanation" defaultValue={defaults.explanation} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Links" hint='One per line: "Label | https://…" (usually a Confluence page)'>
          <textarea
            name="links"
            rows={2}
            maxLength={4000}
            defaultValue={defaults.links ? formatLinks(defaults.links) : ''}
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Contact" hint="The manager or buddy shows as the name set on each plan">
          <div className="flex gap-2">
            <select name="contactRole" defaultValue={defaults.contactRole ?? ''} className={`${inputClass} w-auto`}>
              <option value="">Name:</option>
              <option value="MANAGER">The manager</option>
              <option value="BUDDY">The buddy</option>
            </select>
            <input name="contact" maxLength={200} defaultValue={defaults.contact} placeholder="e.g. Eva Eigenberg (HR)" className={inputClass} />
          </div>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Done when">
          <textarea name="doneWhen" rows={2} maxLength={500} defaultValue={defaults.doneWhen} className={inputClass} />
        </Field>
      </div>
      <Field label="When" hint="Decides where the step shows for the new hire: Day 1, Week 1, Week 2, Weeks 3–4, Month 2, …">
        <select name="week" defaultValue={defaults.week ?? ''} className={inputClass}>
          <option value="">Anytime (no timing)</option>
          <option value="0">Day 1</option>
          {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
            <option key={week} value={week}>
              Week {week}
            </option>
          ))}
        </select>
      </Field>
      {withDate && (
        <Field label="Or on date" hint="A fixed date wins over the week">
          <input name="dueDate" type="date" defaultValue={defaults.dueDate ? toDateInput(defaults.dueDate) : ''} className={inputClass} />
        </Field>
      )}
    </div>
  );
}

export function StepLinks({ links }: { links: Link[] }) {
  if (!links.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.url}>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 underline hover:text-brand-800">
            {link.label} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}
