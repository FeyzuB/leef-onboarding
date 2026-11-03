import Link from 'next/link';
import { ArrowRight, Layers, Plus } from 'lucide-react';
import { createTemplate } from '@/app/actions/templates';
import { Drawer } from '@/components/Drawer';
import { SubmitButton } from '@/components/forms';
import { Badge, EmptyState, Field, PageHeader, buttonClass, inputClass } from '@/components/ui';
import { isAdmin, requireLead, teamScope } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function TemplatesPage() {
  const actor = await requireLead();
  const [templates, roles, teams] = await Promise.all([
    prisma.template.findMany({
      where: teamScope(actor),
      include: { team: true, role: true, _count: { select: { steps: true, goals: true, plans: true } } },
      orderBy: { title: 'asc' },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({ where: isAdmin(actor) ? {} : { id: actor.teamId ?? '' }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="Templates"
        intro="One template per team and role. New plans start as a copy of it."
        actions={
          teams.length > 0 &&
          roles.length > 0 && (
            <Drawer
              key={`templates-${templates.length}`}
              title="New template"
              triggerClassName={buttonClass}
              trigger={
                <>
                  <Plus size={16} /> New template
                </>
              }
            >
              <form action={createTemplate} className="space-y-4">
                <Field label="Title">
                  <input name="title" required maxLength={120} className={inputClass} />
                </Field>
                <Field label="Role">
                  <select name="roleId" required className={inputClass}>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {isAdmin(actor) && (
                  <Field label="Team">
                    <select name="teamId" required defaultValue={actor.teamId ?? undefined} className={inputClass}>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <SubmitButton>Create template</SubmitButton>
                <p className="text-xs text-slate-500">If a template already exists for this team and role, you are taken to it.</p>
              </form>
            </Drawer>
          )
        }
      />
      {templates.length === 0 ? (
        <EmptyState>No templates yet.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/templates/${template.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Layers size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-slate-900 group-hover:text-brand-700">{template.title}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="brand">{template.team.name}</Badge>
                    <Badge>{template.role.name}</Badge>
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    {template._count.steps} steps · {template._count.goals} goals · used by {template._count.plans} plan{template._count.plans === 1 ? '' : 's'}
                  </p>
                </div>
                <ArrowRight size={18} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
