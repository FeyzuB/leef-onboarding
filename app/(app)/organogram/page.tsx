import type { OrgEntry, Team } from '@prisma/client';
import { addOrgEntry, deleteOrgEntry, updateOrgEntry } from '@/app/actions/org';
import type { ReactNode } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
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

/** A person as a card in the chart: avatar on top, name, job title and teams. */
function PersonCard({ entry, reports, tree }: { entry: Entry; reports: number; tree: TreeProps }) {
  return (
    <div
      id={`person-${entry.id}`}
      className="group relative mx-auto flex w-full max-w-[17rem] scroll-mt-24 flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-4 pb-4 pt-5 text-center shadow-card transition target:border-brand-500 target:ring-2 target:ring-brand-500/30"
    >
      {tree.canEdit && (
        <div className="absolute right-1.5 top-1.5">
          <EntryActions entry={entry} reports={reports} entries={tree.entries} teams={tree.teams} />
        </div>
      )}
      <Avatar name={entry.name} size="lg" />
      <p className="mt-2.5 line-clamp-2 w-full break-words text-base font-semibold text-slate-900">{entry.name}</p>
      {entry.jobTitle && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{entry.jobTitle}</p>}
      {(entry.teams.length > 0 || entry.managedTeams.length > 0) && (
        <p className="mt-2 flex flex-wrap justify-center gap-1">
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

/** A person without reports, as a row in a team box. Only the first appearance carries the #person- anchor. */
function PersonRow({ entry, boxTeamId, anchor, tree }: { entry: Entry; boxTeamId: string | null; anchor: boolean; tree: TreeProps }) {
  // The box already names its team; show the person's other teams, and what they manage.
  const otherTeams = entry.teams.filter((t) => t.id !== boxTeamId);
  return (
    <div
      id={anchor ? `person-${entry.id}` : undefined}
      className="group relative flex scroll-mt-24 items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/80 transition target:ring-2 target:ring-brand-500"
    >
      <Avatar name={entry.name} />
      <div className="min-w-0 flex-1 text-left">
        <p className="line-clamp-2 break-words text-sm font-semibold text-slate-900">{entry.name}</p>
        {entry.jobTitle && <p className="line-clamp-2 text-xs text-slate-500">{entry.jobTitle}</p>}
        {(otherTeams.length > 0 || entry.managedTeams.length > 0) && (
          <p className="mt-1 flex flex-wrap gap-1">
            {entry.managedTeams.map((team) => (
              <Badge key={`m-${team.id}`} tone="accent">
                Manages {team.name}
              </Badge>
            ))}
            {otherTeams.map((team) => (
              <Badge key={team.id} tone="brand">
                Also {team.name}
              </Badge>
            ))}
          </p>
        )}
      </div>
      {tree.canEdit && (
        <div className="absolute inset-y-0 right-1.5 flex items-center">
          <EntryActions entry={entry} reports={0} entries={tree.entries} teams={tree.teams} />
        </div>
      )}
    </div>
  );
}

type Group = { key: string; teamId: string | null; label: string | null; members: Entry[] };

/**
 * A manager's reports without reports of their own, grouped by the teams the manager runs.
 * Someone in two of those teams shows in both; reports outside them go in one extra group.
 */
function leafGroups(manager: Entry, leaves: Entry[]): Group[] {
  const groups: Group[] = [];
  const placed = new Set<string>();
  for (const team of manager.managedTeams) {
    const members = leaves.filter((l) => l.teams.some((t) => t.id === team.id));
    if (!members.length) continue;
    groups.push({ key: team.id, teamId: team.id, label: team.name, members });
    members.forEach((m) => placed.add(m.id));
  }
  const rest = leaves.filter((l) => !placed.has(l.id));
  if (rest.length) groups.push({ key: 'direct', teamId: null, label: groups.length ? 'Other direct reports' : 'Team', members: rest });
  return groups;
}

function TeamBox({ group, anchored, tree }: { group: Group; anchored: Set<string>; tree: TreeProps }) {
  return (
    <section className="w-full rounded-2xl bg-brand-50/70 p-2.5 ring-1 ring-brand-100">
      {group.label && (
        <h4 className="mb-2 flex items-center justify-between gap-2 px-1.5 pt-0.5 text-xs font-semibold uppercase tracking-wider text-brand-800">
          <span className="flex items-center gap-1.5">
            <Users size={13} /> {group.label}
          </span>
          <span className="font-medium normal-case tracking-normal text-brand-700/70">{group.members.length}</span>
        </h4>
      )}
      <ul className="space-y-2">
        {group.members.map((member) => {
          const anchor = !anchored.has(member.id);
          anchored.add(member.id);
          return (
            <li key={member.id}>
              <PersonRow entry={member} boxTeamId={group.teamId} anchor={anchor} tree={tree} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const hasReports = (entry: Entry, tree: TreeProps) => (tree.childrenOf.get(entry.id) ?? []).length > 0;

/** How many columns a person's branch needs, so wide branches get more room. */
function units(entry: Entry, tree: TreeProps): number {
  const reports = tree.childrenOf.get(entry.id) ?? [];
  if (!reports.length) return 1;
  const managers = reports.filter((r) => hasReports(r, tree));
  const groups = leafGroups(
    entry,
    reports.filter((r) => !hasReports(r, tree)),
  ).length;
  return Math.max(1, groups + managers.reduce((n, m) => n + units(m, tree), 0));
}

const UNIT_MIN = 12; // rem
const UNIT_MAX = 21; // rem

function columnStyle(n: number) {
  return { flexGrow: n, flexBasis: 0, minWidth: `${n * UNIT_MIN}rem`, maxWidth: `${n * UNIT_MAX}rem` };
}

/** A column hanging from the line above it. */
function Column({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li
      style={columnStyle(n)}
      className="relative px-3 pt-7 before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-brand-200 after:absolute after:left-1/2 after:top-0 after:h-7 after:w-px after:bg-brand-200 first:before:left-1/2 last:before:right-1/2 only:before:hidden"
    >
      {children}
    </li>
  );
}

/**
 * One person and everyone below them, top-down. Reports who lead others get their own branch;
 * the rest sit in boxes per team the person manages. Each box and branch gets its own column on the line.
 * Rendered inside an <li key={entry.id}>: keys on server components are not kept.
 */
function Node({ entry, tree, depth, anchored }: { entry: Entry; tree: TreeProps; depth: number; anchored: Set<string> }) {
  const reports = tree.childrenOf.get(entry.id) ?? [];
  const managers = reports.filter((r) => hasReports(r, tree));
  const groups = leafGroups(
    entry,
    reports.filter((r) => !hasReports(r, tree)),
  );
  return (
    <div className="flex w-full flex-col items-center">
      <PersonCard entry={entry} reports={reports.length} tree={tree} />
      {reports.length > 0 && depth < 20 && (
        <>
          <div className="h-7 w-px bg-brand-200" />
          <ul className="flex w-full justify-center">
            {/* Every team box and every branch hangs from this person's line in its own column. */}
            {groups.map((group) => (
              <Column key={group.key} n={1}>
                <TeamBox group={group} anchored={anchored} tree={tree} />
              </Column>
            ))}
            {managers.map((child) => (
              <Column key={child.id} n={units(child, tree)}>
                <Node entry={child} tree={tree} depth={depth + 1} anchored={anchored} />
              </Column>
            ))}
          </ul>
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
  // Someone in two team boxes gets the #person- anchor (used by step contacts) only once.
  const anchored = new Set<string>();

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
          <div className="page-wide no-scrollbar -mx-4 overflow-x-auto px-4 pb-4">
            <ul className="flex justify-center gap-12 py-2">
              {trees.map((entry) => (
                <li key={entry.id} style={columnStyle(units(entry, tree))}>
                  <Node entry={entry} tree={tree} depth={0} anchored={anchored} />
                </li>
              ))}
            </ul>
          </div>
          {loose.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Also good to know</h2>
              <p className="mb-4 text-sm text-slate-600">People outside the reporting line who you may work with.</p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
