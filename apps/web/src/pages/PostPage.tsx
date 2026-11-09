import type { PostCommentView } from '@devhub/contracts';
import { ArrowLeft, ExternalLink, Flag, MessageSquare, Reply, Share2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ReportSheet } from '@/components/ReportSheet';
import { Button } from '@/components/ui/button';
import { CodeBlock, Markdown } from '@/components/ui/code';
import { Avatar, Skeleton, Textarea } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { PostKindBadge, PostVote, communityApi, communityError, share } from '@/platform/community';
import { usePlatform } from '@/platform/store';
import { Ago, CommunityIcon, SideCard, communityOf } from '@/platform/ui';
import type { Report } from '@/services/types';
import { useSession } from '@/stores/app';
import NotFound from './NotFound';

type ReportTarget = { type: Report['targetType']; id: string; label: string } | null;

/** Une publication, son fil de commentaires et ses réponses. */
export default function PostPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const me = useSession((s) => s.user);
  const joined = usePlatform((s) => s.joined);
  const toggle = usePlatform((s) => s.toggle);
  const { data: post, error, refresh } = useQuery(`post:${id}`, () => communityApi.get(id));
  const [report, setReport] = useState<ReportTarget>(null);

  const children = useMemo(() => {
    const map = new Map<string | null, PostCommentView[]>();
    for (const c of post?.commentList ?? [])
      map.set(c.parentId, [...(map.get(c.parentId) ?? []), c]);
    return map;
  }, [post]);

  if (error && !post) {
    const code = (error as { code?: string }).code;
    return code === 'not_found' || code === 'http.404' ? (
      <NotFound />
    ) : (
      <p className="m-6 rounded-[10px] bg-surface-1 p-6 text-muted">{communityError(error)}</p>
    );
  }
  if (!post)
    return (
      <div className="mx-auto max-w-[900px] p-6">
        <Skeleton className="h-48 rounded-[10px]" />
      </div>
    );

  const c = communityOf(post.community);
  const reload = () => {
    invalidate(`post:${id}`);
    void refresh();
  };
  const remove = async () => {
    if (!confirm('Supprimer définitivement cette publication et ses commentaires ?')) return;
    try {
      await communityApi.remove(post.id);
      invalidate('posts');
      toast.success('Publication supprimée');
      nav(`/?topic=${post.community}`, { replace: true });
    } catch (e) {
      toast.error(communityError(e));
    }
  };

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

        <article className="rounded-[10px] bg-surface-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-subtle">
            <Link
              to={`/?topic=${post.community}`}
              className="inline-flex items-center gap-1.5 font-medium text-fg hover:underline"
            >
              <CommunityIcon slug={post.community} size={20} />
              {c.name}
            </Link>
            <span aria-hidden>·</span>
            <Link to={`/u/${post.author.handle}`} className="hover:underline">
              u/{post.author.handle}
            </Link>
            <span aria-hidden>·</span>
            <Ago iso={post.createdAt} />
            <span className="ml-1">
              <PostKindBadge kind={post.kind} />
            </span>
          </div>
          <h1 className="mt-2 text-[21px] leading-snug font-semibold tracking-[-0.015em] text-fg">
            {post.title}
          </h1>
          {post.body && (
            <div className="mt-3 text-[14.5px] leading-relaxed text-fg">
              <Markdown>{post.body}</Markdown>
            </div>
          )}
          {post.code && <CodeBlock code={post.code} className="mt-3" />}
          {post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="mt-3 inline-flex max-w-full items-center gap-2 rounded-[10px] bg-canvas px-3 py-2 text-[13px] font-medium text-fg hover:bg-surface-2"
            >
              <ExternalLink className="size-4 shrink-0 text-subtle" />
              <span className="truncate">{post.linkUrl}</span>
            </a>
          )}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-[6px] bg-surface-3 px-2 py-0.5 text-[12px] font-medium text-fg"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-1 text-[13px] font-medium text-muted">
            <PostVote post={post} vertical={false} />
            <span className="ml-2 inline-flex items-center gap-1.5">
              <MessageSquare className="size-4" />
              {post.comments} commentaire{post.comments > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => share(`/post/${post.id}`)}
              className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-surface-3"
            >
              <Share2 className="size-4" />
              Partager
            </button>
            {post.mine ? (
              <button
                type="button"
                onClick={remove}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-4" />
                Supprimer
              </button>
            ) : (
              me && (
                <button
                  type="button"
                  onClick={() => setReport({ type: 'post', id: post.id, label: post.title })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-surface-3"
                >
                  <Flag className="size-4" />
                  Signaler
                </button>
              )
            )}
          </div>
        </article>

        <section className="mt-4 rounded-[10px] bg-surface-1 p-4" aria-label="Commentaires">
          {me ? (
            <CommentForm postId={post.id} parentId={null} onDone={reload} />
          ) : (
            <p className="text-sm text-muted">
              <Link to="/connexion" className="font-semibold text-accent-text hover:underline">
                Connecte-toi
              </Link>{' '}
              pour commenter.
            </p>
          )}
          <ol className="mt-4 flex flex-col gap-4">
            {(children.get(null) ?? []).map((cm) => (
              <CommentNode
                key={cm.id}
                comment={cm}
                tree={children}
                postId={post.id}
                onChange={reload}
                onReport={setReport}
                depth={0}
              />
            ))}
          </ol>
          {post.comments === 0 && (
            <p className="mt-2 text-[14px] text-subtle">
              Pas encore de commentaire. Lance la discussion.
            </p>
          )}
        </section>
      </div>

      <aside className="hidden w-[316px] shrink-0 flex-col gap-4 lg:flex">
        <SideCard title={c.name}>
          <p className="text-[14px] text-muted">{c.description}</p>
          <Button
            variant={joined.includes(c.slug) ? 'secondary' : 'primary'}
            size="sm"
            className="mt-3 w-full rounded-full"
            onClick={() => toggle('joined', c.slug)}
          >
            {joined.includes(c.slug) ? 'Dans ton fil' : 'Suivre ce sujet'}
          </Button>
        </SideCard>
        <SideCard title="Bonnes pratiques">
          <ol className="flex list-decimal flex-col gap-2 pl-4 text-[13px] text-muted">
            {c.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </SideCard>
      </aside>

      <ReportSheet target={report} onClose={() => setReport(null)} />
    </div>
  );
}

