import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  GitPullRequestArrow,
  Link2,
  ListPlus,
  MessageSquarePlus,
  Plus,
  Send,
  ShieldQuestion,
  UserPlus,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/djeli';
import { DemoBadge, errorText, RoomIcon, UserLink } from '@/components/domain';
import { GitHubIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Markdown } from '@/components/ui/code';
import { DropMenu, MenuItem, Sheet, useMedia } from '@/components/ui/overlay';
import {
  Avatar,
  AvatarStack,
  Badge,
  Card,
  CardHeader,
  Field,
  Input,
  Skeleton,
  Textarea,
  TechTag,
} from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { relativeTime, useLang } from '@/i18n';
import { invalidate, useQuery } from '@/lib/query';
import { cn, uuid } from '@/lib/utils';
import { enqueue, requireNetwork, useNetwork } from '@/offline/network';
import { api, type RoomDetail, type TaskLevel, type TaskStatus } from '@/services';
import { useSession, useUI } from '@/stores/app';
import { WithPanel } from './_layout';

type Tab = 'tasks' | 'discussion' | 'members' | 'requests';
const STATE_TONE = { idea: 'amber', building: 'sky', beta: 'lavender', live: 'mint' } as const;
const LEVEL_TONE: Record<TaskLevel, 'mint' | 'sky' | 'rose'> = {
  starter: 'mint',
  intermediate: 'sky',
  advanced: 'rose',
};

