import { redirect } from 'next/navigation';
import { isLead, requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireUser();
  redirect(isLead(user) ? '/overview' : '/my-plan');
}
