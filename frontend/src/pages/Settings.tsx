import { Languages, Map, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { errorText, PageHeader } from '@/components/domain'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/overlay'
import { Card, CardHeader, Field, Input, Textarea } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/segmented'
import { setLanguage, useLang, type AppLang } from '@/i18n'
import { invalidate } from '@/lib/query'
import { useNetwork, type SimMode } from '@/offline/network'
import { api } from '@/services'
import { resetLocalServer } from '@/services/local'
import { useSession, useUI, type Theme } from '@/stores/app'
import { Page } from './_layout'

export default function Settings() {
  const { t } = useTranslation()
  const lang = useLang()
  const nav = useNavigate()
  const me = useSession((s) => s.user)!
  const setUser = useSession((s) => s.setUser)
  const { theme, setTheme, startTour } = useUI()
  const sim = useNetwork((s) => s.sim)
  const setSim = useNetwork((s) => s.setSim)
  const [name, setName] = useState(me.displayName)
  const [bio, setBio] = useState(me.bio)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Page className="max-w-3xl">
      <PageHeader title={t('settings.title')} />
      <div className="mt-6 flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <CardHeader title={t('settings.profile')} />
          <Field label={t('settings.displayName')} htmlFor="st-name">
            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('settings.bio')} htmlFor="st-bio">
            <Textarea id="st-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
          </Field>
          <Button
            variant="primary"
            className="self-end"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                const u = await api.updateMe({ displayName: name, bio })
                setUser(u)
                invalidate('')
                toast.success(t('settings.saved'))
              } catch (e) {
                toast.error(errorText(t, e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('common.save')}
          </Button>
        </Card>

        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <CardHeader title={t('settings.appearance')} />
          <Row label={t('nav.theme')}>
            <Segmented<Theme>
              label={t('nav.theme')}
              size="sm"
              value={theme}
              onChange={setTheme}
              items={[
                { value: 'dark', label: t('nav.themeDark'), icon: <Moon /> },
                { value: 'light', label: t('nav.themeLight'), icon: <Sun /> },
              ]}
            />
          </Row>
          <Row label={t('settings.language')}>
            <Segmented<AppLang>
              label={t('settings.language')}
              size="sm"
              value={lang}
              onChange={setLanguage}
              items={[
                { value: 'fr', label: 'Français', icon: <Languages /> },
                { value: 'en', label: 'English' },
              ]}
            />
          </Row>
          <Row label={t('network.simulator')} hint={t('network.simHint')}>
            <Segmented<SimMode>
              label={t('network.simulator')}
              size="sm"
              value={sim}
              onChange={setSim}
              items={[
                { value: 'off', label: t('network.simOff') },
                { value: 'offline', label: t('network.simOffline') },
                { value: '2g', label: t('network.sim2gLabel') },
              ]}
            />
          </Row>
          <Row label={t('settings.tour')} hint={t('settings.tourText')}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Map />}
              onClick={() => {
                nav('/')
                startTour()
              }}
            >
              {t('tour.restart')}
            </Button>
          </Row>
          <Row label={t('settings.mode')}>
            <span className="text-sm text-muted">{api.mode === 'local' ? t('settings.modeLocal') : t('settings.modeHttp')}</span>
          </Row>
        </Card>

        {api.mode === 'local' && me.isDemo && (
          <Card className="p-5 sm:p-6">
            <Row label={t('settings.sandbox')} hint={t('settings.sandboxText')}>
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw />}
                onClick={async () => {
                  await resetLocalServer()
                  const u = await api.loginDemo(me.handle)
                  setUser(u)
                  invalidate('')
                  toast.success(t('settings.resetDone'))
                }}
              >
                {t('settings.reset')}
              </Button>
            </Row>
          </Card>
        )}

        <Card className="border-danger/30 p-5 sm:p-6">
          <Row label={t('settings.danger')} hint={t('settings.deleteText')}>
            <Button variant="danger" size="sm" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
              {t('settings.deleteAccount')}
            </Button>
          </Row>
        </Card>
      </div>

      <Sheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('settings.deleteConfirm')}
        description={t('settings.deleteText')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 />}
              onClick={async () => {
                await api.deleteMe()
                setUser(null)
                invalidate('')
                toast.success(t('settings.deleted'))
                nav('/')
              }}
            >
              {t('settings.deleteAccount')}
            </Button>
          </>
        }
      >
        <span />
      </Sheet>
    </Page>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
