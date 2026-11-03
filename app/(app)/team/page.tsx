import type { TeamResource } from '@prisma/client';
import {
  AppWindow,
  BookOpen,
  Building2,
  Clock,
  Cloud,
  DoorOpen,
  ExternalLink,
  GitBranch,
  GraduationCap,
  Grid3x3,
  HeartHandshake,
  KeyRound,
  Laptop,
  Library,
  LifeBuoy,
  MapPin,
  MonitorPlay,
  Network,
  Pencil,
  Plus,
  Server,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { addResource, deleteResource, moveResource, updateResource } from '@/app/actions/team';
import { Drawer } from '@/components/Drawer';
import { MoveButtons, iconButtonClass } from '@/components/MoveButtons';
import { AddForm, ConfirmButton, SubmitButton } from '@/components/forms';
import { EmptyState, Field, PageHeader, buttonClass, inputClass } from '@/components/ui';
import { inScope, isAdmin, isLead, requireUser } from '@/lib/auth';
import { isSafeUrl } from '@/lib/logic';
import { prisma } from '@/lib/prisma';

// An icon per entry, guessed from words in its title (Dutch or English); a map pin when nothing matches.
const ICONS: [RegExp, typeof MapPin][] = [
  [/wachtwoord|password/i, KeyRound],
  [/broncode|source|gitlab|git\b/i, GitBranch],
  [/documentatie|documentation|confluence/i, BookOpen],
  [/software|app\b/i, AppWindow],
  [/onedrive|map(pen)?\b|folder/i, Cloud],
  [/wie is wie|who is who|organogram/i, Network],
  [/toegang tot kantoor|office access|badge/i, DoorOpen],
  [/kantoordag|office day/i, Building2],
  [/uren|hours/i, Clock],
  [/laptop|telefoon|phone/i, Laptop],
  [/\bhr\b/i, HeartHandshake],
  [/beveiliging|datalek|security/i, ShieldAlert],
  [/support|portaal|portal/i, LifeBuoy],
  [/demo/i, MonitorPlay],
  [/intake|omgeving|environment/i, Server],
  [/kennisbank|knowledge base/i, Library],
  [/kennismatrix/i, Grid3x3],
  [/training/i, GraduationCap],
];

function iconFor(title: string) {
  return ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? MapPin;
}

// Suggested groups; leads can type their own.
const CATEGORY_SUGGESTIONS = ['Development', 'Support & customers', 'Company'];

function ResourceFields({ resource, categories }: { resource?: TeamResource; categories: string[] }) {
  const listId = `categories-${resource?.id ?? 'new'}`;
  return (
    <div className="space-y-4">
      <Field label="Category" hint="Groups the tools on this page, e.g. Development or Company">
        <input name="category" maxLength={60} list={listId} defaultValue={resource?.category} className={inputClass} />
        <datalist id={listId}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="What">
        <input name="title" required maxLength={120} defaultValue={resource?.title} placeholder="e.g. Wachtwoorden" className={inputClass} />
      </Field>
      <Field label="Where">
        <input name="location" required maxLength={200} defaultValue={resource?.location} placeholder="e.g. KeePass" className={inputClass} />
      </Field>
      <Field label="Note">
        <textarea name="note" rows={3} maxLength={1000} defaultValue={resource?.note} className={inputClass} />
      </Field>
      <Field label="Link (optional)">
        <input name="url" type="url" maxLength={1000} defaultValue={resource?.url} placeholder="https://…" className={inputClass} />
      </Field>
    </div>
  );
}

function categoriesOf(resources: TeamResource[]): string[] {
  return [...new Set([...CATEGORY_SUGGESTIONS, ...resources.map((r) => r.category).filter(Boolean)])];
}

/** Tools grouped by category, in the order of their first tool; uncategorised ones last, as "Other". */
function groupByCategory(resources: TeamResource[]): { name: string; items: TeamResource[] }[] {
  const groups: { name: string; items: TeamResource[] }[] = [];
  for (const resource of resources) {
    const name = resource.category || 'Other';
    let group = groups.find((g) => g.name === name);
    if (!group) groups.push((group = { name, items: [] }));
    group.items.push(resource);
  }
  return groups.sort((a, b) => Number(a.name === 'Other') - Number(b.name === 'Other'));
}

export default async function TeamPage() {
  const user = await requireUser();
  const teams = await prisma.team.findMany({
    where: isAdmin(user) ? {} : { id: user.teamId ?? '' },
    include: { resources: { orderBy: { position: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader title="Tools" intro="The tools the team uses every day, one click away. How things work is in the Guides." />
      {teams.length === 0 && <EmptyState>You are not in a team yet.</EmptyState>}
      <div className="space-y-10">
        {teams.map((team) => {
          const canEdit = isLead(user) && inScope(user, team.id);
          return (
            <section key={team.id}>
              <div className="mb-4 flex items-center justify-between gap-2">
                {teams.length > 1 ? <h2 className="text-lg font-bold text-slate-900">{team.name}</h2> : <span />}
                {canEdit && (
                  <Drawer
                    key={`res-${team.resources.length}`}
                    title={`Add a tool${teams.length > 1 ? ` for ${team.name}` : ''}`}
                    triggerClassName={buttonClass}
                    trigger={
                      <>
                        <Plus size={16} /> Add tool
                      </>
                    }
                  >
                    <AddForm action={addResource} className="space-y-4">
                      <input type="hidden" name="teamId" value={team.id} />
                      <ResourceFields categories={categoriesOf(team.resources)} />
                      <SubmitButton>Add entry</SubmitButton>
                    </AddForm>
                  </Drawer>
                )}
              </div>
              {team.resources.length === 0 ? (
                <EmptyState>Nothing listed yet.</EmptyState>
              ) : (
                <div className="space-y-8">
                  {groupByCategory(team.resources).map((group) => (
                    <div key={group.name}>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{group.name}</h3>
                      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((resource) => {
                          const Icon = iconFor(resource.title);
                          return (
                            <li
                              key={resource.id}
                              className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:shadow-lift"
                            >
                              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                                <Icon size={20} />
                              </span>
                              <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                              {resource.url && isSafeUrl(resource.url) ? (
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 break-all text-sm font-medium text-brand-700 hover:underline"
                                >
                                  {resource.location} <ExternalLink size={13} className="shrink-0" />
                                </a>
                              ) : (
                                <p className="mt-1 break-words text-sm font-medium text-slate-700">{resource.location}</p>
                              )}
                              {resource.note && <p className="mt-2 text-sm text-slate-500">{resource.note}</p>}
                              {canEdit && (
                                <div className="absolute right-3 top-3 flex items-center rounded-lg bg-white/90 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                                  <MoveButtons action={moveResource} fields={{ resourceId: resource.id }} />
                                  <Drawer
                                    key={[resource.title, resource.location, resource.note, resource.url].join('|')}
                                    title="Edit entry"
                                    triggerClassName={iconButtonClass}
                                    triggerLabel="Edit entry"
                                    trigger={<Pencil size={15} />}
                                  >
                                    <form action={updateResource} className="space-y-4">
                                      <input type="hidden" name="resourceId" value={resource.id} />
                                      <ResourceFields resource={resource} categories={categoriesOf(team.resources)} />
                                      <SubmitButton>Save entry</SubmitButton>
                                    </form>
                                  </Drawer>
                                  <form action={deleteResource}>
                                    <input type="hidden" name="resourceId" value={resource.id} />
                                    <ConfirmButton
                                      message={`Delete “${resource.title}”?`}
                                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 size={15} aria-label="Delete entry" />
                                    </ConfirmButton>
                                  </form>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
