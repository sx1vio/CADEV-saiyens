import { ExternalLink, Eye, ShieldQuestion } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { errorText, UserLink } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/overlay';
import { Badge, Field, Input, Textarea, TechTag } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { relativeTime, useLang } from '@/i18n';
import { invalidate } from '@/lib/query';
import { requireNetwork } from '@/offline/network';
import { api, type FeedbackRequest, type FeedbackRequestItem } from '@/services';
import { useSession } from '@/stores/app';

// R6 : demandes de retour et de revue de code. Une demande part dans le flux de la stack ;
// un autre dev la prend, fait sa revue (sur GitHub ou ailleurs), puis le demandeur confirme.

type Kind = FeedbackRequest['kind'];

const STATUS_TONE = {
  open: 'blue',
  'in-progress': 'warning',
  done: 'success',
  cancelled: 'neutral',
} as const;

/**
 * Formulaire de demande : type, lien à relire (PR, commit, démo) et un mot pour le relecteur.
 * Le parent le remonte (`key`) pour repartir du type choisi.
 */
export function FeedbackSheet({
  open,
  onOpenChange,
  roomId,
  initialKind = 'code-review',
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomId: string;
  initialKind?: Kind;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const badUrl = url.trim() !== '' && !/^https:\/\/\S+$/.test(url.trim());
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('feedback.sheetTitle')}
      description={t('feedback.sheetHint')}
      size="sm"
      footer={
        <Button
          variant="primary"
          icon={<ShieldQuestion />}
          loading={busy}
          disabled={badUrl}
          onClick={async () => {
            setBusy(true);
            try {
              requireNetwork();
              await api.requestFeedback(roomId, kind, { url, note });
              invalidate('');
              toast.success(t('room.feedbackSent'));
              setUrl('');
              setNote('');
              onOpenChange(false);
            } catch (e) {
              toast.error(errorText(t, e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('common.send')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented<Kind>
          label={t('feedback.kindLabel')}
          value={kind}
          onChange={setKind}
          items={[
            { value: 'code-review', label: t('feedback.kind.code-review') },
            { value: 'feedback', label: t('feedback.kind.feedback') },
          ]}
        />
        <p className="text-xs text-subtle">
          {kind === 'code-review' ? t('feedback.xpHint') : t('feedback.noXpHint')}
        </p>
        <Field
          label={t('feedback.urlLabel')}
          htmlFor="feedback-url"
          optional={t('common.optional')}
          error={badUrl ? t('feedback.urlError') : undefined}
        >
          <Input
            id="feedback-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/proprietaire/depot/pull/42"
          />
        </Field>
        <Field
          label={t('feedback.noteLabel')}
          htmlFor="feedback-note"
          optional={t('common.optional')}
        >
          <Textarea
            id="feedback-note"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('feedback.notePlaceholder')}
          />
        </Field>
      </div>
    </Sheet>
  );
}

/** Une demande et les actions possibles pour la personne connectée. */
export function FeedbackRow({
  item,
  showRoom = false,
}: {
  item: FeedbackRequestItem;
  showRoom?: boolean;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const [busy, setBusy] = useState(false);
  const mine = me !== null && (me.id === item.requesterId || me.handle === item.requesterId);
  const reviewing =
    me !== null &&
    item.reviewerId !== null &&
    (me.id === item.reviewerId || me.handle === item.reviewerId);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      requireNetwork();
      await fn();
      invalidate('');
      if (done) toast.success(done);
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 rounded-[10px] border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={item.kind === 'code-review' ? 'lavender' : 'sky'} size="sm">
          {t(`feedback.kind.${item.kind}`)}
        </Badge>
        <Badge tone={STATUS_TONE[item.status]} size="sm">
          {t(`feedback.status.${item.status}`)}
        </Badge>
        <span className="text-xs text-subtle">{relativeTime(item.createdAt, lang)}</span>
      </div>
      {showRoom && (
        <Link to={`/p/${item.room.code}`} className="text-sm font-semibold text-fg hover:underline">
          {item.room.name}
        </Link>
      )}
      <UserLink user={item.requester} size={24} />
      {item.note && <p className="text-sm break-words text-muted">{item.note}</p>}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-blue-text hover:underline"
        >
          <span className="truncate">{item.url.replace(/^https:\/\//, '')}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
      {showRoom && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <TechTag key={tag.id} label={tag.label} />
          ))}
        </div>
      )}
      {item.reviewer && item.status !== 'cancelled' && (
        <p className="flex items-center gap-1.5 text-xs text-subtle">
          <Eye className="size-3.5" />
          {t('feedback.reviewedBy')} <UserLink user={item.reviewer} size={18} />
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {me && !mine && item.status === 'open' && (
          <Button
            size="sm"
            variant="secondary"
            loading={busy}
            onClick={() => act(() => api.takeFeedback(item.id), t('feedback.taken'))}
          >
            {t('feedback.take')}
          </Button>
        )}
        {reviewing && item.status === 'in-progress' && (
          <span className="text-xs text-muted">{t('feedback.waitingConfirm')}</span>
        )}
        {mine && item.status === 'in-progress' && (
          <Button
            size="sm"
            variant="success"
            loading={busy}
            onClick={() =>
              act(async () => {
                const r = await api.confirmFeedback(item.id);
                toast.success(
                  r.points > 0
                    ? t('feedback.confirmedXp', { points: r.points })
                    : t('feedback.confirmed'),
                );
              })
            }
          >
            {t('feedback.confirm')}
          </Button>
        )}
        {mine && (item.status === 'open' || item.status === 'in-progress') && (
          <Button
            size="sm"
            variant="ghost"
            loading={busy}
            onClick={() => act(() => api.cancelFeedback(item.id))}
          >
            {t('feedback.cancel')}
          </Button>
        )}
      </div>
    </li>
  );
}
