import type { Guide, Team } from '@prisma/client';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Field, inputClass } from '@/components/ui';
import { GUIDE_CATEGORIES } from '@/lib/guides';

/** Title, category, who it is for, and the text (with pasted screenshots). */
export function GuideFields({ guide, teams, isAdmin, ownTeamId }: { guide?: Guide; teams: Team[]; isAdmin: boolean; ownTeamId: string | null }) {
  const pickable = isAdmin ? teams : teams.filter((t) => t.id === ownTeamId);
  return (
    <div className="space-y-4">
      <Field label="Title">
        <input name="title" required maxLength={160} defaultValue={guide?.title} placeholder="e.g. Uren boeken in AFAS" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select name="category" defaultValue={guide?.category ?? 'HOW_TO'} className={inputClass}>
            {GUIDE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="For">
          <select name="teamId" defaultValue={guide?.teamId ?? ''} className={inputClass}>
            <option value="">Everyone</option>
            {pickable.map((team) => (
              <option key={team.id} value={team.id}>
                Only {team.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Text" hint="Paste a screenshot straight into the text, or use the image button.">
        <RichTextEditor name="body" defaultValue={guide?.body} />
      </Field>
    </div>
  );
}
