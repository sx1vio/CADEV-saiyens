import { BookOpen, CircleCheck, LifeBuoy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/djeli';
import { PageHeader, QuestionCard } from '@/components/domain';
import { DeployToSystalink } from '@/components/systalink';
import { Button, ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { useQuery } from '@/lib/query';
import { api } from '@/services';
import { useSession, useUI } from '@/stores/app';
import { Page } from './_layout';

const TAG = 'systalink';

/**
 * Idée C : l'entraide de la communauté sur l'hébergement Systalink. Les questions étiquetées
 * « systalink » passent par SOS Dev (piste IA, matching, Proof XP) ; les réponses validées
 * forment une FAQ publique, sans compte.
 */
export default function SystalinkHelp() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const { data: resolved } = useQuery(`questions:resolved:${TAG}`, () =>
    api.listQuestions('resolved', { tag: TAG }),
  );
  const { data: open } = useQuery(`questions:unanswered:${TAG}`, () =>
    api.listQuestions('unanswered', { tag: TAG }),
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Systalink"
        title={t('systalinkHelp.title')}
        subtitle={t('systalinkHelp.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            {me ? (
              <Button
                variant="primary"
                icon={<Zap />}
                onClick={() => setAsk(true, { tagIds: [TAG] })}
              >
                {t('systalinkHelp.ask')}
              </Button>
            ) : (
              <ButtonLink to="/connexion?next=/systalink/aide" variant="primary" icon={<Zap />}>
                {t('systalinkHelp.ask')}
              </ButtonLink>
            )}
            <a
              href="https://docs.systalink.com"
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-fg hover:bg-surface-2"
            >
              <BookOpen className="size-4" />
              {t('systalinkHelp.docs')}
            </a>
          </div>
        }
      />

      <section className="mt-8">
        <h2 className="label-caps mb-3 flex items-center gap-2">
          <CircleCheck className="size-3.5 text-success" />
          {t('systalinkHelp.faq')}
        </h2>
        <List items={resolved} empty={t('systalinkHelp.faqEmpty')} />
      </section>

      <section className="mt-8">
        <h2 className="label-caps mb-3 flex items-center gap-2">
          <LifeBuoy className="size-3.5 text-warning" />
          {t('systalinkHelp.open')}
        </h2>
        <List items={open} empty={t('systalinkHelp.openEmpty')} />
      </section>

      <section className="mt-8 flex flex-col gap-3 rounded-[10px] border border-line bg-surface-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-muted">{t('systalinkHelp.deployText')}</p>
        <DeployToSystalink from="help" variant="primary" className="shrink-0" />
      </section>
    </Page>
  );
}

function List({
  items,
  empty,
}: {
  items: Awaited<ReturnType<typeof api.listQuestions>> | undefined;
  empty: string;
}) {
  if (!items) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-20 rounded-[10px]" />
        ))}
      </div>
    );
  }
  if (items.length === 0) return <EmptyState pose="laptop" title={empty} />;
  return (
    <div className="dh-stagger flex flex-col gap-2">
      {items.map((q) => (
        <QuestionCard key={q.id} q={q} />
      ))}
    </div>
  );
}
