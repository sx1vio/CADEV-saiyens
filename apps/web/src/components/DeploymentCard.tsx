import { CheckCircle2, Copy, Rocket, ServerCrash } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { DeployToSystalink } from '@/components/systalink';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, Field, Input } from '@/components/ui/primitives';
import { relativeTime, useLang } from '@/i18n';
import { invalidate, useQuery } from '@/lib/query';
import { requireNetwork } from '@/offline/network';
import { api, type RoomDetail } from '@/services';

/**
 * Idée A (Systalink) : « En production ». Tout le monde voit la preuve ; le créateur indique
 * l'URL, publie le jeton dans son application, puis lance la vérification.
 */
export function DeploymentCard({ room, manager }: { room: RoomDetail; manager: boolean }) {
  const { t } = useTranslation();
  const lang = useLang();
  const d = room.deployment;
  const { data: challenge, refresh } = useQuery(manager ? `deployment:${room.id}` : null, () =>
    api.getDeployment(room.id),
  );
  const [url, setUrl] = useState(d?.url ?? room.demoUrl ?? '');
  const [busy, setBusy] = useState<'save' | 'verify' | null>(null);

  if (!d && !manager) return null;
  const verified = d?.status === 'verified';

  const save = async () => {
    setBusy('save');
    try {
      requireNetwork();
      await api.setDeployment(room.id, url.trim());
      refresh();
      invalidate(`room:${room.inviteCode}`);
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(null);
    }
  };
  const verify = async () => {
    setBusy('verify');
    try {
      requireNetwork();
      const res = await api.verifyDeployment(room.id);
      toast.success(
        res.xpAwarded
          ? t('deployment.verifiedXp')
          : res.deployment.hostedOnSystalink
            ? t('deployment.verifiedSystalink')
            : t('deployment.verifiedElsewhere'),
      );
      refresh();
      invalidate(`room:${room.inviteCode}`);
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(null);
    }
  };
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success(t('deployment.copied'));
  };

  const proofUrl = challenge ? new URL(challenge.proofPath, challenge.url).toString() : '';
  const meta = challenge ? `<meta name="devhub-proof" content="${challenge.token}">` : '';

  return (
    <Card className="p-4">
      <CardHeader icon={<Rocket />} title={t('deployment.title')} />
      {d && verified ? (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Badge tone={d.hostedOnSystalink ? 'success' : 'neutral'} className="self-start">
            <CheckCircle2 />
            {d.hostedOnSystalink ? t('deployment.onSystalink') : t('deployment.live')}
          </Badge>
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-[13px] text-blue-text hover:underline"
          >
            {d.url}
          </a>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-subtle">{t('deployment.uptime')}</dt>
              <dd className="font-semibold tabular text-fg">
                {d.uptime === null ? '—' : `${Math.round(d.uptime * 1000) / 10} %`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">{t('deployment.lastCheck')}</dt>
              <dd className="flex items-center gap-1 font-semibold text-fg">
                {d.lastUp === false && <ServerCrash className="size-3.5 text-warning" />}
                {d.lastCheckAt ? relativeTime(d.lastCheckAt, lang) : t('deployment.notYet')}
              </dd>
            </div>
          </dl>
          {!d.hostedOnSystalink && manager && (
            <p className="text-[13px] text-muted">{t('deployment.moveToSystalink')}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-muted">{t('deployment.intro')}</p>
      )}

      {manager && (
        <div className="mt-4 flex flex-col gap-3">
          <Field label={t('deployment.url')} htmlFor="deploy-url">
            <Input
              id="deploy-url"
              type="url"
              inputMode="url"
              placeholder="https://mon-app.systalink.app"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <Button
            size="sm"
            variant="secondary"
            loading={busy === 'save'}
            disabled={!/^https:\/\/.+/.test(url.trim()) || url.trim() === challenge?.url}
            onClick={() => void save()}
          >
            {t('deployment.save')}
          </Button>

          {challenge && challenge.status === 'pending' && (
            <div className="flex flex-col gap-2 rounded-[8px] bg-surface-3 p-3 text-[13px] text-muted">
              <p>{t('deployment.howTo')}</p>
              <ProofLine label={proofUrl} value={challenge.token} onCopy={copy} />
              <p>{t('deployment.orMeta')}</p>
              <ProofLine label={t('deployment.metaLabel')} value={meta} onCopy={copy} />
              <Button
                size="sm"
                variant="primary"
                loading={busy === 'verify'}
                onClick={() => void verify()}
              >
                {t('deployment.verify')}
              </Button>
            </div>
          )}
          {challenge?.status === 'verified' && (
            <Button
              size="sm"
              variant="pill"
              loading={busy === 'verify'}
              onClick={() => void verify()}
            >
              {t('deployment.reverify')}
            </Button>
          )}
          {!d?.hostedOnSystalink && <DeployToSystalink from="room" room={room.inviteCode} />}
        </div>
      )}
    </Card>
  );
}

function ProofLine({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-subtle">{label}</p>
        <code className="block break-all font-mono text-[12px] text-fg">{value}</code>
      </div>
      <Button
        size="xs"
        variant="ghost"
        icon={<Copy />}
        aria-label="Copier"
        onClick={() => onCopy(value)}
      />
    </div>
  );
}
