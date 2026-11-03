import type { OrgEntry, Team } from '@prisma/client';
import { addOrgEntry, deleteOrgEntry, updateOrgEntry } from '@/app/actions/org';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/Drawer';
import { iconButtonClass } from '@/components/MoveButtons';
import { AddForm, ConfirmButton, SubmitButton } from '@/components/forms';
import { Avatar, Badge, EmptyState, Field, PageHeader, buttonClass, inputClass } from '@/components/ui';
import { isLead, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Entry = OrgEntry & { team: Team | null };

function EntryFields({ entry, entries, teams }: { entry?: Entry; entries: Entry[]; teams: Team[] }) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input name="name" required maxLength={120} defaultValue={entry?.name} className={inputClass} />
      </Field>
      <Field label="Job title">
        <input name="jobTitle" maxLength={120} defaultValue={entry?.jobTitle} className={inputClass} />
      </Field>
      <Field label="Team">
        <select name="teamId" defaultValue={entry?.teamId ?? ''} className={inputClass}>
          <option value="">No team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reports to">
        <select name="reportsToId" defaultValue={entry?.reportsToId ?? ''} className={inputClass}>
          <option value="">Nobody (top of the organisation)</option>
          {entries
            .filter((e) => e.id !== entry?.id)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.jobTitle ? ` (${e.jobTitle})` : ''}
              </option>
            ))}
        </select>
      </Field>
    </div>
  );
}

function Branch({
  entry,
  childrenOf,
  canEdit,
  entries,
  teams,
  depth,
}: {
  entry: Entry;
  childrenOf: Map<string | null, Entry[]>;
  canEdit: boolean;
  entries: Entry[];
  teams: Team[];
  depth: number;
}) {
  const reports = childrenOf.get(entry.id) ?? [];
  // Rendered inside an <li key={entry.id}> by the caller: keys on server components are not kept,
  // so the key must sit on a plain element or React matches cards by position and mixes up their forms.
  return (
    <>
      <div
        id={`person-${entry.id}`}
        className="group flex scroll-mt-24 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 pr-2 shadow-card transition target:border-brand-500 target:ring-2 target:ring-brand-500/30 sm:max-w-md"
      >
        <Avatar name={entry.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{entry.name}</p>
          {entry.jobTitle && <p className="truncate text-sm text-slate-600">{entry.jobTitle}</p>}
          {entry.team && (
            <p className="mt-1">
              <Badge tone="brand">{entry.team.name}</Badge>
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            {/* Rebuilt whenever the saved values change, so it never shows or re-saves stale values. */}
            <Drawer
              key={[entry.name, entry.jobTitle, entry.teamId, entry.reportsToId].join('|')}
              title={`Edit ${entry.name}`}
              triggerClassName={iconButtonClass}
              triggerLabel="Edit"
              trigger={<Pencil size={15} />}
            >
              <form action={updateOrgEntry} className="space-y-4">
                <input type="hidden" name="entryId" value={entry.id} />
                <EntryFields entry={entry} entries={entries} teams={teams} />
                <SubmitButton>Save</SubmitButton>
              </form>
            </Drawer>
            <form action={deleteOrgEntry}>
              <input type="hidden" name="entryId" value={entry.id} />
              <ConfirmButton
                message={`Remove ${entry.name}?${reports.length ? ' Their direct reports move up to their manager.' : ''}`}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} aria-label="Remove" />
              </ConfirmButton>
            </form>
          </div>
        )}
      </div>
      {reports.length > 0 && depth < 20 && (
        <ul className="ml-6 mt-3 space-y-3 border-l-2 border-brand-100 pl-5 sm:ml-7 sm:pl-7">
          {reports.map((child) => (
            <li key={child.id}>
              <Branch entry={child} childrenOf={childrenOf} canEdit={canEdit} entries={entries} teams={teams} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function OrganogramPage() {
  const user = await requireUser();
  const canEdit = isLead(user);
  const [entries, teams] = await Promise.all([
    prisma.orgEntry.findMany({ include: { team: true }, orderBy: { name: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const ids = new Set(entries.map((e) => e.id));
  const childrenOf = new Map<string | null, Entry[]>();
  for (const entry of entries) {
    const parent = entry.reportsToId && ids.has(entry.reportsToId) ? entry.reportsToId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), entry]);
  }
  const roots = childrenOf.get(null) ?? [];

  return (
    <>
      <PageHeader
        title="Who is who"
        intro="Who works here, what they do, and who they report to."
        actions={
          canEdit && (
            <Drawer
              key={`people-${entries.length}`}
              title="Add a person"
              triggerClassName={buttonClass}
              trigger={
                <>
                  <Plus size={16} /> Add person
                </>
              }
            >
              <AddForm action={addOrgEntry} className="space-y-4">
                <EntryFields entries={entries} teams={teams} />
                <SubmitButton>Add person</SubmitButton>
              </AddForm>
            </Drawer>
          )
        }
      />
      {entries.length === 0 ? (
        <EmptyState>{canEdit ? 'Nobody added yet. Start with the person at the top.' : 'The organogram is still empty.'}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {roots.map((entry) => (
            <li key={entry.id}>
              <Branch entry={entry} childrenOf={childrenOf} canEdit={canEdit} entries={entries} teams={teams} depth={0} />
            </li>
          ))}
        </ul>
      )}

    </>
  );
}
