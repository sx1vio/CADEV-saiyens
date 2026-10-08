import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';
import { COMMENTS, POSTS } from '@/platform/data/feed';
import { usePlatform } from '@/platform/store';
import type { Comment } from '@/platform/types';
import {
  Ago,
  CommunityIcon,
  DemoTag,
  PersonAvatar,
  PostCard,
  SideCard,
  VoteBox,
  communityOf,
  compact,
} from '@/platform/ui';
import { person } from '@/platform/data/people';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/app';
import NotFound from './NotFound';

export default function PostPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const me = useSession((s) => s.user);
  const myPosts = usePlatform((s) => s.myPosts);
  const myComments = usePlatform((s) => s.myComments);
  const addComment = usePlatform((s) => s.addComment);
  const joined = usePlatform((s) => s.joined);
  const toggle = usePlatform((s) => s.toggle);
  const [draft, setDraft] = useState('');
  const post = [...myPosts, ...POSTS].find((p) => p.id === id);
  const comments = useMemo(
    () => [...COMMENTS, ...myComments].filter((c) => c.postId === id),
    [id, myComments],
  );
  if (!post) return <NotFound />;
  const c = communityOf(post.community);
  const roots = comments.filter((x) => !x.parentId);

  return (
    <div className="dh-page mx-auto flex w-full max-w-[1180px] gap-6 px-3 py-4 sm:px-6">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-fg hover:bg-surface-3"
        >
          <ArrowLeft className="size-4" />
          Retour
        </button>
        <PostCard post={post} />

        <section className="mt-4 rounded-[20px] bg-surface-1 p-4">
          {me ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                addComment(post.id, null, me.handle, draft.trim());
                setDraft('');
              }}
              className="flex flex-col gap-2"
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ajoute un commentaire utile : une piste, une expérience, une source…"
                className="min-h-20"
                aria-label="Commentaire"
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm" disabled={!draft.trim()}>
                  Commenter
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted">
              <Link to="/connexion" className="font-semibold text-accent-text hover:underline">
                Connecte-toi
              </Link>{' '}
              pour commenter.
            </p>
          )}

          <h2 className="mt-5 mb-2 inline-flex items-center gap-2 text-[14px] font-semibold text-fg">
            <MessageSquare className="size-4" />
            {comments.length} commentaire{comments.length > 1 ? 's' : ''}
          </h2>
          {roots.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">
              Pas encore de commentaire. Lance la discussion.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {roots.map((cm) => (
                <Thread key={cm.id} comment={cm} all={comments} depth={0} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="hidden w-[316px] shrink-0 flex-col gap-4 lg:flex">
        <section className="overflow-hidden rounded-[20px] bg-surface-1">
          <div className="h-12" style={{ background: c.color }} />
          <div className="p-4">
            <div className="-mt-9 mb-2">
              <CommunityIcon slug={c.slug} size={52} className="ring-4 ring-surface-1" />
            </div>
            <Link to={`/c/${c.slug}`} className="text-[15px] font-semibold text-fg hover:underline">
              c/{c.slug}
            </Link>
            <p className="mt-1 text-[13px] text-muted">{c.description}</p>
            <div className="mt-3 flex gap-6 text-[13px]">
              <span>
                <b className="block text-fg">{compact(c.members)}</b>
                <span className="text-subtle">membres</span>
              </span>
              <span>
                <b className="flex items-center gap-1.5 text-fg">
                  <span className="size-2 rounded-full bg-success" />
                  {c.online}
                </b>
                <span className="text-subtle">en ligne</span>
              </span>
            </div>
            <Button
              variant={joined.includes(c.slug) ? 'secondary' : 'primary'}
              size="sm"
              className="mt-4 w-full rounded-full"
              onClick={() => toggle('joined', c.slug)}
            >
              {joined.includes(c.slug) ? 'Membre' : 'Rejoindre'}
            </Button>
          </div>
        </section>
        <SideCard title="Règles de la communauté">
          <ol className="flex list-decimal flex-col gap-2 pl-4 text-[13px] text-muted">
            {c.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </SideCard>
      </aside>
    </div>
  );
}

function Thread({ comment, all, depth }: { comment: Comment; all: Comment[]; depth: number }) {
  const me = useSession((s) => s.user);
  const addComment = usePlatform((s) => s.addComment);
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const children = all.filter((c) => c.parentId === comment.id);
  const p = person(comment.author);
  return (
    <li className={cn('relative', depth > 0 && 'ml-4 border-l-2 border-line pl-3 sm:ml-6')}>
      <div className="flex gap-2.5 pt-3">
        <PersonAvatar handle={comment.author} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <Link to={`/u/${p.handle}`} className="font-semibold text-fg hover:underline">
              {p.name}
            </Link>
            {!comment.id.startsWith('mc-') && <DemoTag />}
            <span className="text-subtle">·</span>
            <Ago iso={comment.createdAt} className="text-subtle" />
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg">{comment.body}</p>
          <div className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-muted">
            <VoteBox id={comment.id} score={comment.score} vertical={false} />
            {me && (
              <button
                type="button"
                onClick={() => setReplying(!replying)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-surface-3"
              >
                <MessageSquare className="size-3.5" />
                Répondre
              </button>
            )}
          </div>
          {replying && me && (
            <form
              className="mt-2 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                addComment(comment.postId, comment.id, me.handle, text.trim());
                setText('');
                setReplying(false);
              }}
            >
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-16"
                aria-label="Réponse"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={!text.trim()}>
                  Répondre
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <Thread key={c.id} comment={c} all={all} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
