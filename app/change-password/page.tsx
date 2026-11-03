import Link from 'next/link';
import { changePassword } from '@/app/actions/auth';
import { StatefulForm, SubmitButton } from '@/components/forms';
import { Field, inputClass } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { MIN_PASSWORD_LENGTH } from '@/lib/forms';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowMustChange: true });
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Change your password</h1>
        <p className="mb-5 mt-1 text-sm text-slate-600">
          {user.mustChangePassword
            ? 'You are using a temporary password. Choose your own to continue.'
            : `Logged in as ${user.username}.`}
        </p>
        <StatefulForm action={changePassword} className="space-y-4">
          <Field label="Current password">
            <input name="current" type="password" autoComplete="current-password" required className={inputClass} />
          </Field>
          <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters`}>
            <input name="next" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
          </Field>
          <Field label="Repeat new password">
            <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
          </Field>
          <SubmitButton className="w-full rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
            Save password
          </SubmitButton>
        </StatefulForm>
        {!user.mustChangePassword && (
          <Link href="/" className="mt-4 block text-sm text-slate-600 hover:underline">
            ← Back
          </Link>
        )}
      </div>
    </main>
  );
}
