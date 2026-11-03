import Link from 'next/link';
import { ArrowLeft, KeyRound, Sprout } from 'lucide-react';
import { changePassword } from '@/app/actions/auth';
import { StatefulForm, SubmitButton } from '@/components/forms';
import { Field, buttonClass, inputClass } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { MIN_PASSWORD_LENGTH } from '@/lib/forms';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowMustChange: true });
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      <div aria-hidden className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent-200/30 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white">
            <Sprout size={22} />
          </span>
          <span className="text-lg font-bold text-slate-900">Stadsbeheer Onboarding</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lift">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <KeyRound size={22} />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {user.mustChangePassword ? `Welcome, ${user.name.split(' ')[0]}` : 'Change your password'}
          </h1>
          <p className="mb-6 mt-1 text-sm text-slate-600">
            {user.mustChangePassword ? 'You are using a temporary password. Choose your own to continue.' : `Logged in as ${user.username}.`}
          </p>
          <StatefulForm action={changePassword} className="space-y-4">
            <Field label={user.mustChangePassword ? 'Temporary password' : 'Current password'}>
              <input name="current" type="password" autoComplete="current-password" required className={inputClass} />
            </Field>
            <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters`}>
              <input name="next" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
            </Field>
            <Field label="Repeat new password">
              <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
            </Field>
            <SubmitButton className={`${buttonClass} w-full py-2.5`}>Save password</SubmitButton>
          </StatefulForm>
        </div>
        {!user.mustChangePassword && (
          <Link href="/" className="mt-5 flex items-center justify-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
            <ArrowLeft size={15} /> Back to the portal
          </Link>
        )}
      </div>
    </main>
  );
}
