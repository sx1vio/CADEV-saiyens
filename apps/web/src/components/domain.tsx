import {
  BadgeCheck,
  CheckCircle2,
  FolderGit2,
  GitPullRequestArrow,
  Hand,
  MessageSquareText,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { duration, errorKey, relativeTime, useLang } from '@/i18n';
import { countryName, formatUtc } from '@/lib/geo';
import { prefetch } from '@/lib/query';
import { cn } from '@/lib/utils';
import {
  api,
  type ActivityItem,
  type DevCard as DevCardT,
  type QuestionListItem,
  type RoomListItem,
  type UserSummary,
} from '@/services';
import { useSession } from '@/stores/app';
import { Avatar, AvatarStack, Badge, StatusDot, TechTag } from './ui/primitives';
import { ScoreBar } from './ui/data';
import { BrandLogo } from '@/platform/logos';

/* ---------------- Préchargement au survol (règle de navigation n°2) ---------------- */

export const preload = {
  question: (id: string) => prefetch(`question:${id}`, () => api.getQuestion(id)),
  room: (code: string) => prefetch(`room:${code}`, () => api.getRoom(code)),
  passport: (handle: string) => prefetch(`passport:${handle}`, () => api.getPassport(handle)),
};

/* ---------------- Utilisateurs ---------------- */

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex h-4 items-center rounded-[4px] border border-line-strong px-1 text-[10px] font-medium text-subtle lowercase',
        className,
      )}
      title={t('common.demoDataHint')}
    >
      {t('common.demo')}
    </span>
  );
}

export function UserLink({
  user,
  size = 24,
  showDemo = true,
  className,
  muted,
  noAvatar,
}: {
  user: UserSummary;
  size?: number;
  showDemo?: boolean;
  className?: string;
  muted?: boolean;
  noAvatar?: boolean;
}) {
  return (
    <Link
      to={`/u/${user.handle}`}
      onMouseEnter={() => preload.passport(user.handle)}
      onFocus={() => preload.passport(user.handle)}
      className={cn('group inline-flex min-w-0 items-center gap-2', className)}
    >
      {!noAvatar && <Avatar name={user.displayName} src={user.avatarUrl} size={size} />}
      <span
        className={cn(
          'truncate font-semibold group-hover:underline group-hover:decoration-1 group-hover:underline-offset-2',
          muted ? 'text-muted' : 'text-fg',
        )}
      >
        {user.displayName}
      </span>
      {showDemo && user.isDemo && <DemoBadge />}
    </Link>
  );
}

/* ---------------- Questions ---------------- */

/** Première ligne utile d'un extrait (souvent le message d'erreur). */
function snippetPreview(code: string) {
  return code
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim())
    .slice(0, 2)
    .join('\n');
}

/**
 * Question en « post de forum » (salon forum Discord / fil Reddit) : auteur, titre,
 * extrait d'erreur en bloc de code liseré, étiquettes et nombre de réponses.
 */
export function QuestionCard({
  q,
  className,
  showBlocked,
}: {
  q: QuestionListItem;
  className?: string;
  showBlocked?: boolean;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const resolved = q.status === 'resolved';
  const blockedMin = (Date.now() - new Date(q.createdAt).getTime()) / 60000;
  const snippet = q.codeSnippet ? snippetPreview(q.codeSnippet) : '';
  const urgent = q.urgency === 'high' && !resolved;
  return (
    <Link
      to={`/sos/${q.id}`}
      onMouseEnter={() => preload.question(q.id)}
      onFocus={() => preload.question(q.id)}
      className={cn('dh-panel dh-panel-link group block px-4 pt-3 pb-3.5', className)}
    >
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <Avatar name={q.author.displayName} src={q.author.avatarUrl} size={22} />
        <span className="truncate font-semibold text-fg">
          {q.author.id === me?.id ? t('common.you') : q.author.displayName}
        </span>
        {q.author.isDemo && <DemoBadge />}
        <span className="shrink-0 text-subtle">
          {showBlocked && !resolved
            ? t('home.blockedFor', { time: duration(blockedMin, lang) })
            : relativeTime(q.createdAt, lang)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {urgent && (
            <Badge tone="danger" size="sm" className="font-semibold">
              {t('sos.urgency.high')}
            </Badge>
          )}
          {resolved ? (
            <Badge tone="success" size="sm" className="font-semibold">
              <CheckCircle2 />
              {t('sos.resolved')}
            </Badge>
          ) : q.claimedBy ? (
            <Badge tone="accent" size="sm" className="font-semibold">
              <Hand />
              {t('sos.claimedBy', { name: q.claimedBy.displayName.split(' ')[0] })}
            </Badge>
          ) : null}
        </span>
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-[16px] font-semibold leading-snug text-fg">
        {q.title}
      </h3>
      {snippet && (
        <pre
          className={cn(
            'mt-2 overflow-hidden rounded-[8px] bg-surface-1 px-3 py-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-muted',
          )}
        >
          <span className="line-clamp-2">{snippet}</span>
        </pre>
      )}
      <div className="mt-2.5 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {q.tags.slice(0, 4).map((tag) => (
            <TechTag key={tag.id} label={tag.label} />
          ))}
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[13px] font-semibold',
            q.answerCount === 0 && !resolved ? 'text-warning' : 'text-muted',
          )}
        >
          <MessageSquareText className="size-4" />
          {q.answerCount ? q.answerCount : t('sos.noAnswer')}
        </span>
      </div>
    </Link>
  );
}

