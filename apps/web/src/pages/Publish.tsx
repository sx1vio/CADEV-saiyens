import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/primitives';
import { COMMUNITY_SLUGS } from '@devhub/contracts';
import { invalidate } from '@/lib/query';
import {
  POST_KINDS,
  PostKindBadge,
  communityApi,
  communityError,
  type PostKind,
} from '@/platform/community';
import { COMMUNITIES } from '@/platform/data/feed';
import { usePlatform } from '@/platform/store';
import { CommunityIcon } from '@/platform/ui';
import { cn } from '@/lib/utils';

const KINDS = (Object.keys(POST_KINDS) as PostKind[]).map((id) => ({ id, ...POST_KINDS[id] }));

/** Publier dans le fil : type, communauté, titre, texte, lien et dépôt. */
export default function Publish() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const joined = usePlatform((s) => s.joined);
  const [kind, setKind] = useState<PostKind>(
    (params.get('type') as PostKind) in POST_KINDS
      ? (params.get('type') as PostKind)
      : 'discussion',
  );
  const initial = params.get('c') || joined[0] || 'showcase';
  const [community, setCommunity] = useState<(typeof COMMUNITY_SLUGS)[number]>(
    (COMMUNITY_SLUGS as readonly string[]).includes(initial)
      ? (initial as (typeof COMMUNITY_SLUGS)[number])
      : 'showcase',
  );
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState(params.get('title') ?? '');
  const [body, setBody] = useState('');
  const [link, setLink] = useState(params.get('url') ?? '');
  const [repo, setRepo] = useState('');
  const [tags, setTags] = useState('');
  const linkOk = !link || /^https:\/\/\S+\.\S+/.test(link);
  const repoOk = !repo || /^[\w.-]+\/[\w.-]+$/.test(repo);
  const valid = title.trim().length >= 8 && linkOk && repoOk && (kind !== 'news' || !!link);

  const submit = async () => {
    setBusy(true);
    try {
      const { id } = await communityApi.create({
        community,
        kind,
        title: title.trim(),
        body: body.trim(),
        linkUrl: link.trim() || (repo ? `https://github.com/${repo}` : null),
        code: code.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5),
      });
      invalidate('posts');
      invalidate('communities');
      toast.success('Publié dans c/' + community);
      nav(`/post/${id}`);
    } catch (e) {
      toast.error(communityError(e));
      setBusy(false);
    }
  };

  return (
    <div className="dh-page mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-fg">Publier</h1>
      <p className="mt-1 text-[14px] text-muted">
        Ton post apparaît dans le fil et dans la communauté choisie.
      </p>

      <div className="mt-6 flex flex-col gap-5 rounded-[10px] bg-surface-1 p-4 sm:p-5">
        <Field label="Type de post">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => setKind(k.id)}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-[10px] border p-3 text-left transition-colors',
                  kind === k.id ? 'border-accent bg-accent-soft' : 'border-line ',
                )}
              >
                <PostKindBadge kind={k.id} />
                <span className="text-[12.5px] leading-snug text-muted">{k.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Communauté">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {COMMUNITIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={community === c.slug}
                onClick={() => setCommunity(c.slug as (typeof COMMUNITY_SLUGS)[number])}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border pr-3 pl-1 text-[13px] font-semibold',
                  community === c.slug
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-line text-muted hover:text-fg',
                )}
              >
                <CommunityIcon slug={c.slug} size={26} />
                c/{c.slug}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Titre"
          htmlFor="pub-title"
          hint="Au moins 8 caractères. Dis l’essentiel : ce que c’est et pour qui."
        >
          <Input
            id="pub-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={180}
            placeholder="Ex. : J’ai publié un SDK unique pour Wave et Orange Money"
          />
        </Field>

        <Field label="Texte" htmlFor="pub-body" optional="facultatif">
          <Textarea
            id="pub-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-36"
            placeholder="Contexte, ce que tu as appris, ce que tu attends comme retour…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Lien"
            htmlFor="pub-link"
            optional={kind === 'news' ? 'obligatoire pour une actu' : 'facultatif'}
            error={!linkOk ? 'Lien https:// attendu' : undefined}
          >
            <Input
              id="pub-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
              aria-invalid={!linkOk}
            />
          </Field>
          <Field
            label="Dépôt GitHub"
            htmlFor="pub-repo"
            optional="facultatif"
            error={!repoOk ? 'Format attendu : propriétaire/depot' : undefined}
          >
            <Input
              id="pub-repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="propriétaire/depot"
              aria-invalid={!repoOk}
              className="font-mono"
            />
          </Field>
        </div>

        <Field label="Code" htmlFor="pub-code" optional="facultatif, 5 000 caractères au plus">
          <Textarea
            id="pub-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-h-24 font-mono text-[13px]"
            maxLength={5000}
            placeholder="Colle un extrait de code (sans clé ni mot de passe)"
          />
        </Field>

        <Field
          label="Étiquettes"
          htmlFor="pub-tags"
          optional="séparées par des virgules, 5 au plus"
        >
          <Input
            id="pub-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="React, Mobile money, Open source"
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => nav(-1)}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={busy} onClick={() => void submit()}>
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}
