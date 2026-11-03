import Link from 'next/link';
import { createPlan } from '@/app/actions/plans';
import { SubmitButton } from '@/components/forms';
import { Card, EmptyState, Field, PageHeader, PersonSelect, inputClass } from '@/components/ui';
import { requireLead, teamScope } from '@/lib/auth';
import { APP_TIMEZONE } from '@/lib/config';
import { todayInput } from '@/lib/logic';
import { prisma } from '@/lib/prisma';

export default async function NewPlanPage({ searchParams }: { searchParams: { userId?: string } }) {
  const actor = await requireLead();
  const scope = teamScope(actor);
  const [newHires, templates, leads, people] = await Promise.all([
    prisma.user.findMany({ where: { ...scope, appRole: 'NEW_HIRE', active: true, plan: null }, orderBy: { name: 'asc' } }),
    prisma.template.findMany({ where: scope, include: { team: true, role: true }, orderBy: { title: 'asc' } }),
    prisma.user.findMany({
      where: { active: true, OR: [{ appRole: 'ADMIN' }, { appRole: 'LEAD', ...scope }] },
      orderBy: { name: 'asc' },
    }),
    prisma.orgEntry.findMany({ orderBy: { name: 'asc' } }),
  ]);
  // The lead is usually the buddy too, so suggest them if they are on Who is who.
  const leadInOrg = people.find((p) => p.name.toLowerCase() === actor.name.toLowerCase());

  if (!newHires.length) {
    return (
      <>
        <PageHeader title="New plan" />
        <EmptyState>
          Every new hire already has a plan. Create an account first on the{' '}
          <Link href="/people" className="text-brand-700 underline">
            People
          </Link>{' '}
          page.
        </EmptyState>
      </>
    );
  }
  if (!templates.length) {
    return (
      <>
        <PageHeader title="New plan" />
        <EmptyState>
          There is no template yet.{' '}
          <Link href="/templates" className="text-brand-700 underline">
            Create one first
          </Link>
          .
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="New plan" intro="The plan starts as a copy of the template. You can tailor it afterwards." />
      <Card className="max-w-lg">
        <form action={createPlan} className="space-y-4">
          <Field label="New hire">
            <select name="newHireId" required defaultValue={searchParams.userId} className={inputClass}>
              {newHires.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Template">
            <select name="templateId" required className={inputClass}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} ({template.team.name} · {template.role.name})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" name="startDate" required defaultValue={todayInput(new Date(), APP_TIMEZONE)} className={inputClass} />
          </Field>
          <Field label="Lead">
            <select name="leadId" defaultValue={actor.id} className={inputClass}>
              <option value="">No lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </Field>
          <PersonSelect label="Manager" name="managerId" value={null} people={people} />
          <PersonSelect label="Buddy" name="buddyId" value={leadInOrg?.id ?? null} people={people} />
          <SubmitButton>Create plan</SubmitButton>
        </form>
      </Card>
    </>
  );
}
