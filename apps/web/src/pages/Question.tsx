import { CUBE, Cube } from '@/platform/ui';
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flag,
  Hand,
  Languages,
  Link2,
  MessageSquareText,
  Pencil,
  Send,
  Sparkles,
  ThumbsUp,
  Video,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Djeli, EmptyState, ErrorState } from '@/components/djeli';
import { EditSheet, PendingEdit, useQueuedEdit, type EditTarget } from '@/components/EditText';
import { ReportSheet } from '@/components/ReportSheet';
import { DemoBadge, errorText, UserLink } from '@/components/domain';
import { Button, ButtonLink } from '@/components/ui/button';
import { CodeBlock, Markdown } from '@/components/ui/code';
import { Sheet, Tip } from '@/components/ui/overlay';
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  Field,
  Input,
  Skeleton,
  Textarea,
  TechTag,
} from '@/components/ui/primitives';
import { duration, formatDate, relativeTime, useLang } from '@/i18n';
import { invalidate, useQuery } from '@/lib/query';
import { useTopic } from '@/services/realtime';
import { cn, minutesBetween, uuid } from '@/lib/utils';
import { enqueue, requireNetwork, useNetwork } from '@/offline/network';
import { api, type AnswerView, type QuestionDetail, type Translation } from '@/services';
import { useSession } from '@/stores/app';
import { WithPanel } from './_layout';

