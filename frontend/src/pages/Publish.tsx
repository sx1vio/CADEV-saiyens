import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/primitives'
import { COMMUNITIES } from '@/platform/data/feed'
import { usePlatform } from '@/platform/store'
import type { PostKind } from '@/platform/types'
import { CommunityIcon, KindBadge } from '@/platform/ui'
import { cn } from '@/lib/utils'
import { useSession } from '@/stores/app'

const KINDS: { id: PostKind; label: string; hint: string }[] = [
  { id: 'discussion', label: 'Discussion', hint: 'Lancer un échange, demander un avis' },
  { id: 'launch', label: 'Lancement', hint: 'Présenter un projet que tu viens de sortir' },
  { id: 'opensource', label: 'Open source', hint: 'Partager un dépôt qui cherche des contributeurs' },
  { id: 'showcase', label: 'Projet', hint: 'Montrer ce que tu construis, demander des retours' },
  { id: 'news', label: 'Actu', hint: 'Partager une nouveauté avec sa source' },
]

/** Publier dans le fil : type, communauté, titre, texte, lien et dépôt. */
export default function Publish() {
  const me = useSession((s) => s.user)!
  const nav = useNavigate()
  const [params] = useSearchParams()
  const addPost = usePlatform((s) => s.addPost)
  const joined = usePlatform((s) => s.joined)
  const [kind, setKind] = useState<PostKind>((params.get('type') as PostKind) || 'discussion')
  const [community, setCommunity] = useState(params.get('c') || joined[0] || 'showcase')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [repo, setRepo] = useState('')
  const [tags, setTags] = useState('')
  const linkOk = !link || /^https?:\/\/\S+\.\S+/.test(link)
  const repoOk = !repo || /^[\w.-]+\/[\w.-]+$/.test(repo)
  const valid = title.trim().length >= 8 && linkOk && repoOk && (kind !== 'news' || !!link)

  const submit = () => {
    const post = addPost({
      kind,
      community,
      author: me.handle,
      title: title.trim(),
      body: body.trim(),
      link: link ? { url: link, domain: new URL(link).hostname.replace(/^www\./, '') } : undefined,
      repo: repo ? { name: repo, stars: 0, language: '' } : undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5),
    })
    toast.success('Publié dans c/' + community)
    nav(`/post/${post.id}`)
  }

  return (
    <div className="dh-page mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-fg">Publier</h1>
      <p className="mt-1 text-[14px] text-muted">Ton post apparaît dans le fil et dans la communauté choisie.</p>

      <div className="mt-6 flex flex-col gap-5 rounded-[20px] bg-surface-1 p-4 sm:p-5">
        <Field label="Type de post">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={cn('flex flex-col items-start gap-1.5 rounded-[10px] border p-3 text-left transition-colors', kind === k.id ? 'border-accent bg-accent-soft' : 'border-line ')}>
                <KindBadge kind={k.id} />
                <span className="text-[12.5px] leading-snug text-muted">{k.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Communauté">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {COMMUNITIES.map((c) => (
              <button key={c.slug} type="button" aria-pressed={community === c.slug} onClick={() => setCommunity(c.slug)} className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full border pr-3 pl-1 text-[13px] font-semibold', community === c.slug ? 'border-accent bg-accent-soft text-fg' : 'border-line text-muted hover:text-fg')}>
                <CommunityIcon slug={c.slug} size={26} />
                c/{c.slug}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Titre" htmlFor="pub-title" hint="Au moins 8 caractères. Dis l’essentiel : ce que c’est et pour qui.">
          <Input id="pub-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Ex. : J’ai publié un SDK unique pour Wave et Orange Money" />
        </Field>

        <Field label="Texte" htmlFor="pub-body" optional="facultatif">
          <Textarea id="pub-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-36" placeholder="Contexte, ce que tu as appris, ce que tu attends comme retour…" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lien" htmlFor="pub-link" optional={kind === 'news' ? 'obligatoire pour une actu' : 'facultatif'} error={!linkOk ? 'Lien invalide (https://…)' : undefined}>
            <Input id="pub-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-invalid={!linkOk} />
          </Field>
          <Field label="Dépôt GitHub" htmlFor="pub-repo" optional="facultatif" error={!repoOk ? 'Format attendu : propriétaire/depot' : undefined}>
            <Input id="pub-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="propriétaire/depot" aria-invalid={!repoOk} className="font-mono" />
          </Field>
        </div>

        <Field label="Étiquettes" htmlFor="pub-tags" optional="séparées par des virgules, 5 au plus">
          <Input id="pub-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="React, Mobile money, Open source" />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => nav(-1)}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            Publier
          </Button>
        </div>
      </div>
    </div>
  )
}
