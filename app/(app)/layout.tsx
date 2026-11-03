import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [planCount, helpContacts] = await Promise.all([
    prisma.plan.count({ where: { newHireId: user.id } }),
    prisma.helpContact.findMany({ orderBy: { position: 'asc' } }),
  ]);
  const hasPlan = planCount > 0;
  return (
    <>
      <Nav user={user} hasPlan={hasPlan} helpContacts={helpContacts} />
      <div className="lg:pl-64">
        {/* Pages with a .page-wide element (Who is who) may use the full width. */}
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 has-[.page-wide]:max-w-[112rem]">{children}</main>
      </div>
    </>
  );
}