export default function QuestionPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const {
    data: q,
    error,
    refresh,
  } = useQuery<QuestionDetail>(`question:${id}`, () => api.getQuestion(id));
  // Y8 : réponses, piste IA, sollicitations et masquage arrivent sans recharger la page.
  useTopic(q ? `question:${q.id}` : null, `question:${id}`);
  const queue = useNetwork((s) => s.queue);
  const [celebrate, setCelebrate] = useState<{
    name: string;
    handle: string;
    points: number;
  } | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [reportOpen, setReportOpen] = useState<{
    type: 'question' | 'answer';
    id: string;
    label: string;
  } | null>(null);

  const translation = useTranslated(
    { type: 'question', id: q?.id ?? id },
    q ? `${q.title}\n${q.body}` : '',
  );

  if (error)
    return (
      <div className="mx-auto max-w-3xl p-6">
        {(error as { code?: string }).code === 'not-found' ? (
          <EmptyState
            pose="laptop"
            title={t('question.notFound')}
            action={
              <ButtonLink to="/?f=questions" variant="secondary">
                {t('nav.sos')}
              </ButtonLink>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={refresh} />
        )}
      </div>
    );
  if (!q) return <QuestionSkeleton />;

  const isAuthor = me?.id === q.authorId;
  const resolved = q.status === 'resolved';
  const accepted = q.answers.find((a) => a.isAccepted);
  // Une action déjà reçue par le serveur (même client_id) n'est plus affichée comme « en attente ».
  const pendingAnswers = queue.filter(
    (x) =>
      x.type === 'answer' &&
      x.payload.questionId === q.id &&
      !q.answers.some((a) => a.clientId === x.id),
  );
  const myClaim = q.matches.find((m) => m.helperId === me?.id && m.claimedAt);
  const questionEdit = queue.find(
    (x) => x.type === 'edit-question' && x.payload.questionId === q.id,
  );
  // S10 : une question rédigée dans l'autre langue se lit dans la langue de l'interface.
  const translatable = q.lang !== lang;

  const onAccept = async (a: AnswerView) => {
    try {
      requireNetwork();
      const r = await api.accept(a.id);
      invalidate('');
      setCelebrate({ name: a.author.displayName, handle: a.author.handle, points: r.gained });
    } catch (e) {
      toast.error(errorText(t, e));
    }
  };

  const panel = (
    <>
      <MatchesCard q={q} />
      {!isAuthor && me && !resolved && (
        <Card className="p-4">
          {myClaim ? (
            <p className="flex items-start gap-2 text-sm text-fg">
              <Hand className="mt-0.5 size-4 shrink-0 text-accent-text" />
              {t('question.claimedMe')}
            </p>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              icon={<Hand />}
              onClick={async () => {
                try {
                  requireNetwork();
                  await api.claim(q.id);
                  invalidate(`question:${q.id}`);
                } catch (e) {
                  toast.error(errorText(t, e));
                }
              }}
            >
              {t('question.claim')}
            </Button>
          )}
        </Card>
      )}
      <PairCard q={q} />
      {q.similar.length > 0 && (
        <Card className="p-4">
          <CardHeader title={t('question.similar')} />
          <div className="mt-3 flex flex-col gap-2">
            {q.similar.map((s) => (
              <Link
                key={s.id}
                to={`/sos/${s.id}`}
                className="flex items-start gap-2 rounded-[10px] p-2 text-sm text-fg transition-colors hover:bg-surface-3"
              >
                {s.status === 'resolved' ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <MessageSquareText className="mt-0.5 size-4 shrink-0 text-subtle" />
                )}
                <span className="line-clamp-2">{s.title}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );

  return (
    <WithPanel panel={panel} panelTitle={t('question.matchesTitle')}>
      <article className="mx-auto flex max-w-[var(--reading-w)] flex-col gap-6 xl:max-w-none">
        <div>
          <Link
            to="/?f=questions"
            className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {t('nav.sos')}
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={resolved ? 'success' : 'accent'}>
              {resolved ? <CheckCircle2 /> : <Clock3 />}
              {resolved ? t('sos.resolved') : t('sos.open')}
            </Badge>
            {q.urgency !== 'normal' && (
              <Badge tone={q.urgency === 'high' ? 'danger' : 'neutral'}>
                {t(`sos.urgency.${q.urgency}`)}
              </Badge>
            )}
            {q.claimedBy && !resolved && (
              <Badge tone="blue">
                <Hand />
                {t('sos.claimedBy', { name: q.claimedBy.displayName })}
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[30px]">
            {translation.shown?.title ?? q.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-subtle">
            <span>{t('question.asked', { time: relativeTime(q.createdAt, lang) })}</span>
            <UserLink user={q.author} size={22} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {q.tags.map((tag) => (
              <Link key={tag.id} to={`/?f=questions&tag=${tag.slug}`}>
                <TechTag label={tag.label} />
              </Link>
            ))}
          </div>
        </div>

        {resolved && accepted && (
          <div className="flex items-center gap-4 rounded-[10px] bg-black p-5 text-white">
            <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[#1c1c1e]">
              <Cube color={CUBE.green} size={20} />
            </span>
            <div>
              <p className="font-semibold text-white">
                {t('question.resolvedBanner', {
                  time: duration(minutesBetween(q.createdAt, accepted.createdAt), lang),
                  name: accepted.author.displayName,
                })}
              </p>
              <p className="mt-0.5 text-sm text-white/65">{t('question.knowledgeCard')}</p>
              {/* S6 : la fiche mène d'abord à la solution validée. */}
              <a
                href={`#answer-${accepted.id}`}
                className="mt-2 inline-block text-sm font-semibold text-white underline underline-offset-4"
              >
                {t('question.seeSolution')}
              </a>
            </div>
          </div>
        )}

        <PendingEdit item={questionEdit} />

        {/* Énoncé */}
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          {translation.shown && <TranslatedNote translation={translation.shown} />}
          <Markdown>{translation.shown?.body ?? q.body}</Markdown>
          {q.tried && <Section label={t('question.tried')}>{q.tried}</Section>}
          {q.expected && <Section label={t('question.expected')}>{q.expected}</Section>}
          {q.codeSnippet && <CodeBlock code={q.codeSnippet} lang={q.codeLang} />}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {q.environment && (
              <p>
                <span className="text-subtle">{t('question.environment')} · </span>
                <span className="font-mono text-[13px] text-fg">{q.environment}</span>
              </p>
            )}
            {q.reproUrl && (
              <a
                href={q.reproUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 font-medium text-blue-text hover:underline"
              >
                {t('question.repro')} <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {translatable && <TranslateButton translation={translation} />}
            <Button
              variant="ghost"
              size="sm"
              icon={<Link2 />}
              onClick={() => {
                void navigator.clipboard?.writeText(location.href);
                toast.success(t('common.copied'));
              }}
            >
              {t('common.share')}
            </Button>
            {isAuthor && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil />}
                onClick={() => setEditing({ kind: 'question', question: q })}
              >
                {t('question.edit')}
              </Button>
            )}
            {me && !isAuthor && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Flag />}
                onClick={() => setReportOpen({ type: 'question', id: q.id, label: q.title })}
              >
                {t('common.report')}
              </Button>
            )}
          </div>
        </Card>

        <HintCard q={q} />

        {/* Réponses (fil façon image 05) */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-fg">
            {t('question.answersTitle', { count: q.answers.length })}
          </h2>
          {q.answers.length === 0 && pendingAnswers.length === 0 && (
            <p className="rounded-[10px] border border-dashed border-line-strong p-5 text-center text-sm text-muted">
              {t('question.noAnswers')}
            </p>
          )}
          <ol className="relative flex flex-col gap-4">
            {q.answers.map((a) => (
              <AnswerItem
                key={a.id}
                a={a}
                canAccept={isAuthor && !resolved && a.author.id !== me?.id}
                canVote={!!me && a.author.id !== me.id}
                translatable={translatable}
                onEdit={
                  me && a.author.id === me.id
                    ? () => setEditing({ kind: 'answer', answer: a, questionTitle: q.title })
                    : undefined
                }
                onAccept={() => onAccept(a)}
                onReport={() =>
                  setReportOpen({ type: 'answer', id: a.id, label: a.body.slice(0, 80) })
                }
              />
            ))}
            {pendingAnswers.map((p) =>
              p.type === 'answer' ? (
                <li
                  key={p.id}
                  className="flex gap-3 rounded-[10px] border border-dashed border-warning/50 bg-warning-soft/40 p-4"
                >
                  <Avatar name={me?.displayName ?? ''} src={me?.avatarUrl} size={34} />
                  <div className="min-w-0 flex-1">
                    <Badge tone="warning" size="sm">
                      <WifiOff />
                      {t('question.pendingAnswer')}
                    </Badge>
                    <div className="mt-2">
                      <Markdown>{p.payload.body}</Markdown>
                    </div>
                  </div>
                </li>
              ) : null,
            )}
          </ol>
          <AnswerForm q={q} />
        </section>
      </article>

      <EditSheet target={editing} onClose={() => setEditing(null)} />

      {/* Moment signature : la validation */}
      <Sheet
        open={!!celebrate}
        onOpenChange={(o) => !o && setCelebrate(null)}
        title={t('question.accepted')}
        size="sm"
      >
        {celebrate && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Djeli pose="celebrate" size={140} float />
            <p className="text-lg font-semibold text-fg">
              {t('question.acceptedToast', { name: celebrate.name, points: celebrate.points })}
            </p>
            <p className="text-sm text-muted">{t('question.knowledgeCard')}</p>
            <ButtonLink
              to={`/u/${celebrate.handle}`}
              variant="primary"
              className="mt-2"
              onClick={() => setCelebrate(null)}
            >
              {t('landing.seePassport')}
            </ButtonLink>
          </div>
        )}
      </Sheet>
      <ReportSheet target={reportOpen} onClose={() => setReportOpen(null)} />
    </WithPanel>
  );
}

function Section({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-fg">{children}</p>
    </div>
  );
}

/**
 * S10 : traduction à la demande dans la langue de l'interface. L'original reste à un clic, et une
 * traduction n'est plus affichée dès que le texte d'origine change (modification, temps réel).
 */
function useTranslated(target: { type: 'question' | 'answer'; id: string }, source: string) {
  const { t } = useTranslation();
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ source: string; lang: string; value: Translation } | null>(
    null,
  );
  const [original, setOriginal] = useState(false);
  const current = result && result.source === source && result.lang === lang ? result.value : null;

  const toggle = async () => {
    if (current) return setOriginal((o) => !o);
    setBusy(true);
    try {
      requireNetwork();
      const value = await api.translate(target, lang);
      setResult({ source, lang, value });
      setOriginal(false);
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };
  return { shown: current && !original ? current : null, available: !!current, busy, toggle };
}

function TranslateButton({ translation }: { translation: ReturnType<typeof useTranslated> }) {
  const { t } = useTranslation();
  const label = translation.shown
    ? t('question.showOriginal')
    : translation.available
      ? t('question.showTranslation')
      : t('question.translate');
  const button = (
    <Button
      variant="ghost"
      size="sm"
      icon={<Languages />}
      loading={translation.busy}
      disabled={api.mode === 'local'}
      onClick={() => void translation.toggle()}
    >
      {label}
    </Button>
  );
  // Mode local (développement sans API) : la traduction n'existe que côté serveur.
  if (api.mode !== 'local') return button;
  return (
    <Tip label={t('question.translateUnavailable')}>
      <span>{button}</span>
    </Tip>
  );
}

/** Mention obligatoire d'une traduction IA (09-ia-integrations, « Mentions dans l'interface »). */
function TranslatedNote({ translation }: { translation: Translation }) {
  const { t } = useTranslation();
  return (
    <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
      <Badge tone="blue" size="sm">
        <Languages />
        {t('question.machineTranslated')}
      </Badge>
      {translation.demo && <span>{t('question.translationDemo')}</span>}
    </p>
  );
}

/** S2 : piste marquée comme telle, qui ne bloque jamais la suite. */
function HintCard({ q }: { q: QuestionDetail }) {
  const { t } = useTranslation();
  const online = useNetwork((s) => s.browserOnline);
  const status = !online && q.aiStatus === 'pending' ? 'waiting-network' : q.aiStatus;
  return (
    <section className="glow-border relative overflow-hidden rounded-[10px] bg-surface-1 p-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[var(--gradient-glow)]" />
      <div className="relative flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-[8px] bg-black text-white">
          <Sparkles className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">{t('question.hintTitle')}</p>
          <p className="text-xs text-subtle">
            {q.aiHintSource === 'ai' ? t('question.hintAI') : t('question.hintRules')}
          </p>
        </div>
      </div>
      <div className="relative mt-4">
        {status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-9/12" />
            <Skeleton className="h-3.5 w-10/12" />
            <p className="mt-1 text-xs text-subtle">{t('question.hintPending')}</p>
          </div>
        )}
        {status === 'waiting-network' && (
          <p className="text-sm text-muted">{t('question.hintWaiting')}</p>
        )}
        {status === 'failed' && <p className="text-sm text-muted">{t('question.hintFailed')}</p>}
        {status === 'ready' && q.aiHint && (
          <Markdown className="text-[14.5px]">{q.aiHint}</Markdown>
        )}
      </div>
      {status !== 'ready' && (
        <p className="relative mt-3 text-xs text-subtle">{t('question.hintNeverBlocks')}</p>
      )}
    </section>
  );
}

function AnswerItem({
  a,
  canAccept,
  canVote,
  onAccept,
  onEdit,
  onReport,
  translatable,
}: {
  a: AnswerView;
  canAccept: boolean;
  canVote: boolean;
  /** S10 : la discussion est dans l'autre langue que l'interface. */
  translatable: boolean;
  onAccept: () => void;
  /** Auteur de la réponse : modifier son texte (O4). */
  onEdit?: () => void;
  onReport: () => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const pendingEdit = useQueuedEdit('answer', a.id);
  const [confirm, setConfirm] = useState(false);
  const [voted, setVoted] = useState(a.votedByMe);
  const [count, setCount] = useState(a.helpfulCount);
  const translation = useTranslated({ type: 'answer', id: a.id }, a.body);
  return (
    <li
      id={`answer-${a.id}`}
      className={cn(
        'relative flex scroll-mt-6 gap-3 rounded-[10px] p-4 sm:p-5',
        a.isAccepted ? 'bg-surface-1 ring-2 ring-success/50' : 'bg-surface-1',
      )}
    >
      <Avatar name={a.author.displayName} src={a.author.avatarUrl} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <UserLink user={a.author} noAvatar />
          <span className="text-xs text-subtle">{relativeTime(a.createdAt, lang)}</span>
          {a.isAccepted && (
            <Badge tone="success" size="sm" className="ml-auto">
              <CheckCircle2 />
              {t('question.accepted')}
            </Badge>
          )}
        </div>
        <div className="mt-2">
          {translation.shown && <TranslatedNote translation={translation.shown} />}
          <Markdown>{translation.shown?.body ?? a.body}</Markdown>
        </div>
        {pendingEdit && (
          <div className="mt-2">
            <PendingEdit item={pendingEdit} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={voted ? 'success' : 'ghost'}
            size="sm"
            icon={<ThumbsUp />}
            disabled={!canVote || voted}
            onClick={async () => {
              setVoted(true);
              setCount((c) => c + 1);
              try {
                requireNetwork();
                await api.vote(a.id);
                toast.success(t('question.helpfulDone'));
                invalidate('');
              } catch (e) {
                setVoted(false);
                setCount((c) => c - 1);
                toast.error(errorText(t, e));
              }
            }}
          >
            {t('question.helpful')} · {count}
          </Button>
          {translatable && <TranslateButton translation={translation} />}
          {onEdit && (
            <Button variant="ghost" size="sm" icon={<Pencil />} onClick={onEdit}>
              {t('question.edit')}
            </Button>
          )}
          {canAccept && (
            <Button
              variant="success"
              size="sm"
              icon={<CheckCircle2 />}
              onClick={() => setConfirm(true)}
            >
              {t('question.accept')}
            </Button>
          )}
          {canVote && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('common.report')}
              onClick={onReport}
              className="ml-auto"
            >
              <Flag />
            </Button>
          )}
        </div>
      </div>
      <Sheet
        open={confirm}
        onOpenChange={setConfirm}
        title={t('question.accept')}
        description={t('question.acceptConfirm')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="success"
              icon={<CheckCircle2 />}
              onClick={() => {
                setConfirm(false);
                onAccept();
              }}
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-[10px] bg-surface-2 p-3">
          <Avatar name={a.author.displayName} src={a.author.avatarUrl} size={36} />
          <p className="text-sm text-fg">
            <span className="font-semibold">{a.author.displayName}</span> · +10 Proof XP
          </p>
        </div>
      </Sheet>
    </li>
  );
}

/** Réponse inline ; hors ligne, elle part dans la file (O2). */
function AnswerForm({ q }: { q: QuestionDetail }) {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me)
    return (
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface-1 p-4">
        <p className="text-sm text-muted">{t('question.loginToAnswer')}</p>
        <ButtonLink to={`/connexion?next=/sos/${q.id}`} variant="primary" size="sm">
          {t('nav.login')}
        </ButtonLink>
      </div>
    );
  const send = async () => {
    if (body.trim().length < 10) return toast.error(t('errors.answer_too-short'));
    setBusy(true);
    try {
      const r = await enqueue(
        { type: 'answer', payload: { questionId: q.id, body, questionTitle: q.title } },
        me.id,
        uuid(),
      );
      setBody('');
      if (r.queued) toast(t('network.queued'));
      else toast.success(t('network.sent'));
    } catch (e) {
      toast.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex gap-3 rounded-[10px] border border-line bg-surface-1 p-3 sm:p-4">
      <Avatar name={me.displayName} src={me.avatarUrl} size={34} className="hidden sm:grid" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label htmlFor="answer" className="sr-only">
          {t('question.yourAnswer')}
        </label>
        <Textarea
          id="answer"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send();
          }}
          placeholder={t('question.answerPlaceholder')}
          className="min-h-28 border-transparent bg-surface-2 shadow-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="hidden text-xs text-subtle sm:inline">{t('question.sendShortcut')}</span>
          <Button
            variant="primary"
            size="sm"
            icon={<Send />}
            loading={busy}
            onClick={send}
            className="ml-auto"
          >
            {busy ? t('question.posting') : t('question.postAnswer')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** S3 : devs sollicités avec la raison du choix. */
function MatchesCard({ q }: { q: QuestionDetail }) {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <Card className="p-4">
      <CardHeader
        icon={<BellRing />}
        title={t('question.matchesTitle')}
        subtitle={t('question.matchesHint')}
      />
      <ul className="mt-4 flex flex-col gap-3">
        {q.matches.length === 0 && (
          <li className="text-sm text-muted">{t('question.matchesEmpty')}</li>
        )}
        {q.matches.map((m) => (
          <li key={m.id} className="flex gap-3">
            <Avatar name={m.helper.displayName} src={m.helper.avatarUrl} size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/u/${m.helper.handle}`}
                  className="truncate text-sm font-semibold text-fg hover:underline"
                >
                  {m.helper.displayName}
                </Link>
                {m.helper.isDemo && <DemoBadge />}
              </div>
              <ul className="mt-0.5">
                {m.reasons.map((r) => (
                  <li key={r.key} className="text-xs leading-snug text-muted">
                    {t(r.key, r.params)}
                  </li>
                ))}
              </ul>
              <p
                className={cn(
                  'mt-1 text-[11px] font-semibold',
                  m.answeredAt ? 'text-success' : m.claimedAt ? 'text-accent-text' : 'text-subtle',
                )}
              >
                {m.answeredAt
                  ? t('match.answered')
                  : m.claimedAt
                    ? t('match.claiming')
                    : t('match.notified')}{' '}
                · {relativeTime(m.answeredAt ?? m.claimedAt ?? m.notifiedAt, lang)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {q.status === 'open' && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-subtle">
          {t('question.escalation')}
        </p>
      )}
    </Card>
  );
}

/** S5 : pair programming planifié. */
function PairCard({ q }: { q: QuestionDetail }) {
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState('');
  const [link, setLink] = useState('https://meet.jit.si/devhub-');
  const isAuthor = me?.id === q.authorId;
  if (!me || (!q.pairSessions.length && (isAuthor || q.status === 'resolved'))) return null;
  const respond = async (pairId: string, accept: boolean) => {
    try {
      requireNetwork();
      await api.respondPair(pairId, accept);
      invalidate(`question:${q.id}`);
    } catch (e) {
      toast.error(errorText(t, e));
    }
  };
  return (
    <Card className="p-4">
      <CardHeader icon={<Video />} title={t('question.pairTitle')} />
      <ul className="mt-3 flex flex-col gap-2">
        {q.pairSessions.map((p) => (
          <li key={p.id} className="rounded-[8px] bg-surface-3 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-fg">
              <CalendarClock className="size-4 text-accent-text" />
              {formatDate(p.startsAt, lang, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="mt-1 text-xs text-subtle">{t(`question.pairStatus.${p.status}`)}</p>
            <div className="mt-2 flex gap-2">
              <a
                href={p.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-text hover:underline"
              >
                {t('question.join')} <ExternalLink className="size-3" />
              </a>
              {isAuthor && p.status === 'proposed' && (
                <>
                  <Button size="xs" variant="success" onClick={() => void respond(p.id, true)}>
                    {t('question.pairAccept')}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => void respond(p.id, false)}>
                    {t('question.pairDecline')}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!isAuthor && q.status === 'open' && (
        <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setOpen(true)}>
          {t('question.pairPropose')}
        </Button>
      )}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('question.pairPropose')}
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={async () => {
              try {
                requireNetwork();
                await api.proposePair(q.id, new Date(when).toISOString(), link);
                toast.success(t('question.pairSent'));
                setOpen(false);
                invalidate(`question:${q.id}`);
              } catch (e) {
                toast.error(errorText(t, e));
              }
            }}
            disabled={!when}
          >
            {t('common.send')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('question.pairWhen')} htmlFor="pair-when">
            <Input
              id="pair-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>
          <Field
            label={t('question.pairLink')}
            htmlFor="pair-link"
            hint={t('question.pairLinkHint')}
          >
            <Input
              id="pair-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </Field>
        </div>
      </Sheet>
    </Card>
  );
}

function QuestionSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-4 w-60" />
        <Skeleton className="mt-2 h-64 rounded-[10px]" />
        <Skeleton className="h-36 rounded-[10px]" />
      </div>
      <div className="hidden w-[var(--panel-w)] flex-col gap-4 xl:flex">
        <Skeleton className="h-72 rounded-[10px]" />
        <Skeleton className="h-28 rounded-[10px]" />
      </div>
    </div>
  );
}