function CommentForm({
  postId,
  parentId,
  onDone,
  autoFocus,
}: {
  postId: string;
  parentId: string | null;
  onDone: () => void;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (draft.trim().length < 2) return;
        setBusy(true);
        try {
          await communityApi.comment(postId, draft.trim(), parentId);
          setDraft('');
          onDone();
        } catch (err) {
          toast.error(communityError(err));
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          parentId
            ? 'Ta réponse…'
            : 'Ajoute un commentaire utile : une piste, une expérience, une source…'
        }
        className="min-h-20"
        aria-label={parentId ? 'Réponse' : 'Commentaire'}
        autoFocus={autoFocus}
        maxLength={5000}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={draft.trim().length < 2}
          loading={busy}
        >
          {parentId ? 'Répondre' : 'Commenter'}
        </Button>
      </div>
    </form>
  );
}

function CommentNode({
  comment,
  tree,
  postId,
  onChange,
  onReport,
  depth,
}: {
  comment: PostCommentView;
  tree: Map<string | null, PostCommentView[]>;
  postId: string;
  onChange: () => void;
  onReport: (t: ReportTarget) => void;
  depth: number;
}) {
  const me = useSession((s) => s.user);
  const [replying, setReplying] = useState(false);
  const replies = tree.get(comment.id) ?? [];
  const remove = async () => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      await communityApi.removeComment(postId, comment.id);
      onChange();
    } catch (e) {
      toast.error(communityError(e));
    }
  };
  return (
    <li className="flex gap-2.5">
      <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-subtle">
          <Link
            to={`/u/${comment.author.handle}`}
            className="font-semibold text-fg hover:underline"
          >
            {comment.author.displayName}
          </Link>{' '}
          · <Ago iso={comment.createdAt} />
        </p>
        <div className="mt-0.5 text-[14px] leading-relaxed text-fg">
          <Markdown>{comment.body}</Markdown>
        </div>
        <div className="mt-1 flex gap-1 text-[12.5px] font-medium text-muted">
          {me && depth < 4 && (
            <button
              type="button"
              onClick={() => setReplying(!replying)}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 hover:bg-surface-3"
            >
              <Reply className="size-3.5" />
              Répondre
            </button>
          )}
          {comment.mine ? (
            <button
              type="button"
              onClick={remove}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3.5" />
              Supprimer
            </button>
          ) : (
            me && (
              <button
                type="button"
                onClick={() =>
                  onReport({
                    type: 'post_comment',
                    id: comment.id,
                    label: comment.body.slice(0, 80),
                  })
                }
                className="inline-flex h-7 items-center gap-1 rounded-full px-2 hover:bg-surface-3"
              >
                <Flag className="size-3.5" />
                Signaler
              </button>
            )
          )}
        </div>
        {replying && (
          <div className="mt-2">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              autoFocus
              onDone={() => {
                setReplying(false);
                onChange();
              }}
            />
          </div>
        )}
        {replies.length > 0 && (
          <ol className="mt-3 flex flex-col gap-3 border-l-2 border-line pl-3">
            {replies.map((r) => (
              <CommentNode
                key={r.id}
                comment={r}
                tree={tree}
                postId={postId}
                onChange={onChange}
                onReport={onReport}
                depth={depth + 1}
              />
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}
