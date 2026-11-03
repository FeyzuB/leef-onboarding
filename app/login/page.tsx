import { redirect } from 'next/navigation';
import { Compass, Sprout, Target, Users } from 'lucide-react';
import { login } from '@/app/actions/auth';
import { StatefulForm, SubmitButton } from '@/components/forms';
import { Field, buttonClass, inputClass } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const highlights = [
  { icon: <Target size={18} />, text: 'Your personal plan, week by week' },
  { icon: <Users size={18} />, text: 'Know who to ask for what' },
  { icon: <Compass size={18} />, text: 'Find your way around Stadsbeheer' },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Sprout size={24} />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold uppercase tracking-wider text-accent-200">Stadsbeheer</span>
            <span className="block text-lg font-bold">Onboarding</span>
          </span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Grow into your new role.</h1>
          <p className="mt-4 text-brand-100">Everything you need for your first weeks and months at Stadsbeheer, in one place.</p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-sm text-brand-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200">Stadsbeheer · Zwolle</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white">
              <Sprout size={22} />
            </span>
            <span className="text-lg font-bold">Stadsbeheer Onboarding</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mb-8 mt-1.5 text-sm text-slate-600">Log in with the account your lead created for you.</p>
          <StatefulForm action={login} className="space-y-4">
            <Field label="Username">
              <input name="username" autoComplete="username" required autoFocus className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
            </Field>
            <SubmitButton className={`${buttonClass} w-full py-2.5`}>Log in</SubmitButton>
          </StatefulForm>
          <p className="mt-6 text-xs text-slate-500">Forgot your password? Ask your lead to reset it.</p>
        </div>
      </section>
    </main>
  );
}