/* ---------------- Salles ---------------- */

const STATE_TONE = { idea: 'amber', building: 'sky', beta: 'lavender', live: 'mint' } as const;

export function RoomCard({ room, className }: { room: RoomListItem; className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/p/${room.inviteCode}`}
      onMouseEnter={() => preload.room(room.inviteCode)}
      onFocus={() => preload.room(room.inviteCode)}
      className={cn('surface-card card-hover group flex flex-col overflow-hidden', className)}
    >
      <div className="relative h-28 overflow-hidden bg-surface-3">
        {room.coverUrl ? (
          <img
            src={room.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full bg-hero opacity-70" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,var(--surface-1))] transition-opacity group-hover:opacity-0"
        />
        <Badge tone={STATE_TONE[room.state]} size="sm" className="absolute top-3 right-3 shadow-md">
          {t(`projects.state.${room.state}`)}
        </Badge>
      </div>
      <div className="relative -mt-7 flex flex-1 flex-col gap-3 px-4 pb-4 sm:px-5">
        <div className="flex items-end gap-3">
          <RoomIcon
            room={room}
            size={52}
            className="rounded-[10px] ring-4 ring-surface-1 group-hover:ring-surface-2"
          />
          <h3 className="truncate pb-1 text-[16px] font-semibold tracking-tight text-fg">
            {room.name}
          </h3>
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted">{room.tagline}</p>
        <div className="flex flex-wrap gap-1.5">
          {room.tags.slice(0, 4).map((tag) => (
            <TechTag key={tag.id} label={tag.label} />
          ))}
        </div>
        {room.wantedRoles.length > 0 && (
          <p className="line-clamp-1 text-[12.5px] text-subtle">
            <span className="font-medium text-muted">{t('projects.wanted')} · </span>
            {room.wantedRoles.join(', ')}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[12.5px]">
          <AvatarStack people={room.members} size={24} />
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold',
              room.openTasks ? 'text-accent-text' : 'text-subtle',
            )}
          >
            <FolderGit2 className="size-3.5" />
            {t('projects.openTasks', { count: room.openTasks })}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Monogramme coloré d'une salle (comme une icône de serveur Discord). */
export function RoomMark({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const tones = ['bg-lavender', 'bg-sky', 'bg-rose', 'bg-amber', 'bg-mint'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        'grid shrink-0 place-items-center rounded-[30%] font-semibold text-pastel-fg',
        tones[h % tones.length],
        className,
      )}
    >
      {name.slice(0, 2)}
    </span>
  );
}

/** Icône d'une salle : sa bannière recadrée si elle existe, sinon un monogramme coloré. */
export function RoomIcon({
  room,
  size = 40,
  className,
}: {
  room: { name: string; coverUrl?: string | null };
  size?: number;
  className?: string;
}) {
  if (room.coverUrl)
    return (
      <img
        src={room.coverUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className={cn('shrink-0 rounded-[30%] object-cover', className)}
      />
    );
  return <RoomMark name={room.name} size={size} className={className} />;
}

/* ---------------- Devs ---------------- */

export function DevCard({
  dev,
  reason,
  className,
}: {
  dev: DevCardT;
  reason?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <Link
      to={`/u/${dev.handle}`}
      onMouseEnter={() => preload.passport(dev.handle)}
      onFocus={() => preload.passport(dev.handle)}
      className={cn('surface-card card-hover group flex flex-col gap-3 p-4', className)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar name={dev.displayName} src={dev.avatarUrl} size={48} />
          <StatusDot
            tone={
              dev.availability.status === 'now'
                ? 'success'
                : dev.availability.status === 'today'
                  ? 'warning'
                  : 'neutral'
            }
            className="absolute -right-0.5 -bottom-0.5 size-3.5 ring-[3px] ring-surface-1"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-fg">{dev.displayName}</span>
            {dev.isDemo && <DemoBadge />}
          </div>
          <div className="truncate text-[12.5px] text-subtle">
            {[dev.city, countryName(dev.country, lang)].filter(Boolean).join(', ')} ·{' '}
            {formatUtc(dev.utcOffset)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular text-fg">{dev.totalXp}</div>
          <div className="text-[10.5px] text-subtle">XP</div>
        </div>
      </div>
      {reason && (
        <p className="rounded-[6px] bg-accent-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-accent-text">
          {reason}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {dev.topSkills.slice(0, 3).map((s) => (
          <div key={s.tagId} className="flex items-center gap-2.5">
            <span className="inline-flex w-28 min-w-0 items-center gap-1.5 text-[12.5px] text-muted">
              <BrandLogo name={s.tag.label} size={12} />
              <span className="truncate">{s.tag.label}</span>
            </span>
            <ScoreBar g={s.githubSignal} p={Math.min(60, s.xpTag)} height={6} className="flex-1" />
            <span className="w-6 text-right text-[11.5px] font-semibold tabular text-fg">
              {s.score}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {dev.availability.forMission && (
          <Badge tone="success" size="sm">
            <BadgeCheck />
            {t('passport.mission')}
          </Badge>
        )}
        {dev.languages.map((l) => (
          <Badge key={l} tone="outline" size="sm" className="uppercase">
            {l}
          </Badge>
        ))}
      </div>
    </Link>
  );
}

/* ---------------- Fil d'activité (image 05) ---------------- */

const ACTIVITY_ICON = {
  resolved: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  answered: { icon: MessageSquareText, tone: 'bg-blue-soft text-blue-text' },
  asked: { icon: Sparkles, tone: 'bg-accent-soft text-accent-text' },
  joined: { icon: UserPlus, tone: 'bg-sky text-pastel-fg' },
  'task-done': { icon: GitPullRequestArrow, tone: 'bg-mint text-pastel-fg' },
  'room-created': { icon: FolderGit2, tone: 'bg-amber text-pastel-fg' },
} as const;

export function ActivityFeed({ items, className }: { items: ActivityItem[]; className?: string }) {
  const lang = useLang();
  const { t } = useTranslation();
  const verb = (k: ActivityItem['kind']) => t(`activity.${k}`);
  return (
    <ol className={cn('relative flex flex-col', className)}>
      {items.map((it, i) => {
        const I = ACTIVITY_ICON[it.kind];
        return (
          <li key={it.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && (
              <span aria-hidden className="absolute top-9 bottom-0 left-[15px] w-px bg-line" />
            )}
            <span
              className={cn(
                'relative z-10 grid size-[31px] shrink-0 place-items-center rounded-full',
                I.tone,
              )}
            >
              <I.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-muted">
                  <Link
                    to={`/u/${it.actor.handle}`}
                    className="font-semibold text-fg hover:underline"
                  >
                    {it.actor.displayName}
                  </Link>{' '}
                  {verb(it.kind)}{' '}
                  <Link to={it.targetHref} className="font-semibold text-fg hover:underline">
                    {it.targetLabel}
                  </Link>
                  {it.kind === 'resolved' && it.detail && (
                    <span className="text-success">
                      {' '}
                      · {t('landing.minutes', { count: Number(it.detail) })}
                    </span>
                  )}
                </p>
                <time dateTime={it.createdAt} className="shrink-0 text-xs text-subtle">
                  {relativeTime(it.createdAt, lang)}
                </time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- En-tête de page ---------------- */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[14px] font-medium text-muted">{eyebrow}</p>}
        <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.02em] text-fg sm:text-[42px]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function errorText(t: (k: string, o?: Record<string, unknown>) => string, err: unknown) {
  const code = (err as { code?: string })?.code;
  if (code) {
    const msg = t(errorKey(code), { defaultValue: '' });
    if (msg) return msg;
  }
  return t('errors.generic');
}
