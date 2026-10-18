import { CheckCircle2, Inbox, Layers, Search, Sparkles, UserRound, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorState } from '@/components/djeli';
import { QuestionCard } from '@/components/domain';
import { useTags } from '@/components/TagPicker';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { ServiceHeader } from '@/platform/ui';
import { Segmented } from '@/components/ui/segmented';
import { useQuery } from '@/lib/query';
import { api, type QuestionTab } from '@/services';
import { useSession, useUI } from '@/stores/app';
import { ListSkeleton } from './_skeleton';
import { Page } from './_layout';

/** SOS Dev : liste des questions, filtres dans l'URL (règle n°7), base de connaissance (onglet Résolues). */
export default function SosList() {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as QuestionTab) || (me ? 'for-me' : 'all');
  const tag = params.get('tag') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const { data: tags = [] } = useTags();

  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q);
      else next.delete('q');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const key = `questions:${tab}:${tag}:${params.get('q') ?? ''}`;
  const { data, error, refresh } = useQuery(key, () =>
    api.listQuestions(tab, { tag: tag || undefined, q: params.get('q') || undefined }),
  );

  const tabs = [
    ...(me ? [{ value: 'for-me' as const, label: t('sos.tabs.for-me'), icon: <Sparkles /> }] : []),
    { value: 'unanswered' as const, label: t('sos.tabs.unanswered'), icon: <Inbox /> },
    { value: 'resolved' as const, label: t('sos.tabs.resolved'), icon: <CheckCircle2 /> },
    { value: 'all' as const, label: t('sos.tabs.all'), icon: <Layers /> },
    ...(me ? [{ value: 'mine' as const, label: t('sos.tabs.mine'), icon: <UserRound /> }] : []),
  ];

  return (
    <Page>
      <ServiceHeader
        title={t('navEntry.help')}
        subtitle={t('mvp.sosSubtitle')}
        actions={
          <div className="flex gap-2">
            <ButtonLink to="/systalink/aide" variant="secondary" className="hidden sm:inline-flex">
              {t('systalinkHelp.link')}
            </ButtonLink>
            {me && (
              <Button
                variant="primary"
                icon={<Zap />}
                onClick={() => setAsk(true)}
                className="hidden sm:inline-flex"
              >
                {t('nav.ask')}
              </Button>
            )}
          </div>
        }
      />
      <div className="mt-5" />
      {/* Barre d'outils du forum : recherche, stack, nouvelle question */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('sos.searchPlaceholder')}
            className="pl-9"
            type="search"
            aria-label={t('common.search')}
          />
        </div>
        <select
          value={tag}
          onChange={(e) => set('tag', e.target.value)}
          aria-label={t('sos.filterTag')}
          className="h-11 rounded-full border border-line-strong bg-canvas px-4 text-sm text-fg focus:border-fg focus:outline-none sm:h-10 sm:w-52"
        >
          <option value="">{t('sos.allTags')}</option>
          {tags.map((x) => (
            <option key={x.id} value={x.slug}>
              {x.label}
            </option>
          ))}
        </select>
        {me && (
          <Button
            variant="primary"
            icon={<Zap />}
            onClick={() => setAsk(true)}
            className="sm:hidden"
          >
            {t('nav.ask')}
          </Button>
        )}
      </div>

      <div className="mt-3 border-b border-line pb-3">
        <Segmented
          label={t('sos.title')}
          value={tab}
          onChange={(v) => set('tab', v)}
          items={tabs}
        />
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorState error={error} onRetry={refresh} />
        ) : !data ? (
          <ListSkeleton rows={5} />
        ) : data.length === 0 ? (
          <EmptyState
            pose="laptop"
            title={params.get('q') ? t('sos.emptySearch', { q: params.get('q') }) : t('sos.empty')}
            action={
              me && (
                <Button variant="primary" icon={<Zap />} onClick={() => setAsk(true)}>
                  {t('sos.emptyCta')}
                </Button>
              )
            }
          />
        ) : (
          <div className="dh-stagger flex flex-col gap-2">
            {data.map((x) => (
              <QuestionCard key={x.id} q={x} showBlocked={tab === 'unanswered'} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
