import { COMMUNITY_SLUGS, POST_IMAGES_MAX } from '@devhub/contracts';
import { Code2, ImagePlus, Link2, Loader2, Tag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, Input, Select, Textarea } from '@/components/ui/primitives';
import { invalidate } from '@/lib/query';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/app';
import {
  POST_KINDS,
  type CommunitySlug,
  type PostImage,
  type PostKind,
  communityApi,
  communityError,
  uploadImage,
} from './community';
import { COMMUNITIES, GENERAL_COMMUNITY } from './data/feed';
import { BrandLogo } from './logos';

/** Ordre d'affichage des types : les plus courants d'abord, comme sur LinkedIn. */
const KIND_ORDER: PostKind[] = [
  'update',
  'showcase',
  'release',
  'celebration',
  'article',
  'question',
  'discussion',
  'opensource',
  'news',
];

const PLACEHOLDER: Record<PostKind, string> = {
  update: 'De quoi veux-tu parler ? Une avancée, une idée, ce que tu as appris aujourd’hui…',
  showcase: 'Présente ton projet : à quoi il sert, pour qui, avec quelle stack, ce que tu attends…',
  release: 'Qu’est-ce qui vient de sortir ? Lien, nouveautés, ce qui a été difficile…',
  celebration: 'Nouveau poste, certification, premier client, 1 000 utilisateurs : raconte !',
  article: 'Écris ton article ou ton tutoriel. Les lignes vides séparent les paragraphes.',
  question: 'Pose ta question : contexte, ce que tu as essayé, ce que tu attends.',
  discussion: 'Lance la discussion : ton avis, ta question ouverte, ton retour d’expérience…',
  opensource: 'Présente le dépôt et ce qu’il faudrait pour y contribuer.',
  news: 'Résume la nouvelle et dis pourquoi elle compte pour les devs.',
};

/** Types où un titre aide la lecture : il reste facultatif sauf pour un article. */
const WITH_TITLE = new Set<PostKind>(['article', 'showcase', 'release', 'opensource', 'news']);

type Upload = { key: string; preview: string; image?: PostImage; failed?: boolean };

export interface ComposerInitial {
  kind?: PostKind;
  community?: string;
  title?: string;
  link?: string;
  /** Ouvre le sélecteur de photos dès l'affichage. */
  pickPhoto?: boolean;
}

