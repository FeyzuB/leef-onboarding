import Link from 'next/link';
import { ArrowRight, BookOpen, ClipboardList, LifeBuoy, Plus, Search } from 'lucide-react';
import { addGuide } from '@/app/actions/guides';
import { Drawer } from '@/components/Drawer';
import { GuideFields } from '@/components/GuideFields';
import { HelpContacts } from '@/components/HelpContacts';
import { SubmitButton } from '@/components/forms';
import { Badge, Card, CardTitle, EmptyState, PageHeader, buttonClass, inputClass, secondaryButtonClass } from '@/components/ui';
import { isAdmin, isLead, requireUser } from '@/lib/auth';
import { GUIDE_CATEGORIES, visibleGuides } from '@/lib/guides';
import { prisma } from '@/lib/prisma';
import { toPlainText } from '@/lib/richText';

const ICON = { HOW_TO: BookOpen, PRACTICAL: ClipboardList } as const;

export default async function GuidesPage(props: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await props.searchParams;
  const user = await requireUser();
  const canEdit = isLead(user);
  const search = q.trim().slice(0, 100);
  const [guides, contacts, teams] = await Promise.all([
    prisma.guide.findMany({
      where: {
        AND: [
          visibleGuides(user),
          search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { body: { contains: search, mode: 'insensitive' } }] } : {},
        ],
      },
      include: { team: true },
      orderBy: { title: 'asc' },
    }),
    prisma.helpContact.findMany({ orderBy: { position: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="Guides"
        intro="How things work at Stadsbeheer, step by step."
        actions={
          canEdit && (
            <Drawer
              wide
              key={`guides-${guides.length}`}
              title="New guide"
              triggerClassName={buttonClass}
              trigger={
                <>
                  <Plus size={16} /> New guide
                </>
              }
            >
              <form action={addGuide} className="space-y-4">
                <GuideFields teams={teams} isAdmin={isAdmin(user)} ownTeamId={user.teamId} />
                <SubmitButton>Create guide</SubmitButton>
              </form>
            </Drawer>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <form method="get" className="flex gap-2">
            <label className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={search}
                placeholder="Search the guides, e.g. VPN or uren"
                aria-label="Search the guides"
                className={`${inputClass} pl-9`}
              />
            </label>
            <button type="submit" className={secondaryButtonClass}>
              Search
            </button>
            {search && (
              <Link href="/guides" className={secondaryButtonClass}>
                Clear
              </Link>
            )}
          </form>

          {guides.length === 0 && <EmptyState>{search ? `No guide mentions “${search}”.` : 'No guides yet.'}</EmptyState>}

          {GUIDE_CATEGORIES.map((category) => {
            const items = guides.filter((g) => g.category === category.value);
            if (!items.length) return null;
            const Icon = ICON[category.value];
            return (
              <section key={category.value}>
                <h2 className="text-lg font-bold text-slate-900">{category.label}</h2>
                <p className="mb-3 text-sm text-slate-500">{category.intro}</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((guide) => {
                    const excerpt = toPlainText(guide.body);
                    return (
                      <li key={guide.id}>
                        <Link
                          href={`/guides/${guide.id}`}
                          className="group flex h-full items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                            <Icon size={19} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 group-hover:text-brand-700">{guide.title}</p>
                            {excerpt && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{excerpt}</p>}
                            {guide.team && (
                              <p className="mt-1.5">
                                <Badge>Only {guide.team.name}</Badge>
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            size={16}
                            className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <Card className="lg:sticky lg:top-6">
          <CardTitle icon={<LifeBuoy size={14} />}>Need help?</CardTitle>
          <p className="-mt-1 mb-3 text-sm text-slate-600">Who to contact for what. Also behind the help button in the menu.</p>
          <HelpContacts contacts={contacts} canEdit={canEdit} />
        </Card>
      </div>
    </>
  );
}
