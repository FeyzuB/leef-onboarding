import type { OrgEntry, Team } from '@prisma/client';
import { addOrgEntry, deleteOrgEntry, updateOrgEntry } from '@/app/actions/org';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/Drawer';
import { iconButtonClass } from '@/components/MoveButtons';
import { AddForm, ConfirmButton, SubmitButton } from '@/components/forms';
import { Avatar, Badge, EmptyState, Field, PageHeader, buttonClass, inputClass } from '@/components/ui';
import { isLead, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Entry = OrgEntry & { teams: Team[]; managedTeams: Team[] };

function TeamChecks({ label, name, teams, selected = [], hint }: { label: string; name: string; teams: Team[]; selected?: Team[]; hint?: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-slate-700">{label}</legend>
      {teams.length === 0 ? (
        <p className="text-sm text-slate-500">No teams yet. An admin adds them on Teams &amp; roles.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <label
              key={team.id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800"
            >
              <input
                type="checkbox"
                name={name}
                value={team.id}
                defaultChecked={selected.some((t) => t.id === team.id)}
                className="accent-brand-600"
              />
              {team.name}
            </label>
          ))}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </fieldset>
  );
}

function EntryFields({ entry, entries, teams }: { entry?: Entry; entries: Entry[]; teams: Team[] }) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input name="name" required maxLength={120} defaultValue={entry?.name} className={inputClass} />
      </Field>
      <Field label="Job title">
        <input name="jobTitle" maxLength={120} defaultValue={entry?.jobTitle} className={inputClass} />
      </Field>
      <TeamChecks label="Member of" name="teamIds" teams={teams} selected={entry?.teams} />
      <TeamChecks
        label="Manages"
        name="managedTeamIds"
        teams={teams}
        selected={entry?.managedTeams}
        hint="Leave empty if this person manages no team."
      />
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

type TreeProps = { childrenOf: Map<string | null, Entry[]>; canEdit: boolean; entries: Entry[]; teams: Team[] };

/** Edit and remove, shown on hover for leads. */
function EntryActions({ entry, reports, entries, teams }: { entry: Entry; reports: number; entries: Entry[]; teams: Team[] }) {
  return (
    <div className="flex shrink-0 items-center rounded-lg bg-white/90 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
      {/* Rebuilt whenever the saved values change, so it never shows or re-saves stale values. */}
      <Drawer
        key={[entry.name, entry.jobTitle, entry.reportsToId, ...entry.teams.map((t) => t.id), '/', ...entry.managedTeams.map((t) => t.id)].join('|')}
        title={`Edit ${entry.name}`}
        triggerClassName={iconButtonClass}
        triggerLabel="Edit"
        trigger={<Pencil size={14} />}
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
          message={`Remove ${entry.name}?${reports ? ' Their direct reports move up to their manager.' : ''}`}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} aria-label="Remove" />
        </ConfirmButton>
      </form>
    </div>
  );
}

/** A person as a card in the chart: avatar on top, name, job title and team. */
function PersonCard({ entry, reports, tree }: { entry: Entry; reports: number; tree: TreeProps }) {
  return (
    <div
      id={`person-${entry.id}`}
      className="group relative mx-auto flex w-full max-w-[13rem] scroll-mt-24 flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-3 pb-3 pt-4 text-center shadow-card transition target:border-brand-500 target:ring-2 target:ring-brand-500/30"
    >
      {tree.canEdit && (
        <div className="absolute right-1 top-1">
          <EntryActions entry={entry} reports={reports} entries={tree.entries} teams={tree.teams} />
        </div>
      )}
      <Avatar name={entry.name} size="lg" />
      <p className="mt-2 line-clamp-2 w-full break-words font-semibold text-slate-900">{entry.name}</p>
      {entry.jobTitle && <p className="line-clamp-2 text-xs text-slate-600">{entry.jobTitle}</p>}
      {(entry.teams.length > 0 || entry.managedTeams.length > 0) && (
        <p className="mt-1.5 flex flex-wrap justify-center gap-1">
          {entry.managedTeams.map((team) => (
            <Badge key={`m-${team.id}`} tone="accent">
              Manages {team.name}
            </Badge>
          ))}
          {entry.teams
            .filter((team) => !entry.managedTeams.some((m) => m.id === team.id))
            .map((team) => (
              <Badge key={team.id} tone="brand">
                {team.name}
              </Badge>
            ))}
        </p>
      )}
    </div>
  );
}