export function PostComposer({
  initial = {},
  onDone,
  onCancel,
}: {
  initial?: ComposerInitial;
  onDone: (id: string) => void;
  onCancel?: () => void;
}) {
  const me = useSession((s) => s.user);
  const [kind, setKind] = useState<PostKind>(
    initial.kind && initial.kind in POST_KINDS ? initial.kind : 'update',
  );
  const [community, setCommunity] = useState<CommunitySlug>(
    (COMMUNITY_SLUGS as readonly string[]).includes(initial.community ?? '')
      ? (initial.community as CommunitySlug)
      : 'general',
  );
  const [body, setBody] = useState('');
  const [title, setTitle] = useState(initial.title ?? '');
  const [link, setLink] = useState(initial.link ?? '');
  const [repo, setRepo] = useState('');
  const [code, setCode] = useState('');
  const [tags, setTags] = useState('');
  const [open, setOpen] = useState({
    link: !!initial.link,
    repo: false,
    code: false,
    tags: false,
  });
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial.pickPhoto) fileRef.current?.click();
    // Une seule fois, à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Libère les aperçus locaux quand le formulaire se ferme (une seule fois, au démontage).
  const previews = useRef<Upload[]>([]);
  useEffect(() => {
    previews.current = uploads;
  }, [uploads]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u.preview)), []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = POST_IMAGES_MAX - uploads.length;
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) toast.message(`${POST_IMAGES_MAX} photos au plus par publication.`);
    for (const file of list) {
      const key = crypto.randomUUID();
      setUploads((u) => [...u, { key, preview: URL.createObjectURL(file) }]);
      uploadImage(file).then(
        (image) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, image } : x))),
        (e) => {
          toast.error(communityError(e));
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, failed: true } : x)));
        },
      );
    }
  };

  const uploading = uploads.some((u) => !u.image && !u.failed);
  const images = uploads.flatMap((u) => (u.image ? [u.image.id] : []));
  const linkOk = !link || /^https:\/\/\S+\.\S+/.test(link.trim());
  const repoOk = !repo || /^[\w.-]+\/[\w.-]+$/.test(repo.trim());
  const hasContent = body.trim().length > 0 || title.trim().length > 0 || images.length > 0;
  const titleOk = kind !== 'article' || title.trim().length >= 3;
  const linkNeeded = kind === 'news' && !link.trim();
  const valid =
    hasContent &&
    linkOk &&
    repoOk &&
    titleOk &&
    !linkNeeded &&
    !uploading &&
    !uploads.some((u) => u.failed);

  const submit = async () => {
    setBusy(true);
    try {
      const { id } = await communityApi.create({
        community,
        kind,
        title: title.trim(),
        body: body.trim(),
        linkUrl: link.trim() || (repo.trim() ? `https://github.com/${repo.trim()}` : null),
        code: code.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5),
        images,
      });
      invalidate('posts');
      invalidate('communities');
      toast.success('Publié');
      onDone(id);
    } catch (e) {
      toast.error(communityError(e));
      setBusy(false);
    }
  };

  const tool = (on: boolean) =>
    cn(
      'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors',
      on ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-surface-2 hover:text-fg',
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={me?.displayName ?? ''} src={me?.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-fg">{me?.displayName}</p>
          <label className="mt-0.5 flex items-center gap-1.5 text-[13px] text-subtle">
            <span className="sr-only">Sujet</span>
            <Select
              value={community}
              onChange={(e) => setCommunity(e.target.value as CommunitySlug)}
              className="h-8 w-auto rounded-full py-0 pr-8 pl-3 text-[13px] font-medium"
              aria-label="Sujet de la publication"
            >
              <option value={GENERAL_COMMUNITY.slug}>Tout le monde</option>
              {COMMUNITIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="radiogroup"
        aria-label="Type de publication"
      >
        {KIND_ORDER.map((k) => {
          const K = POST_KINDS[k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              title={K.hint}
              onClick={() => setKind(k)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors',
                kind === k
                  ? 'border-accent bg-accent-soft text-accent-text'
                  : 'border-line text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              <K.icon className="size-4" />
              {K.label}
            </button>
          );
        })}
      </div>

      {WITH_TITLE.has(kind) && (
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          aria-label="Titre"
          placeholder={kind === 'article' ? 'Titre de l’article' : 'Titre (facultatif)'}
          className="h-12 text-[16px] font-semibold"
        />
      )}

      <Textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={10_000}
        aria-label="Texte de la publication"
        placeholder={PLACEHOLDER[kind]}
        className={cn(
          'resize-y border-0 bg-transparent px-0 text-[16px] leading-relaxed shadow-none focus-visible:ring-0',
          kind === 'article' ? 'min-h-72' : 'min-h-36',
        )}
      />

      {uploads.length > 0 && (
        <div
          className={cn('grid gap-2', uploads.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}
          aria-label="Photos"
        >
          {uploads.map((u, i) => (
            <div
              key={u.key}
              className="relative overflow-hidden rounded-[10px] border border-line bg-surface-2"
            >
              <img
                src={u.preview}
                alt={`Photo ${i + 1}`}
                className={cn(
                  'w-full object-cover',
                  uploads.length === 1 ? 'max-h-96' : 'aspect-square',
                  (!u.image || u.failed) && 'opacity-60',
                )}
              />
              {!u.image && !u.failed && (
                <span className="absolute inset-0 grid place-items-center">
                  <Loader2 className="size-6 animate-spin text-white drop-shadow" />
                </span>
              )}
              {u.failed && (
                <span className="absolute inset-x-2 bottom-2 rounded-[6px] bg-danger px-2 py-1 text-[12px] font-medium text-white">
                  Envoi impossible : retire cette photo
                </span>
              )}
              <button
                type="button"
                aria-label={`Retirer la photo ${i + 1}`}
                onClick={() => {
                  URL.revokeObjectURL(u.preview);
                  setUploads((list) => list.filter((x) => x.key !== u.key));
                }}
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {open.link && (
        <div>
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            aria-label="Lien"
            aria-invalid={!linkOk}
          />
          {!linkOk && <p className="mt-1 text-[12.5px] text-danger">Lien https:// attendu</p>}
        </div>
      )}
      {open.repo && (
        <div>
          <Input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="propriétaire/dépôt"
            aria-label="Dépôt GitHub"
            aria-invalid={!repoOk}
            className="font-mono"
          />
          {!repoOk ? (
            <p className="mt-1 text-[12.5px] text-danger">Format attendu : propriétaire/dépôt</p>
          ) : (
            <p className="mt-1 text-[12.5px] text-subtle">
              Affiché comme une carte GitHub : description, étoiles, langage.
            </p>
          )}
        </div>
      )}
      {open.code && (
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={5000}
          aria-label="Extrait de code"
          placeholder="Colle un extrait de code (sans clé ni mot de passe)"
          className="min-h-28 font-mono text-[13px]"
        />
      )}
      {open.tags && (
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          aria-label="Étiquettes"
          placeholder="Étiquettes séparées par des virgules : React, Mobile money"
        />
      )}
      {linkNeeded && (
        <p className="text-[13px] text-subtle">Une actu se publie avec le lien de sa source.</p>
      )}

      <div className="flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploads.length >= POST_IMAGES_MAX}
          className={cn(tool(false), 'disabled:opacity-40')}
        >
          <ImagePlus className="size-[18px]" />
          Photo
        </button>
        <button
          type="button"
          aria-pressed={open.link}
          onClick={() => setOpen((o) => ({ ...o, link: !o.link }))}
          className={tool(open.link)}
        >
          <Link2 className="size-[18px]" />
          Lien
        </button>
        <button
          type="button"
          aria-pressed={open.repo}
          onClick={() => setOpen((o) => ({ ...o, repo: !o.repo }))}
          className={tool(open.repo)}
        >
          <BrandLogo name="GitHub" size={16} />
          Dépôt
        </button>
        <button
          type="button"
          aria-pressed={open.code}
          onClick={() => setOpen((o) => ({ ...o, code: !o.code }))}
          className={tool(open.code)}
        >
          <Code2 className="size-[18px]" />
          Code
        </button>
        <button
          type="button"
          aria-pressed={open.tags}
          onClick={() => setOpen((o) => ({ ...o, tags: !o.tags }))}
          className={tool(open.tags)}
        >
          <Tag className="size-[18px]" />
          Étiquettes
        </button>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button variant="primary" disabled={!valid} loading={busy} onClick={() => void submit()}>
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}
