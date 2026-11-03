import Link from 'next/link';
import type { AppRole } from '@prisma/client';
import { createUser, deleteUser, resetPassword, setUserActive, updateUser } from '@/app/actions/people';
import { KeyRound, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Drawer } from '@/components/Drawer';
import { iconButtonClass } from '@/components/MoveButtons';
import { ConfirmButton, StatefulForm, SubmitButton } from '@/components/forms';
import { Avatar, Badge, Field, PageHeader, buttonClass, inputClass, smallButtonClass } from '@/components/ui';
import { isAdmin, requireLead, teamScope } from '@/lib/auth';
import { MIN_PASSWORD_LENGTH } from '@/lib/forms';
import { prisma } from '@/lib/prisma';

const ROLE_LABELS: Record<AppRole, string> = {
  NEW_HIRE: 'New hire',
  LEAD: 'Lead',
  ADMIN: 'Admin',
};

export default async function PeoplePage() {
  const actor = await requireLead();
  const admin = isAdmin(actor);
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: teamScope(actor),
      include: { team: true, plan: { select: { id: true } } },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="People"
        intro="Create accounts for new colleagues and reset forgotten passwords."
        actions={
          <Drawer
            key={`users-${users.length}`}
            title="New account"
            triggerClassName={buttonClass}
            trigger={
              <>
                <UserPlus size={16} /> New account
              </>
            }
          >
            <StatefulForm action={createUser} className="space-y-4" resetOnSuccess>
              <Field label="Full name">
                <input name="name" required maxLength={100} className={inputClass} />
              </Field>
              <Field label="Username" hint="Lowercase, e.g. j.devries">
                <input name="username" required maxLength={50} pattern="[a-zA-Z0-9._\-]{3,50}" autoComplete="off" className={inputClass} />
              </Field>
              <Field label="Temporary password" hint={`At least ${MIN_PASSWORD_LENGTH} characters. They change it at first login.`}>
                <input name="password" type="text" required minLength={MIN_PASSWORD_LENGTH} autoComplete="off" className={inputClass} />
              </Field>
              {admin && (
                <>
                  <Field label="Role">
                    <select name="appRole" defaultValue="NEW_HIRE" className={inputClass}>
                      <option value="NEW_HIRE">New hire</option>
                      <option value="LEAD">Lead</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </Field>
                  <Field label="Team">
                    <select name="teamId" defaultValue={actor.teamId ?? ''} className={inputClass}>
                      <option value="">No team (admins only)</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <SubmitButton>Create account</SubmitButton>
            </StatefulForm>
          </Drawer>
        }
      />

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {users.map((user) => {
          const manageable = user.id !== actor.id && (admin || user.appRole === 'NEW_HIRE');
          return (
            <li key={user.id} className="px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={user.name} />
                  <div className="min-w-0">
                    <p className={`font-semibold ${user.active ? 'text-slate-900' : 'text-slate-400'}`}>
                      {user.name} <span className="text-sm font-normal text-slate-500">({user.username})</span>
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={user.appRole === 'NEW_HIRE' ? 'slate' : 'brand'}>{ROLE_LABELS[user.appRole]}</Badge>
                      {user.team && <Badge>{user.team.name}</Badge>}
                      {!user.active && <Badge tone="red">Deactivated</Badge>}
                      {user.mustChangePassword && user.active && <Badge tone="amber">Temporary password</Badge>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.appRole === 'NEW_HIRE' &&
                    (user.plan ? (
                      <Link href={`/plans/${user.plan.id}`} className={smallButtonClass}>
                        Open plan
                      </Link>
                    ) : (
                      <Link href={`/plans/new?userId=${user.id}`} className={smallButtonClass}>
                        Create plan
                      </Link>
                    ))}
                  {manageable && (
                    <Drawer
                      key={[user.name, user.appRole, user.teamId].join('|')}
                      title={`Edit ${user.name}`}
                      triggerClassName={iconButtonClass}
                      triggerLabel="Edit person"
                      trigger={<Pencil size={15} />}
                    >
                      <StatefulForm action={updateUser} className="space-y-4">
                        <input type="hidden" name="userId" value={user.id} />
                        <Field label="Full name">
                          <input name="name" required maxLength={100} defaultValue={user.name} className={inputClass} />
                        </Field>
                        {admin ? (
                          <>
                            <Field
                              label="Role"
                              hint={user.plan ? 'Has an onboarding plan, so stays a new hire until the plan is deleted.' : undefined}
                            >
                              <select name="appRole" defaultValue={user.appRole} className={inputClass}>
                                <option value="NEW_HIRE">New hire</option>
                                <option value="LEAD">Lead</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            </Field>
                            <Field label="Team">
                              <select name="teamId" defaultValue={user.teamId ?? ''} className={inputClass}>
                                <option value="">No team (admins only)</option>
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Username <span className="font-medium text-slate-700">{user.username}</span> · {ROLE_LABELS[user.appRole]}
                            {user.team && ` · ${user.team.name}`}. Ask an admin to change the role or team.
                          </p>
                        )}
                        <SubmitButton>Save</SubmitButton>
                      </StatefulForm>
                    </Drawer>
                  )}
                  {manageable && user.active && (
                    <Drawer
                      title={`Reset password for ${user.name}`}
                      triggerClassName={iconButtonClass}
                      triggerLabel="Reset password"
                      trigger={<KeyRound size={15} />}
                    >
                      <StatefulForm action={resetPassword} className="space-y-4" resetOnSuccess>
                        <input type="hidden" name="userId" value={user.id} />
                        <Field label="New temporary password" hint="They choose their own password at next login.">
                          <input name="password" type="text" required minLength={MIN_PASSWORD_LENGTH} autoComplete="off" className={inputClass} />
                        </Field>
                        <SubmitButton>Reset password</SubmitButton>
                      </StatefulForm>
                    </Drawer>
                  )}
                  {manageable && (
                    <form action={setUserActive}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="active" value={user.active ? 'false' : 'true'} />
                      <ConfirmButton
                        message={user.active ? `Deactivate ${user.name}? They can no longer log in.` : `Reactivate ${user.name}?`}
                        className={smallButtonClass}
                      >
                        {user.active ? 'Deactivate' : 'Reactivate'}
                      </ConfirmButton>
                    </form>
                  )}
                  {manageable && (
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={user.id} />
                      <ConfirmButton
                        message={`Delete ${user.name} permanently?${user.plan ? ' Their onboarding plan and all progress are deleted too.' : ''} This cannot be undone.`}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} aria-label="Delete" />
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