export default function Room() {
  const { code = '' } = useParams();
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'tasks';
  const lg = useMedia('(min-width: 1024px)');
  const {
    data: room,
    error,
    refresh,
  } = useQuery<RoomDetail>(`room:${code}`, () => api.getRoom(code));
  const [joinOpen, setJoinOpen] = useState(false);

  if (error)
    return (
      <div className="mx-auto max-w-3xl p-6">
        {(error as { code?: string }).code === 'not-found' ? (
          <EmptyState
            title={t('room.notFound')}
            action={
              <ButtonLink to="/projets" variant="secondary">
                {t('nav.projects')}
              </ButtonLink>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={refresh} />
        )}
      </div>
    );
  if (!room) return <RoomSkeleton />;

  const isOwner = room.myMembership === 'owner';
  const isMember = isOwner || room.myMembership === 'member';
  const done = room.tasks.filter((x) => x.status === 'done').length;
  const contributors = new Set(room.tasks.filter((x) => x.assigneeId).map((x) => x.assigneeId))
    .size;
  const daysIdle = (Date.now() - new Date(room.lastActivityAt).getTime()) / 864e5;

  const copyInvite = () => {
    void navigator.clipboard?.writeText(`${location.origin}/p/${room.inviteCode}`);
    toast.success(t('room.inviteCopied'));
  };

  const panel = (
    <>
      <Card className="p-4">
        <CardHeader title={t('room.about')} />
        <div className="mt-3 text-sm">
          <Markdown className="text-[14px]">{room.description}</Markdown>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {room.tags.map((tag) => (
            <TechTag key={tag.id} label={tag.label} />
          ))}
        </div>
      </Card>
      {room.wantedRoles.length > 0 && (
        <Card className="p-4">
          <CardHeader title={t('room.wantedRoles')} />
          <ul className="mt-3 flex flex-col gap-2">
            {room.wantedRoles.map((r) => (
              <li
                key={r}
                className="flex items-center justify-between gap-2 rounded-[12px] bg-surface-3 px-3 py-2 text-sm text-fg"
              >
                {r}
                {me && !isMember && room.myMembership !== 'pending' && (
                  <Button size="xs" variant="pill" onClick={() => setJoinOpen(true)}>
                    {t('room.apply')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="p-4">
        <CardHeader icon={<Activity />} title={t('room.health')} />
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-subtle">{t('room.lastActivity')}</dt>
            <dd className="font-semibold text-fg">{relativeTime(room.lastActivityAt, lang)}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t('room.contributors')}</dt>
            <dd className="font-semibold tabular text-fg">{contributors}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t('room.doneTasks')}</dt>
            <dd className="font-semibold tabular text-fg">
              {done}/{room.tasks.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{t('room.status')}</dt>
            <dd>
              <Badge tone={daysIdle < 14 ? 'success' : 'warning'} size="sm">
                {daysIdle < 14 ? t('room.active') : t('room.dormant')}
              </Badge>
            </dd>
          </div>
        </dl>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${room.tasks.length ? (done / room.tasks.length) * 100 : 0}%` }}
          />
        </div>
      </Card>
    </>
  );

  return (
    <WithPanel panel={panel} panelTitle={t('room.about')}>
      <header className="flex flex-col gap-5">
        <div className="surface-card relative overflow-hidden !rounded-[24px]">
          <div className="relative h-36 sm:h-48">
            {room.coverUrl ? (
              <img src={room.coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-hero" />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,color-mix(in_oklab,var(--surface-2),transparent_2%))]"
            />
            <Badge tone={STATE_TONE[room.state]} className="absolute top-4 right-4 shadow-md">
              {t(`projects.state.${room.state}`)}
            </Badge>
          </div>
          <div className="relative -mt-12 flex flex-col gap-3 px-5 pb-5 sm:-mt-14 sm:flex-row sm:items-end sm:px-6">
            <RoomIcon room={room} size={88} className="ring-[5px] ring-surface-2 shadow-lg" />
            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-fg sm:text-[32px]">
                {room.name}
              </h1>
              <p className="mt-1 text-[15px] text-muted">{room.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a
                  href={`https://github.com/${room.repoFullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[13px] text-fg hover:underline"
                >
                  <GitHubIcon className="size-4" />
                  {room.repoFullName}
                  {room.repoVerified && (
                    <BadgeCheck
                      className="size-4 text-success"
                      aria-label={t('room.verifiedRepo')}
                    />
                  )}
                </a>
                {room.demoUrl && (
                  <a
                    href={room.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-text hover:underline"
                  >
                    {t('projects.demo')} <ExternalLink className="size-3.5" />
                  </a>
                )}
                <span className="inline-flex items-center gap-2 text-subtle">
                  <AvatarStack people={room.members} size={24} />
                  {t('projects.members', { count: room.memberCount })}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!me ? (
            <ButtonLink
              to={`/connexion?next=/p/${room.inviteCode}`}
              variant="primary"
              icon={<UserPlus />}
            >
              {t('room.join')}
            </ButtonLink>
          ) : room.myMembership === 'none' ? (
            <Button variant="primary" icon={<UserPlus />} onClick={() => setJoinOpen(true)}>
              {t('room.join')}
            </Button>
          ) : room.myMembership === 'pending' ? (
            <Badge tone="warning" className="h-10 rounded-[12px] px-3 text-sm">
              {t('room.pending')}
            </Badge>
          ) : (
            <Badge tone="success" className="h-10 rounded-[12px] px-3 text-sm">
              <CheckCircle2 />
              {isOwner ? t('room.owner') : t('room.member')}
            </Badge>
          )}
          <Button variant="secondary" icon={<Link2 />} onClick={copyInvite}>
            {t('room.invite')}
          </Button>
          {isOwner && (
            <DropMenu
              trigger={
                <Button variant="secondary" icon={<ShieldQuestion />}>
                  {t('room.feedback')}
                </Button>
              }
            >
              {(['feedback', 'code-review'] as const).map((k) => (
                <MenuItem
                  key={k}
                  onSelect={async () => {
                    try {
                      requireNetwork();
                      await api.requestFeedback(room.id, k);
                      toast.success(t('room.feedbackSent'));
                    } catch (e) {
                      toast.error(errorText(t, e));
                    }
                  }}
                >
                  {k === 'feedback' ? t('room.feedback') : t('room.review')}
                </MenuItem>
              ))}
            </DropMenu>
          )}
        </div>
      </header>

      {!lg && (
        <Segmented<Tab>
          label={room.name}
          className="mt-6"
          value={tab}
          glow
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          items={[
            { value: 'tasks', label: t('room.tabs.tasks'), count: room.openTasks },
            { value: 'discussion', label: t('room.tabs.discussion') },
            { value: 'members', label: t('room.tabs.members') },
            ...(isOwner
              ? [
                  {
                    value: 'requests' as Tab,
                    label: t('room.tabs.requests'),
                    count: room.requests.length,
                  },
                ]
              : []),
          ]}
        />
      )}

      <div key={tab} className="dh-page mt-6">
        {tab === 'tasks' && <Kanban room={room} />}
        {tab === 'discussion' && <Discussion room={room} />}
        {tab === 'members' && <Members room={room} />}
        {tab === 'requests' && isOwner && <Requests room={room} />}
      </div>

      <JoinSheet open={joinOpen} onOpenChange={setJoinOpen} roomId={room.id} roomName={room.name} />
    </WithPanel>
  );
}

/* ---------------- Kanban (R11) ---------------- */

function Kanban({ room }: { room: RoomDetail }) {
  const { t } = useTranslation();
  const me = useSession((s) => s.user);
  const queue = useNetwork((s) => s.queue);
  const [newOpen, setNewOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const isOwner = room.myMembership === 'owner';
  const isMember = isOwner || room.myMembership === 'member';
  const cols: TaskStatus[] = ['open', 'taken', 'review', 'done'];
  const pendingTake = new Set(
    queue
      .filter((x) => x.type === 'take-task')
      .map((x) => (x.type === 'take-task' ? x.payload.taskId : '')),
  );

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      requireNetwork();
      await fn();
      invalidate('');
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(errorText(t, e));
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{t('projects.openTasks', { count: room.openTasks })}</p>
        {isMember && (
          <Button variant="primary" size="sm" icon={<ListPlus />} onClick={() => setNewOpen(true)}>
            {t('room.newTask')}
          </Button>
        )}
      </div>
      {room.tasks.length === 0 ? (
        <EmptyState pose="point" title={t('room.noTasks')} />
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 2xl:grid-cols-4">
          {cols.map((col) => {
            const tasks = room.tasks.filter((x) => x.status === col);
            return (
              <section
                key={col}
                className="flex w-[82vw] shrink-0 snap-start flex-col gap-2.5 rounded-[18px] bg-surface-1 p-3 sm:w-[300px] md:w-auto"
              >
                <header className="flex items-center justify-between px-1.5 pt-1">
                  <h3 className="text-[13px] font-semibold text-fg">{t(`room.columns.${col}`)}</h3>
                  <span className="text-xs font-semibold tabular text-subtle">{tasks.length}</span>
                </header>
                {tasks.length === 0 && (
                  <p className="rounded-[12px] border border-dashed border-line px-3 py-5 text-center text-xs text-subtle">
                    {t('room.emptyColumn')}
                  </p>
                )}
                {tasks.map((task) => {
                  const mine = task.assigneeId === me?.id;
                  return (
                    <article
                      key={task.id}
                      className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface-2 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-snug text-fg">{task.title}</h4>
                        <Badge tone={LEVEL_TONE[task.level]} size="sm" className="shrink-0">
                          {t(`room.level.${task.level}`)}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="line-clamp-3 text-[12.5px] leading-snug text-muted">
                          {task.description}
                        </p>
                      )}
                      {task.prUrl && (
                        <a
                          href={task.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-text hover:underline"
                        >
                          <GitPullRequestArrow className="size-3.5" />
                          PR #{task.prUrl.split('/').pop()}
                        </a>
                      )}
                      {task.status === 'done' && task.prVerified !== null && (
                        <Badge
                          tone={task.prVerified ? 'success' : 'neutral'}
                          size="sm"
                          className="self-start"
                        >
                          {task.prVerified ? <BadgeCheck /> : null}
                          {task.prVerified ? t('room.verifiedByGithub') : t('room.declared')}
                        </Badge>
                      )}
                      <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                        {task.assignee ? (
                          <UserLink user={task.assignee} size={20} className="text-xs" />
                        ) : (
                          <span className="text-xs text-subtle">—</span>
                        )}
                        <div className="flex gap-1">
                          {task.status === 'open' && isMember && (
                            <Button
                              size="xs"
                              variant="primary"
                              disabled={pendingTake.has(task.id)}
                              onClick={async () => {
                                const r = await enqueue(
                                  {
                                    type: 'take-task',
                                    payload: { taskId: task.id, taskTitle: task.title },
                                  },
                                  me!.id,
                                  uuid(),
                                ).catch((e) => {
                                  toast.error(errorText(t, e));
                                  return null;
                                });
                                if (r?.queued) toast(t('network.queued'));
                                else if (r) toast.success(t('room.taken'));
                              }}
                            >
                              {pendingTake.has(task.id) ? <WifiOff /> : null}
                              {t('room.take')}
                            </Button>
                          )}
                          {task.status === 'open' && !isMember && me && (
                            <span className="text-[11px] text-subtle">{t('room.membersOnly')}</span>
                          )}
                          {task.status === 'taken' && mine && (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => act(() => api.moveTask(task.id, 'review'))}
                            >
                              {t('room.toReview')}
                            </Button>
                          )}
                          {(task.status === 'taken' || task.status === 'review') &&
                            (mine || isOwner) && (
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => act(() => api.moveTask(task.id, 'open'))}
                              >
                                {t('room.backToOpen')}
                              </Button>
                            )}
                          {(task.status === 'taken' || task.status === 'review') && isOwner && (
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => setCompleteId(task.id)}
                            >
                              {t('room.complete')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      <NewTaskSheet open={newOpen} onOpenChange={setNewOpen} roomId={room.id} />
      <CompleteSheet taskId={completeId} room={room} onClose={() => setCompleteId(null)} />
    </>
  );
}

function NewTaskSheet({
  open,
  onOpenChange,
  roomId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomId: string;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [level, setLevel] = useState<TaskLevel>('starter');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('room.newTask')}
      footer={
        <Button
          variant="primary"
          loading={busy}
          disabled={title.trim().length < 4}
          onClick={async () => {
            setBusy(true);
            try {
              requireNetwork();
              await api.createTask(roomId, { title, description: desc, level });
              invalidate('');
              toast.success(t('room.taskCreated'));
              setTitle('');
              setDesc('');
              onOpenChange(false);
            } catch (e) {
              toast.error(errorText(t, e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('room.createTask')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('room.taskTitle')} htmlFor="task-title">
          <Input
            id="task-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label={t('room.taskDesc')} htmlFor="task-desc">
          <Textarea id="task-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label={t('room.taskLevel')}>
          <Segmented<TaskLevel>
            label={t('room.taskLevel')}
            value={level}
            onChange={setLevel}
            size="sm"
            items={(['starter', 'intermediate', 'advanced'] as TaskLevel[]).map((l) => ({
              value: l,
              label: t(`room.level.${l}`),
            }))}
          />
        </Field>
      </div>
    </Sheet>
  );
}

/** R8 + R9 : validation avec lien de PR, vérifiée sur GitHub. */
function CompleteSheet({
  taskId,
  room,
  onClose,
}: {
  taskId: string | null;
  room: RoomDetail;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const task = room.tasks.find((x) => x.id === taskId);
  const [pr, setPr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={!!taskId}
      onOpenChange={(o) => !o && onClose()}
      title={t('room.completeTitle')}
      description={t('room.completeText')}
      size="sm"
      footer={
        <Button
          variant="success"
          loading={busy}
          icon={<CheckCircle2 />}
          disabled={!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/.test(pr)}
          onClick={async () => {
            if (!task) return;
            setBusy(true);
            try {
              requireNetwork();
              const r = await api.completeTask(task.id, pr);
              invalidate('');
              toast.success(
                t('room.completed', { points: r.gained, name: task.assignee?.displayName ?? '' }),
                {
                  description: r.verified ? t('room.verifiedByGithub') : t('room.declared'),
                },
              );
              setPr('');
              onClose();
            } catch (e) {
              toast.error(errorText(t, e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('common.confirm')}
        </Button>
      }
    >
      {task && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] bg-surface-2 p-3">
            <p className="text-sm font-semibold text-fg">{task.title}</p>
            {task.assignee && (
              <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                <Avatar name={task.assignee.displayName} src={task.assignee.avatarUrl} size={18} />{' '}
                {task.assignee.displayName} · +15 Proof XP
              </p>
            )}
          </div>
          <Field label={t('room.prUrl')} htmlFor="pr-url">
            <Input
              id="pr-url"
              type="url"
              value={pr}
              onChange={(e) => setPr(e.target.value)}
              placeholder={`https://github.com/${room.repoFullName}/pull/1`}
              className="font-mono text-[13px]"
            />
          </Field>
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- Discussion (R4) + point du jour (R14) ---------------- */

function Discussion({ room }: { room: RoomDetail }) {
  const { t } = useTranslation();
  const lang = useLang();
  const me = useSession((s) => s.user);
  const setAsk = useUI((s) => s.setAsk);
  const queue = useNetwork((s) => s.queue);
  const [body, setBody] = useState('');
  const [standup, setStandup] = useState(false);
  const [done, setDone] = useState('');
  const [nextS, setNextS] = useState('');
  const [blocked, setBlocked] = useState('');
  const isMember = room.myMembership === 'owner' || room.myMembership === 'member';
  const pending = queue.filter(
    (x) =>
      x.type === 'message' &&
      x.payload.roomId === room.id &&
      !room.messages.some((m) => m.clientId === x.id),
  );

  const send = async (text: string, kind: 'message' | 'standup' = 'message') => {
    if (!me || !text.trim()) return;
    try {
      const r = await enqueue(
        { type: 'message', payload: { roomId: room.id, body: text, kind, roomName: room.name } },
        me.id,
        uuid(),
      );
      if (r.queued) toast(t('network.queued'));
    } catch (e) {
      toast.error(errorText(t, e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {room.messages.length === 0 && pending.length === 0 ? (
        <EmptyState compact pose="wave" title={t('room.noMessages')} />
      ) : (
        <ol className="flex flex-col gap-1">
          {room.messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                'flex gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-surface-1',
                m.kind === 'standup' && 'border border-line bg-surface-1',
              )}
            >
              <Avatar name={m.author.displayName} src={m.author.avatarUrl} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-fg">{m.author.displayName}</span>
                  {m.author.isDemo && <DemoBadge />}
                  {m.kind === 'standup' && (
                    <Badge tone="accent" size="sm">
                      {t('room.standup')}
                    </Badge>
                  )}
                  <time className="text-xs text-subtle">{relativeTime(m.createdAt, lang)}</time>
                </div>
                <div className="mt-0.5 text-[14.5px]">
                  <Markdown>{m.body}</Markdown>
                </div>
              </div>
            </li>
          ))}
          {pending.map((p) =>
            p.type === 'message' ? (
              <li key={p.id} className="flex gap-3 rounded-[14px] px-3 py-2.5 opacity-75">
                <Avatar name={me?.displayName ?? ''} src={me?.avatarUrl} size={34} />
                <div className="min-w-0 flex-1">
                  <Badge tone="warning" size="sm">
                    <WifiOff />
                    {t('question.pendingAnswer')}
                  </Badge>
                  <p className="mt-1 text-[14.5px] text-fg">{p.payload.body}</p>
                </div>
              </li>
            ) : null,
          )}
        </ol>
      )}

      {isMember ? (
        <div className="sticky bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+8px)] flex flex-col gap-2 rounded-[18px] border border-line bg-surface-1 p-2.5 shadow-md sm:bottom-4">
          <div className="flex items-end gap-2">
            <label htmlFor="room-msg" className="sr-only">
              {t('room.messagePlaceholder')}
            </label>
            <Textarea
              id="room-msg"
              rows={1}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(body);
                  setBody('');
                }
              }}
              placeholder={t('room.messagePlaceholder')}
              className="min-h-11 flex-1 resize-none border-transparent bg-surface-2 shadow-none"
            />
            <Button
              variant="primary"
              size="icon"
              aria-label={t('common.send')}
              disabled={!body.trim()}
              onClick={() => {
                void send(body);
                setBody('');
              }}
            >
              <Send />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="xs"
            icon={<MessageSquarePlus />}
            className="self-start"
            onClick={() => setStandup(true)}
          >
            {t('room.standup')}
          </Button>
        </div>
      ) : (
        <p className="rounded-[14px] bg-surface-1 p-4 text-center text-sm text-muted">
          {t('room.membersOnly')}
        </p>
      )}

      <Sheet
        open={standup}
        onOpenChange={setStandup}
        title={t('room.standup')}
        footer={
          <>
            {blocked.trim() && (
              <Button
                variant="secondary"
                icon={<Zap />}
                onClick={() => {
                  setStandup(false);
                  setAsk(true, { roomId: room.id, tagIds: room.tagIds, title: blocked });
                }}
              >
                {t('room.askFromStandup')}
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!done.trim() && !nextS.trim()}
              onClick={async () => {
                const text = [
                  `**${t('room.standupDone')}** : ${done}`,
                  `**${t('room.standupNext')}** : ${nextS}`,
                  blocked ? `**${t('room.standupBlocked')}** : ${blocked}` : '',
                ]
                  .filter(Boolean)
                  .join('\n\n');
                await send(text, 'standup');
                setStandup(false);
                setDone('');
                setNextS('');
              }}
            >
              {t('room.standupPost')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('room.standupDone')} htmlFor="su-done">
            <Textarea
              id="su-done"
              value={done}
              onChange={(e) => setDone(e.target.value)}
              className="min-h-16"
            />
          </Field>
          <Field label={t('room.standupNext')} htmlFor="su-next">
            <Textarea
              id="su-next"
              value={nextS}
              onChange={(e) => setNextS(e.target.value)}
              className="min-h-16"
            />
          </Field>
          <Field
            label={t('room.standupBlocked')}
            htmlFor="su-blocked"
            hint={t('room.standupBlockedHint')}
            optional={t('common.optional')}
          >
            <Input id="su-blocked" value={blocked} onChange={(e) => setBlocked(e.target.value)} />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function Members({ room }: { room: RoomDetail }) {
  const { t } = useTranslation();
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {room.members.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-3 rounded-[16px] border border-line bg-surface-2 p-3"
        >
          <UserLink user={m} size={36} />
          <Badge tone={m.id === room.ownerId ? 'accent' : 'neutral'} size="sm">
            {m.id === room.ownerId ? t('room.owner') : t('room.member')}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function Requests({ room }: { room: RoomDetail }) {
  const { t } = useTranslation();
  const lang = useLang();
  if (!room.requests.length) return <EmptyState compact title={t('room.requestsEmpty')} />;
  return (
    <ul className="flex flex-col gap-3">
      {room.requests.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface-2 p-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <UserLink user={r.user} size={32} />
              <span className="text-xs text-subtle">{relativeTime(r.createdAt, lang)}</span>
            </div>
            {r.message && <p className="mt-2 text-sm text-muted">« {r.message} »</p>}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={async () => {
                try {
                  requireNetwork();
                  await api.respondJoin(r.id, true);
                  invalidate('');
                } catch (e) {
                  toast.error(errorText(t, e));
                }
              }}
            >
              {t('room.accept')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  requireNetwork();
                  await api.respondJoin(r.id, false);
                  invalidate('');
                } catch (e) {
                  toast.error(errorText(t, e));
                }
              }}
            >
              {t('room.decline')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function JoinSheet({
  open,
  onOpenChange,
  roomId,
  roomName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomId: string;
  roomName: string;
}) {
  const { t } = useTranslation();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${t('room.join')} · ${roomName}`}
      size="sm"
      footer={
        <Button
          variant="primary"
          icon={<Plus />}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              requireNetwork();
              await api.requestJoin(roomId, msg);
              invalidate('');
              toast.success(t('room.joinSent'));
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
      <Field label={t('room.joinMessage')} htmlFor="join-msg" optional={t('common.optional')}>
        <Textarea
          id="join-msg"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={t('room.joinPlaceholder')}
        />
      </Field>
    </Sheet>
  );
}

function RoomSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-[20px]" />
        <div className="flex-1">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="mt-8 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
