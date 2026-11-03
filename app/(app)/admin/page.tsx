import type { ReactNode } from 'react';
import { addRole, addTeam, deleteRole, deleteTeam, renameRole, renameTeam } from '@/app/actions/admin';
import { ConfirmButton, StatefulForm, SubmitButton } from '@/components/forms';
import type { FormState } from '@/lib/forms';
import { Badge, Card, EmptyState, PageHeader, dangerButtonClass, inputClass, secondaryButtonClass, smallButtonClass } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Row = { id: string; name: string; usage: string[] };

function List({
  rows,
  noun,
  rename,
  remove,
  add,
}: {
  rows: Row[];
  noun: string;
  rename: (state: FormState, form: FormData) => Promise<FormState>;
  remove: (form: FormData) => Promise<void>;
  add: (state: FormState, form: FormData) => Promise<FormState>;
}) {
  return (
    <>
      {rows.length === 0 ? (
        <EmptyState>No {noun}s yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="mt-0.5 space-x-1">
                    {row.usage.length ? row.usage.map((u) => <Badge key={u}>{u}</Badge>) : <span className="text-xs text-slate-400">Not used yet</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <details className="relative">
                    <summary className={`${smallButtonClass} cursor-pointer list-none`}>Rename</summary>
                    <StatefulForm key={row.name} action={rename} className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded border border-slate-200 bg-white p-2 shadow">
                      <input type="hidden" name="id" value={row.id} />
                      <div className="flex gap-2">
                        <input name="name" required maxLength={80} defaultValue={row.name} className={inputClass} aria-label={`New name for ${row.name}`} />
                        <SubmitButton className={smallButtonClass}>Save</SubmitButton>
                      </div>
                    </StatefulForm>
                  </details>
                  {row.usage.length === 0 ? (
                    <form action={remove}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmButton message={`Delete the ${noun} "${row.name}"?`} className={dangerButtonClass}>
                        Delete
                      </ConfirmButton>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-400" title={`A ${noun} in use can't be deleted`}>
                      In use
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <StatefulForm action={add} className="mt-4 space-y-2 border-t border-slate-100 pt-4" resetOnSuccess>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">New {noun}</span>
          <div className="flex gap-2">
            <input name="name" required maxLength={80} className={inputClass} />
            <SubmitButton className={secondaryButtonClass}>Add</SubmitButton>
          </div>
        </label>
      </StatefulForm>
    </>
  );
}

function count(n: number, singular: string, plural = `${singular}s`): string[] {
  return n ? [`${n} ${n === 1 ? singular : plural}`] : [];
}

function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mb-3 mt-1 text-sm text-slate-600">{intro}</p>
      {children}
    </Card>
  );
}

export default async function AdminPage() {
  await requireAdmin();
  const [teams, roles] = await Promise.all([
    prisma.team.findMany({
      include: { _count: { select: { users: true, templates: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.role.findMany({ include: { _count: { select: { templates: true } } }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader title="Teams & roles" intro="Templates are made per team and role. Add a team here, then create its lead on the People page." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Teams" intro="Each team has its own people, templates and Where to find things page.">
          <List
            noun="team"
            rows={teams.map((t) => ({
              id: t.id,
              name: t.name,
              usage: [...count(t._count.users, 'person', 'people'), ...count(t._count.templates, 'template')],
            }))}
            rename={renameTeam}
            remove={deleteTeam}
            add={addTeam}
          />
        </Section>
        <Section title="Roles" intro="Roles like Developer or Tester. One template per team and role.">
          <List
            noun="role"
            rows={roles.map((r) => ({ id: r.id, name: r.name, usage: count(r._count.templates, 'template') }))}
            rename={renameRole}
            remove={deleteRole}
            add={addRole}
          />
        </Section>
      </div>
    </>
  );
}