/** A person without reports, as a compact row in a manager's team box. */
function PersonRow({ entry, manager, tree }: { entry: Entry; manager: Entry; tree: TreeProps }) {
  // The box already says which team its manager runs; only show teams that tell something extra:
  // all of them when someone is in several teams, or the one team when it differs from the manager's.
  const managerTeams = new Set([...manager.teams, ...manager.managedTeams].map((t) => t.id));
  const showTeams = entry.teams.length > 1 || entry.teams.some((t) => !managerTeams.has(t.id));
  return (
    <div
      id={`person-${entry.id}`}
      className="group relative flex scroll-mt-24 items-center gap-2.5 rounded-xl bg-white px-2.5 py-2 ring-1 ring-slate-200/80 transition target:ring-2 target:ring-brand-500"
    >
      <Avatar name={entry.name} size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <p className="line-clamp-2 break-words text-sm font-semibold text-slate-900">{entry.name}</p>
        {entry.jobTitle && <p className="line-clamp-2 text-xs text-slate-500">{entry.jobTitle}</p>}
        {showTeams && (
          <p className="mt-1 flex flex-wrap gap-1">
            {entry.teams.map((team) => (
              <Badge key={team.id} tone="brand">
                {team.name}
              </Badge>
            ))}
          </p>
        )}
        {entry.managedTeams.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {entry.managedTeams.map((team) => (
              <Badge key={team.id} tone="accent">
                Manages {team.name}
              </Badge>
            ))}
          </p>
        )}
      </div>
      {tree.canEdit && (
        <div className="absolute inset-y-0 right-1 flex items-center">
          <EntryActions entry={entry} reports={0} entries={tree.entries} teams={tree.teams} />
        </div>
      )}
    </div>
  );
}

const line = 'bg-brand-200';

/**
 * One person and everyone below them, top-down. Managers whose reports have no reports of their own
 * get those reports as a stacked list, so wide teams stay readable instead of one long row.
 * Rendered inside an <li key={entry.id}>: keys on server components are not kept.
 */
function Node({ entry, tree, depth }: { entry: Entry; tree: TreeProps; depth: number }) {
  const reports = tree.childrenOf.get(entry.id) ?? [];
  const leavesOnly = reports.every((r) => !(tree.childrenOf.get(r.id) ?? []).length);
  return (
    <div className="flex w-full flex-col items-center">
      <PersonCard entry={entry} reports={reports.length} tree={tree} />
      {reports.length > 0 && depth < 20 && (
        <>
          <div className={`h-5 w-px ${line}`} />
          {leavesOnly ? (
            <ul className="w-full max-w-[15rem] space-y-1.5 rounded-2xl bg-brand-50/60 p-2 ring-1 ring-brand-100">
              {reports.map((child) => (
                <li key={child.id}>
                  <PersonRow entry={child} manager={entry} tree={tree} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex w-full justify-center">
              {reports.map((child) => (
                <li
                  key={child.id}
                  className={`relative min-w-0 max-w-[16rem] flex-1 basis-0 px-1.5 pt-5 before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-brand-200 after:absolute after:left-1/2 after:top-0 after:h-5 after:w-px after:bg-brand-200 first:before:left-1/2 last:before:right-1/2 only:before:hidden`}
                >
                  <Node entry={child} tree={tree} depth={depth + 1} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default async function OrganogramPage() {
  const user = await requireUser();
  const canEdit = isLead(user);
  const [entries, teams] = await Promise.all([
    prisma.orgEntry.findMany({
      include: { teams: { orderBy: { name: 'asc' } }, managedTeams: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const ids = new Set(entries.map((e) => e.id));
  const childrenOf = new Map<string | null, Entry[]>();
  for (const entry of entries) {
    const parent = entry.reportsToId && ids.has(entry.reportsToId) ? entry.reportsToId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), entry]);
  }
  const roots = childrenOf.get(null) ?? [];
  // People at the top with reports form the chart; people at the top on their own (e.g. HR and finance
  // from the parent company) are listed separately. With only loose people, they form the chart.
  const withReports = roots.filter((r) => (childrenOf.get(r.id) ?? []).length > 0);
  const trees = withReports.length ? withReports : roots;
  const loose = withReports.length ? roots.filter((r) => !withReports.includes(r)) : [];
  const tree: TreeProps = { childrenOf, canEdit, entries, teams };

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
        <>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-4">
            <ul className="flex min-w-[38rem] justify-center gap-10 py-2">
              {trees.map((entry) => (
                <li key={entry.id} className="min-w-0 flex-1">
                  <Node entry={entry} tree={tree} depth={0} />
                </li>
              ))}
            </ul>
          </div>
          {loose.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Also good to know</h2>
              <p className="mb-4 text-sm text-slate-600">People outside the reporting line who you may work with.</p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loose.map((entry) => (
                  <li key={entry.id}>
                    <PersonCard entry={entry} reports={0} tree={tree} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
