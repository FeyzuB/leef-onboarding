import Link from 'next/link';
import { ArrowLeft, Layers, UserRound, Users } from 'lucide-react';
import { createPlan } from '@/app/actions/plans';
import { SubmitButton } from '@/components/forms';
import { Card, CardTitle, EmptyState, Field, PageHeader, PersonSelect, buttonClass, inputClass } from '@/components/ui';
import { requireLead, teamScope } from '@/lib/auth';
import { APP_TIMEZONE } from '@/lib/config';
import { todayInput } from '@/lib/logic';
import { prisma } from '@/lib/prisma';

function BackLink() {
  return (
    <Link href="/overview" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
      <ArrowLeft size={15} /> Overview
    </Link>
  );
}

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

  if (!newHires.length || !templates.length) {
    return (
      <>
        <BackLink />
        <PageHeader title="New plan" />
        <EmptyState>
          {!newHires.length ? (
            <>
              Every new hire already has a plan. Create an account first on the{' '}
              <Link href="/people" className="font-medium text-brand-700 underline">
                People
              </Link>{' '}
              page.
            </>
          ) : (
            <>
              There is no template yet.{' '}
              <Link href="/templates" className="font-medium text-brand-700 underline">
                Create one first
              </Link>
              .
            </>
          )}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <PageHeader title="New plan" intro="The plan starts as a copy of the template. You can tailor it afterwards." />
      <form action={createPlan} className="grid max-w-4xl items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<UserRound size={15} />}>Who and what</CardTitle>
          <div className="space-y-4">
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
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Users size={15} />}>Who helps</CardTitle>
          <div className="space-y-4">
            <Field label="Lead" hint="The account that edits this plan.">
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
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100 lg:col-span-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
            <Layers size={20} />
          </span>
          <p className="min-w-0 flex-1 text-sm text-brand-900">
            All steps and goals of the template are copied, with dates counted from the start date.
          </p>
          <SubmitButton className={`${buttonClass} px-5`}>Create plan</SubmitButton>
        </div>
      </form>
    </>
  );
}
