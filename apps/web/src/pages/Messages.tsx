import type { ConversationView, DirectMessageView } from '@devhub/contracts';
import {
  ArrowLeft,
  Ban,
  Flag,
  MessagesSquare,
  MoreHorizontal,
  Search,
  SendHorizontal,
  UserRound,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { DropMenu, MenuItem } from '@/components/ui/overlay';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { MESSAGE_ERRORS, messages } from '@/platform/messages';
import { Ago } from '@/platform/ui';
import { useTopic } from '@/services/realtime';

const errText = (e: unknown) =>
  MESSAGE_ERRORS[(e as { code?: string }).code ?? ''] ?? 'Une erreur est survenue. Réessaie.';

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const hour = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Messagerie privée : liste des conversations et fil de discussion en temps réel. */
export default function Messages() {
  const { id } = useParams();
  return (
    <div className="dh-page mx-auto flex h-[calc(100dvh-56px-64px-env(safe-area-inset-bottom))] w-full max-w-[1200px] gap-4 px-0 sm:h-[calc(100dvh-56px-24px)] sm:px-4 sm:py-3 lg:h-[calc(100dvh-64px)] lg:px-6 lg:pb-6">
      <aside
        className={cn(
          'flex min-h-0 w-full flex-col sm:rounded-[14px] sm:bg-surface-1 md:w-[340px] md:shrink-0',
          id && 'hidden md:flex',
        )}
      >
        <ConversationList activeId={id ?? null} />
      </aside>
      <section
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col sm:rounded-[14px] sm:bg-surface-1',
          !id && 'hidden md:flex',
        )}
      >
        {id ? <Thread key={id} id={id} /> : <EmptyThread />}
      </section>
    </div>
  );
}

function ConversationList({ activeId }: { activeId: string | null }) {
  const { data, loading } = useQuery('conversations', () => messages.list());
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.data ?? []).filter(
      (c) => !s || c.peer.displayName.toLowerCase().includes(s) || c.peer.handle.includes(s),
    );
  }, [data, q]);

  return (
    <>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-fg">Messages</h1>
        <label className="mt-3 flex h-10 items-center gap-2 rounded-full bg-canvas px-3.5 text-[14px] ring-1 ring-line focus-within:ring-accent">
          <Search className="size-4 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher une conversation"
            aria-label="Chercher une conversation"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle"
          />
        </label>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="p-2">
              <Skeleton className="h-14 rounded-[10px]" />
            </li>
          ))}
        {data && shown.length === 0 && (
          <li className="px-3 py-8 text-center text-[13.5px] text-muted">
            {q ? 'Aucune conversation ne correspond.' : 'Aucune conversation pour l’instant.'}
          </li>
        )}
        {shown.map((c) => (
          <li key={c.id}>
            <ConversationRow c={c} active={c.id === activeId} />
          </li>
        ))}
      </ul>
    </>
  );
}

