import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { deleteGuide, updateGuide } from '@/app/actions/guides';
import { Drawer } from '@/components/Drawer';
import { GuideFields } from '@/components/GuideFields';
import { RichText } from '@/components/RichText';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { Badge, Card, dangerButtonClass, secondaryButtonClass } from '@/components/ui';
import { isAdmin, requireUser } from '@/lib/auth';
import { APP_TIMEZONE } from '@/lib/config';
import { canEditGuide, canSeeGuide, categoryLabel } from '@/lib/guides';
import { formatDate } from '@/lib/logic';
import { prisma } from '@/lib/prisma';

export default async function GuidePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser();
  const guide = await prisma.guide.findUnique({ where: { id }, include: { team: true } });
  if (!guide || !canSeeGuide(user, guide)) notFound();
  const canEdit = canEditGuide(user, guide);
  const teams = canEdit ? await prisma.team.findMany({ orderBy: { name: 'asc' } }) : [];

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/guides" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <ArrowLeft size={15} /> Guides
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{guide.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge tone="brand">{categoryLabel(guide.category)}</Badge>
            <Badge>{guide.team ? `Only ${guide.team.name}` : 'For everyone'}</Badge>
            <span>Updated {formatDate(guide.updatedAt, APP_TIMEZONE)}</span>
          </p>
        </div>
        {canEdit && (
          <Drawer
            wide
            key={guide.updatedAt.toISOString()}
            title="Edit guide"
            triggerClassName={secondaryButtonClass}
            trigger={
              <>
                <Pencil size={15} /> Edit
              </>
            }
          >
            <form action={updateGuide} className="space-y-4">
              <input type="hidden" name="guideId" value={guide.id} />
              <GuideFields guide={guide} teams={teams} isAdmin={isAdmin(user)} ownTeamId={user.teamId} />
              <SubmitButton>Save guide</SubmitButton>
            </form>
          </Drawer>
        )}
      </div>

      <Card className="p-6 sm:p-8">
        {guide.body ? (
          <RichText value={guide.body} className="text-[0.95rem] leading-relaxed text-slate-800" />
        ) : (
          <p className="text-slate-500">This guide is still empty.</p>
        )}
      </Card>

      {canEdit && (
        <div className="mt-8 flex justify-end">
          <form action={deleteGuide}>
            <input type="hidden" name="guideId" value={guide.id} />
            <ConfirmButton message={`Delete the guide “${guide.title}”? Steps that link to it lose the link.`} className={dangerButtonClass}>
              <Trash2 size={13} /> Delete guide
            </ConfirmButton>
          </form>
        </div>
      )}
    </article>
  );
}
