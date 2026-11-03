import Link from 'next/link';
import { ArrowRight, CircleAlert, Clock, Plus, RefreshCw, UserPlus } from 'lucide-react';
import { Avatar, Badge, EmptyState, PageHeader, ProgressRing, buttonClass } from '@/components/ui';
import { requireLead, teamScope } from '@/lib/auth';
import { APP_TIMEZONE } from '@/lib/config';
import { currentWeek, formatDate, nextStep, planStats } from '@/lib/logic';
import { prisma } from '@/lib/prisma';

export default async function OverviewPage() {
  const actor = await requireLead();
  const scope = teamScope(actor);

  const [plans, withoutPlan] = await Promise.all([
    prisma.plan.findMany({
      where: { newHire: { ...scope, active: true } },
      include: { newHire: { include: { team: true } }, lead: true, buddy: true, template: true, steps: true, goals: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.user.findMany({
      where: { ...scope, appRole: 'NEW_HIRE', active: true, plan: null },
      orderBy: { name: 'asc' },
    }),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Overview"
        intro="Where every new colleague is in their onboarding."
        actions={
          <Link href="/plans/new" className={buttonClass}>
            <Plus size={16} /> New plan
          </Link>
        }
      />

      {withoutPlan.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4">
          <UserPlus size={18} className="text-accent-600" />
          <p className="text-sm font-medium text-accent-700">Still without a plan:</p>
          {withoutPlan.map((user) => (
            <Link
              key={user.id}
              href={`/plans/new?userId=${user.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-accent-700 ring-1 ring-accent-200 hover:bg-accent-100"
            >
              {user.name} <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      )}

      {plans.length === 0 ? (
        <EmptyState>
          No onboarding plans yet. Create an account on the{' '}
          <Link href="/people" className="font-medium text-brand-700 underline">
            People
          </Link>{' '}
          page, then create their plan.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const stats = planStats(plan, now, APP_TIMEZONE);
            const behind = plan.template && plan.templateVersion < plan.template.version;
            const overdue = stats.overdueSteps + stats.overdueGoals;
            const week = currentWeek(plan.startDate, now, APP_TIMEZONE);
            const next = nextStep(plan.steps, plan.startDate);
            return (
              <li key={plan.id}>
                <Link
                  href={`/plans/${plan.id}`}
                  className="group block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
                >
                  <div className="flex items-start gap-4">
                    <Avatar name={plan.newHire.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold text-slate-900 group-hover:text-brand-700">{plan.newHire.name}</p>
                      <p className="text-sm text-slate-500">
                        {[plan.template?.title, plan.newHire.team?.name].filter(Boolean).join(' · ') || 'No template'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {week >= 1 ? `Week ${week}` : 'Not started yet'} · started {formatDate(plan.startDate)}
                        {(plan.buddy ?? plan.lead) && ` · buddy ${(plan.buddy ?? plan.lead)!.name}`}
                      </p>
                    </div>
                    <ProgressRing percent={stats.percent} size={60} />
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-500">Next up: </span>
                    <span className="font-medium text-slate-800">{next ? next.title : 'All steps done'}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500">
                      {stats.doneSteps}/{stats.totalSteps} steps · {stats.doneGoals}/{stats.totalGoals} goals
                    </span>
                    <span className="flex-1" />
                    {stats.blockedSteps > 0 && (
                      <Badge tone="red">
                        <CircleAlert size={12} /> {stats.blockedSteps} stuck
                      </Badge>
                    )}
                    {overdue > 0 && (
                      <Badge tone="amber">
                        <Clock size={12} /> {overdue} overdue
                      </Badge>
                    )}
                    {behind && (
                      <Badge tone="brand">
                        <RefreshCw size={12} /> Template updated
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