function ConversationRow({ c, active }: { c: ConversationView; active: boolean }) {
  return (
    <Link
      to={`/messages/${c.id}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 transition-colors',
        active ? 'bg-accent-soft' : 'hover:bg-surface-2',
      )}
    >
      <Avatar name={c.peer.displayName} src={c.peer.avatarUrl} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              'truncate text-[14.5px] text-fg',
              c.unread ? 'font-bold' : 'font-semibold',
            )}
          >
            {c.peer.displayName}
          </span>
          {c.lastMessage && (
            <Ago iso={c.lastMessage.at} className="ml-auto shrink-0 text-[12px] text-subtle" />
          )}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[13px]',
              c.unread ? 'font-medium text-fg' : 'text-muted',
            )}
          >
            {c.lastMessage
              ? `${c.lastMessage.mine ? 'Toi : ' : ''}${c.lastMessage.body || 'Message masqué'}`
              : 'Nouvelle conversation'}
          </span>
          {c.unread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
              {c.unread > 99 ? '99+' : c.unread}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

function EmptyThread() {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text">
          <MessagesSquare className="size-7" />
        </span>
        <h2 className="mt-4 text-[18px] font-semibold text-fg">Tes conversations</h2>
        <p className="mt-1.5 text-[14px] text-muted">
          Écris à un dev depuis son Passport : proposer un projet, demander un conseil, recruter.
          Les messages arrivent en direct.
        </p>
        <Link
          to="/decouvrir"
          className="mt-4 inline-flex h-10 items-center rounded-full bg-accent px-5 text-[14px] font-semibold text-white hover:bg-accent-hover"
        >
          Trouver des devs
        </Link>
      </div>
    </div>
  );
}

interface Pending {
  clientId: string;
  body: string;
  failed: boolean;
}

function Thread({ id }: { id: string }) {
  const nav = useNavigate();
  const key = `dm:${id}`;
  const { data, error } = useQuery(key, () => messages.thread(id));
  useTopic(key, key);
  const [older, setOlder] = useState<DirectMessageView[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const conv = data?.conversation;

  // Tout ce qui est affiché est lu : on le dit au serveur, la liste et le badge se mettent à jour.
  useEffect(() => {
    if (conv && conv.unread > 0)
      void messages
        .read(id)
        .then(() => invalidate('conversations'))
        .catch(() => undefined);
  }, [conv, id]);
  useEffect(() => {
    if (data) invalidate('conversations');
  }, [data]);

  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...older, ...(data?.data ?? [])].filter((m) => !seen.has(m.id) && seen.add(m.id));
  }, [older, data]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [all.length, pending.length]);

  const loadOlder = async () => {
    const first = all[0];
    if (!first) return;
    const el = scroller.current;
    const before = el?.scrollHeight ?? 0;
    try {
      const r = await messages.thread(id, first.createdAt);
      stick.current = false;
      setOlder((o) => [...r.data, ...o]);
      setHasMoreOlder(r.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - before;
      });
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const deliver = async (p: Pending) => {
    setPending((list) =>
      list.map((x) => (x.clientId === p.clientId ? { ...x, failed: false } : x)),
    );
    try {
      await messages.send(id, p.body, p.clientId);
      stick.current = true;
      await invalidate(key);
      setPending((list) => list.filter((x) => x.clientId !== p.clientId));
    } catch (e) {
      setPending((list) =>
        list.map((x) => (x.clientId === p.clientId ? { ...x, failed: true } : x)),
      );
      toast.error(errText(e));
    }
  };

  const submit = () => {
    const body = text.trim();
    if (!body || !conv?.canWrite) return;
    const p = { clientId: crypto.randomUUID(), body, failed: false };
    setPending((list) => [...list, p]);
    setText('');
    stick.current = true;
    void deliver(p);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const toggleBlock = async () => {
    if (!conv) return;
    const h = conv.peer.handle;
    if (
      !conv.blocked &&
      !confirm(`Bloquer ${conv.peer.displayName} ? Vous ne pourrez plus vous écrire.`)
    )
      return;
    try {
      await (conv.blocked ? messages.unblock(h) : messages.block(h));
      toast.success(conv.blocked ? 'Membre débloqué.' : 'Membre bloqué.');
      await invalidate(key);
      invalidate('conversations');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const report = async (m: DirectMessageView) => {
    const reason = prompt('Pourquoi signaler ce message ? (spam, harcèlement, arnaque…)')?.trim();
    if (!reason) return;
    try {
      await messages.report(m.id, reason.slice(0, 500));
      toast.success('Signalement envoyé à la modération. Merci.');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  if (error && !data)
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-muted">
        <div>
          <p>Conversation introuvable.</p>
          <Link to="/messages" className="mt-3 inline-block font-semibold text-accent-text">
            Retour aux messages
          </Link>
        </div>
      </div>
    );

  let lastDay = '';
  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => nav('/messages')}
          aria-label="Retour aux conversations"
          className="grid size-9 place-items-center rounded-full hover:bg-surface-2 md:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>
        {conv ? (
          <Link to={`/u/${conv.peer.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={conv.peer.displayName} src={conv.peer.avatarUrl} size={38} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-fg">
                {conv.peer.displayName}
              </span>
              <span className="block truncate text-[12.5px] text-subtle">@{conv.peer.handle}</span>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-10 flex-1 rounded-[10px]" />
        )}
        {conv && (
          <DropMenu
            align="end"
            trigger={
              <button
                type="button"
                aria-label="Options de la conversation"
                className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
              >
                <MoreHorizontal className="size-5" />
              </button>
            }
          >
            <MenuItem icon={<UserRound />} onSelect={() => nav(`/u/${conv.peer.handle}`)}>
              Voir le Passport
            </MenuItem>
            <MenuItem icon={<Ban />} onSelect={() => void toggleBlock()}>
              {conv.blocked ? 'Débloquer' : 'Bloquer'}
            </MenuItem>
          </DropMenu>
        )}
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {(hasMoreOlder ?? data?.hasMore) && (
          <div className="mb-3 text-center">
            <button
              type="button"
              onClick={() => void loadOlder()}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-fg"
            >
              Messages précédents
            </button>
          </div>
        )}
        {!data && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-2/3 rounded-[14px]" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-[14px]" />
          </div>
        )}
        {data && all.length === 0 && pending.length === 0 && conv && (
          <p className="mx-auto mt-10 max-w-xs text-center text-[13.5px] text-muted">
            Dis bonjour à {conv.peer.displayName} : présente-toi et explique pourquoi tu écris.
          </p>
        )}
        <ol className="flex flex-col gap-1">
          {all.map((m, i) => {
            const day = dayLabel(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            const grouped = i > 0 && all[i - 1]!.mine === m.mine && !showDay;
            return (
              <li key={m.id} className={cn(!grouped && 'mt-2')}>
                {showDay && (
                  <p className="my-3 text-center text-[12px] font-semibold text-subtle first-letter:uppercase">
                    {day}
                  </p>
                )}
                <Bubble m={m} onReport={() => void report(m)} />
              </li>
            );
          })}
          {pending.map((p) => (
            <li key={p.clientId} className="mt-1 flex flex-col items-end">
              <p
                className={cn(
                  'max-w-[80%] rounded-[18px] rounded-br-[6px] px-3.5 py-2 text-[14.5px] leading-snug whitespace-pre-wrap text-white',
                  p.failed ? 'bg-danger/80' : 'bg-accent/70',
                )}
              >
                {p.body}
              </p>
              {p.failed ? (
                <button
                  type="button"
                  onClick={() => void deliver(p)}
                  className="mt-0.5 text-[12px] font-semibold text-danger"
                >
                  Non envoyé · Réessayer
                </button>
              ) : (
                <span className="mt-0.5 text-[11.5px] text-subtle">Envoi…</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <footer className="border-t border-line p-2.5 sm:p-3">
        {conv && !conv.canWrite ? (
          <p className="rounded-[12px] bg-surface-2 px-4 py-3 text-center text-[13.5px] text-muted">
            {conv.blocked
              ? 'Tu as bloqué ce membre. Débloque-le pour lui écrire.'
              : !conv.peer.active
                ? 'Ce compte n’est plus actif.'
                : 'Tu ne peux pas écrire à ce membre.'}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              maxLength={4000}
              aria-label="Écrire un message"
              placeholder="Écris un message…"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-[22px] bg-canvas px-4 py-2.5 text-[14.5px] leading-snug text-fg ring-1 ring-line outline-none [field-sizing:content] placeholder:text-subtle focus:ring-accent"
            />
            <button
              type="submit"
              disabled={!text.trim() || !conv}
              aria-label="Envoyer"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              <SendHorizontal className="size-5" />
            </button>
          </form>
        )}
      </footer>
    </>
  );
}

function Bubble({ m, onReport }: { m: DirectMessageView; onReport: () => void }) {
  return (
    <div className={cn('group flex items-end gap-1.5', m.mine ? 'flex-row-reverse' : 'flex-row')}>
      <p
        title={hour(m.createdAt)}
        className={cn(
          'max-w-[80%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-snug break-words whitespace-pre-wrap',
          m.hidden
            ? 'bg-surface-2 text-subtle italic'
            : m.mine
              ? 'rounded-br-[6px] bg-accent text-white'
              : 'rounded-bl-[6px] bg-surface-2 text-fg',
        )}
      >
        {m.hidden ? 'Message masqué par la modération' : m.body}
      </p>
      <span className="mb-1 text-[11px] text-subtle opacity-0 transition-opacity group-hover:opacity-100">
        {hour(m.createdAt)}
      </span>
      {!m.mine && !m.hidden && (
        <button
          type="button"
          onClick={onReport}
          aria-label="Signaler ce message"
          className="mb-0.5 grid size-7 place-items-center rounded-full text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-2 hover:text-danger focus-visible:opacity-100"
        >
          <Flag className="size-3.5" />
        </button>
      )}
    </div>
  );
}
