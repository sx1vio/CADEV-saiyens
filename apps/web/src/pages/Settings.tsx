import {
  BellOff,
  Eye,
  EyeOff,
  Languages,
  Mail,
  Map,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorText, PageHeader } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/overlay';
import { Card, CardHeader, Field, Input, Textarea } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { setLanguage, useLang, type AppLang } from '@/i18n';
import { invalidate } from '@/lib/query';
import { api, type PrivacySettings } from '@/services';
import { useSession, useUI, type Theme } from '@/stores/app';
import { Page } from './_layout';

export default function Settings() {
  const { t } = useTranslation();
  const lang = useLang();
  const nav = useNavigate();
  const me = useSession((s) => s.user)!;
  const setUser = useSession((s) => s.setUser);
  const { theme, setTheme, startTour } = useUI();
  const [name, setName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio);
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedHandle, setTypedHandle] = useState('');
  const [deleting, setDeleting] = useState(false);
  const handleMatches = typedHandle.trim().toLowerCase() === me.handle.toLowerCase();

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
            <Textarea
              id="st-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
            />
          </Field>
          <Button
            variant="primary"
            className="self-end"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const u = await api.updateMe({ displayName: name, bio });
                setUser(u);
                invalidate('');
                toast.success(t('settings.saved'));
              } catch (e) {
                toast.error(errorText(t, e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('common.save')}
          </Button>
        </Card>

        {/* PR14 : la confidentialité est appliquée par l'API ; le serveur local n'a rien à régler. */}
        {api.mode === 'http' && me.privacy && <PrivacyCard privacy={me.privacy} />}

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
          <Row label={t('settings.tour')} hint={t('settings.tourText')}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Map />}
              onClick={() => {
                nav('/');
                startTour();
              }}
            >
              {t('tour.restart')}
            </Button>
          </Row>
          <Row label={t('settings.mode')}>
            <span className="text-sm text-muted">
              {api.mode === 'local' ? t('settings.modeLocal') : t('settings.modeHttp')}
            </span>
          </Row>
        </Card>

        {/* Y3 : seule l'API envoie des e-mails ; le serveur local n'a rien à régler. */}
        {api.mode === 'http' && (
          <Card className="p-5 sm:p-6">
            <Row
              label={t('settings.emailNotifications')}
              hint={
                me.hasEmail
                  ? t('settings.emailNotificationsText')
                  : t('settings.emailNotificationsNoEmail')
              }
            >
              <Segmented<'on' | 'off'>
                label={t('settings.emailNotifications')}
                size="sm"
                value={me.emailNotifications ? 'on' : 'off'}
                onChange={async (v) => {
                  if (emailBusy) return;
                  setEmailBusy(true);
                  try {
                    setUser(await api.updateMe({ emailNotifications: v === 'on' }));
                    toast.success(
                      t(
                        v === 'on'
                          ? 'settings.emailNotificationsOn'
                          : 'settings.emailNotificationsOff',
                      ),
                    );
                  } catch (e) {
                    toast.error(errorText(t, e));
                  } finally {
                    setEmailBusy(false);
                  }
                }}
                items={[
                  { value: 'on', label: t('settings.emailOn'), icon: <Mail /> },
                  { value: 'off', label: t('settings.emailOff'), icon: <BellOff /> },
                ]}
              />
            </Row>
          </Card>
        )}

        {api.mode === 'local' && me.isDemo && (
          <Card className="p-5 sm:p-6">
            <Row label={t('settings.sandbox')} hint={t('settings.sandboxText')}>
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw />}
                onClick={async () => {
                  // Import à la demande : le serveur simulé n'est jamais livré en production.
                  if (import.meta.env.PROD) return;
                  const { resetLocalServer } = await import('@/services/local');
                  await resetLocalServer();
                  const u = await api.loginDemo(me.handle);
                  setUser(u);
                  invalidate('');
                  toast.success(t('settings.resetDone'));
                }}
              >
                {t('settings.reset')}
              </Button>
            </Row>
          </Card>
        )}

        <Card className="border-danger/30 p-5 sm:p-6">
          <Row label={t('settings.danger')} hint={t('settings.deleteText')}>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 />}
              onClick={() => setConfirmDelete(true)}
            >
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
              disabled={!handleMatches}
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await api.deleteMe(typedHandle.trim());
                  setUser(null);
                  invalidate('');
                  toast.success(t('settings.deleted'));
                  nav('/');
                } catch (e) {
                  toast.error(errorText(t, e));
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {t('settings.deleteAccount')}
            </Button>
          </>
        }
      >
        <Field label={t('settings.deleteTypeHandle', { handle: me.handle })} htmlFor="st-handle">
          <Input
            id="st-handle"
            value={typedHandle}
            onChange={(e) => setTypedHandle(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Field>
      </Sheet>
    </Page>
  );
}

const PRIVACY_ROWS: Array<keyof PrivacySettings> = [
  'unlisted',
  'hideCountry',
  'hideTimezone',
  'hideAvailability',
  'hideStats',
];

/** PR14 : chaque réglage s'enregistre dès qu'on le change (PATCH /me, champ `privacy`). */
function PrivacyCard({ privacy }: { privacy: PrivacySettings }) {
  const { t } = useTranslation();
  const setUser = useSession((s) => s.setUser);
  const [busy, setBusy] = useState(false);

  const save = async (key: keyof PrivacySettings, hidden: boolean) => {
    if (busy || privacy[key] === hidden) return;
    setBusy(true);
    try {
      setUser(await api.updateMe({ privacy: { [key]: hidden } }));
      toast.success(t('settings.privacySaved'));
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6">
      <CardHeader title={t('settings.privacyTitle')} subtitle={t('settings.privacyText')} />
      {PRIVACY_ROWS.map((key) => {
        const label = t(`settings.privacy.${key}`);
        // Le fuseau révèle le pays (« Africa/Dakar ») : il suit le pays quand celui-ci est masqué.
        const followsCountry = key === 'hideTimezone' && privacy.hideCountry;
        return (
          <Row
            key={key}
            label={label}
            hint={
              followsCountry
                ? t('settings.privacyTimezoneFollows')
                : t(`settings.privacyHint.${key}`)
            }
          >
            {followsCountry ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <EyeOff className="size-4" />
                {t('settings.privacyHidden')}
              </span>
            ) : (
              <Segmented<'visible' | 'hidden'>
                label={label}
                size="sm"
                value={privacy[key] ? 'hidden' : 'visible'}
                onChange={(v) => void save(key, v === 'hidden')}
                items={[
                  { value: 'visible', label: t('settings.privacyVisible'), icon: <Eye /> },
                  {
                    value: 'hidden',
                    label:
                      key === 'unlisted'
                        ? t('settings.privacyUnlisted')
                        : t('settings.privacyHidden'),
                    icon: <EyeOff />,
                  },
                ]}
              />
            )}
          </Row>
        );
      })}
    </Card>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
