import { PlanView } from '@/components/PlanView';
import { EmptyState, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function MyPlanPage() {
  const user = await requireUser();
  const plan = await prisma.plan.findUnique({
    where: { newHireId: user.id },
    include: { steps: { where: { removed: false } }, goals: { where: { removed: false } }, lead: true, manager: true, buddy: true },
  });
  const people = await prisma.orgEntry.findMany({ select: { id: true, name: true } });

  if (!plan) {
    return (
      <>
        <PageHeader title="Your onboarding plan" />
        <EmptyState>You don&apos;t have an onboarding plan yet. Your lead will set one up for you.</EmptyState>
      </>
    );
  }

  const supporters = [
    plan.manager && { role: 'Manager', name: plan.manager.name },
    (plan.buddy ?? plan.lead) && { role: plan.buddy ? 'Buddy' : 'Lead', name: (plan.buddy ?? plan.lead)!.name },
  ].filter(Boolean) as { role: string; name: string }[];

  return (
    <PlanView
      firstName={user.name.split(' ')[0]}
      startDate={plan.startDate}
      steps={plan.steps}
      goals={plan.goals}
      planId={plan.id}
      manager={plan.manager}
      buddy={plan.buddy}
      supporters={supporters}
      people={people}
    />
  );
}
