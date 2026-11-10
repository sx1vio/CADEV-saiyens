import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { withSite } from '@/lib/page-title';
import { EmptyState } from '@/components/djeli';
import { ButtonLink } from '@/components/ui/button';
import { Page } from './_layout';

export default function NotFound() {
  const { t } = useTranslation();
  const title = t('notFound.title');
  // Le serveur répond 200 pour toute adresse (application monopage) : on dit aux moteurs de ne pas
  // indexer cet écran (FONC-01), et on donne un titre propre (A11Y-03).
  useEffect(() => {
    document.title = withSite(title);
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [title]);
  return (
    <Page className="max-w-xl py-16">
      <EmptyState
        heading
        pose="laptop"
        title={t('notFound.title')}
        text={t('notFound.text')}
        action={
          <ButtonLink to="/" variant="primary">
            {t('notFound.home')}
          </ButtonLink>
        }
      />
    </Page>
  );
}
