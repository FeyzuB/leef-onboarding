import type { ReactNode } from 'react';
import { BadgeCheck, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { addRole, addTeam, deleteRole, deleteTeam, renameRole, renameTeam } from '@/app/actions/admin';
import { Drawer } from '@/components/Drawer';
import { iconButtonClass } from '@/components/MoveButtons';
import { ConfirmButton, StatefulForm, SubmitButton } from '@/components/forms';
import type { FormState } from '@/lib/forms';
import { Badge, Card, CardTitle, EmptyState, Field, PageHeader, inputClass, secondaryButtonClass } from '@/components/ui';
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
        <ul className="-mx-2 space-y-1">
          {rows.map((row) => (
            <li key={row.id} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
                {row.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{row.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-1">
                  {row.usage.length ? row.usage.map((u) => <Badge key={u}>{u}</Badge>) : <span className="text-xs text-slate-400">Not used yet</span>}
                </p>
              </div>
              <div className="flex items-center opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <Drawer
                  key={row.name}
                  title={`Rename ${noun}`}
                  triggerClassName={iconButtonClass}
                  triggerLabel={`Rename ${row.name}`}
                  trigger={<Pencil size={15} />}
                >
                  <StatefulForm action={rename} className="space-y-4">
                    <input type="hidden" name="id" value={row.id} />
                    <Field label="Name">
                      <input name="name" required maxLength={80} defaultValue={row.name} className={inputClass} />
                    </Field>
                    <SubmitButton>Save name</SubmitButton>
                  </StatefulForm>
                </Drawer>
                {row.usage.length === 0 ? (
                  <form action={remove}>
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmButton
                      message={`Delete the ${noun} "${row.name}"?`}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} aria-label={`Delete ${row.name}`} />
                    </ConfirmButton>
                  </form>
                ) : (
                  <span className="cursor-help p-1.5 text-slate-300" title={`A ${noun} in use can't be deleted`}>
                    <Trash2 size={15} aria-label={`A ${noun} in use can't be deleted`} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <StatefulForm action={add} className="mt-4 border-t border-slate-100 pt-4" resetOnSuccess>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">New {noun}</span>
          <div className="flex gap-2">
            <input name="name" required maxLength={80} className={inputClass} />
            <SubmitButton className={secondaryButtonClass}>
              <Plus size={15} /> Add
            </SubmitButton>
          </div>
        </label>
      </StatefulForm>
    </>
  );
}

function count(n: number, singular: string, plural = `${singular}s`): string[] {
  return n ? [`${n} ${n === 1 ? singular : plural}`] : [];
}

function Section({ title, icon, intro, children }: { title: string; icon: ReactNode; intro: string; children: ReactNode }) {
  return (
    <Card>
      <CardTitle icon={icon}>{title}</CardTitle>
      <p className="mb-4 text-sm text-slate-600">{intro}</p>
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
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Section title="Teams" icon={<Users size={15} />} intro="Each team has its own people, templates and Where to find things page.">
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
        <Section title="Roles" icon={<BadgeCheck size={15} />} intro="Roles like Developer or Tester. One template per team and role.">
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
