import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/djeli'
import { ButtonLink } from '@/components/ui/button'
import { Page } from './_layout'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <Page className="max-w-xl py-16">
      <EmptyState
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
  )
}
