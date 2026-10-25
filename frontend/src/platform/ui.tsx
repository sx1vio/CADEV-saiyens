import {
  BadgeCheck,
  CircleHelp,
  PlaySquare,
  ArrowBigDown,
  ArrowBigUp,
  Award,
  Bookmark,
  Bot,
  Briefcase,
  Code2,
  Container,
  Database,
  ExternalLink,
  GitFork,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Rocket,
  Server,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { relativeTime, useLang } from '@/i18n'
import { cn } from '@/lib/utils'
import { COMMUNITIES } from './data/feed'
import { COMPANIES } from './data/jobs'
import { person } from './data/people'
import { usePlatform } from './store'
import { BrandLogo, TechChip, logoFor } from './logos'
import type { Company, Post, Template, Video } from './types'

export const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  globe: Globe,
  smartphone: Smartphone,
  server: Server,
  container: Container,
  'git-fork': GitFork,
  briefcase: Briefcase,
  wallet: Wallet,
  database: Database,
  rocket: Rocket,
  bot: Bot,
  'layout-dashboard': LayoutDashboard,
}

export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace('.0', '').replace('.', ',')} k`
  return String(n)
}

export function Ago({ iso, className }: { iso: string; className?: string }) {
  const lang = useLang()
  return (
    <time dateTime={iso} className={className}>
      {relativeTime(iso, lang)}
    </time>
  )
}

/* ---------------- Personnes ---------------- */

export function PersonAvatar({ handle, size = 24, className }: { handle: string; size?: number; className?: string }) {
  const p = person(handle)
  return <img src={p.avatar} alt="" width={size} height={size} loading="lazy" decoding="async" className={cn('shrink-0 rounded-full bg-surface-3 object-cover', className)} style={{ width: size, height: size }} />
}

export function PersonLink({ handle, size = 20, className, bold = true }: { handle: string; size?: number; className?: string; bold?: boolean }) {
  const p = person(handle)
  return (
    <Link to={`/u/${p.handle}`} className={cn('group inline-flex min-w-0 items-center gap-1.5', className)} onClick={(e) => e.stopPropagation()}>
      <PersonAvatar handle={handle} size={size} />
      <span className={cn('truncate group-hover:underline', bold ? 'font-semibold text-fg' : 'text-muted')}>{p.name}</span>
    </Link>
  )
}

/** Étiquette « démo » discrète : toutes les données de ces services sont des exemples. */
export function DemoTag({ className }: { className?: string }) {
  return <span title="Donnée de démonstration" className={cn('inline-flex h-4 items-center rounded-[4px] border border-line-strong px-1 text-[10px] font-medium text-subtle', className)}>démo</span>
}

/* ---------------- Communautés ---------------- */

export function communityOf(slug: string) {
  return COMMUNITIES.find((c) => c.slug === slug) ?? COMMUNITIES[0]
}

export function CommunityIcon({ slug, size = 24, className }: { slug: string; size?: number; className?: string }) {
  const c = communityOf(slug)
  const Icon = ICONS[c.icon] ?? Sparkles
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full text-white', className)} style={{ width: size, height: size, background: c.color }}>
      <Icon style={{ width: size * 0.54, height: size * 0.54, strokeWidth: 2 }} />
    </span>
  )
}

/* ---------------- Votes (Reddit) ---------------- */

export function VoteBox({ id, score, vertical = true }: { id: string; score: number; vertical?: boolean }) {
  const vote = usePlatform((s) => s.votes[id])
  const doVote = usePlatform((s) => s.vote)
  const total = score + (vote ?? 0)
  return (
    <div className={cn('flex shrink-0 items-center', vertical ? 'w-9 flex-col gap-0' : 'gap-0 rounded-full bg-surface-2')} onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        aria-label="Voter pour"
        aria-pressed={vote === 1}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          doVote(id, 1)
        }}
        className={cn('grid size-7 place-items-center rounded-full transition-colors hover:bg-surface-3', vote === 1 ? 'text-[#ff6b3d]' : 'text-subtle hover:text-[#ff6b3d]')}
      >
        <ArrowBigUp className="size-[18px]" fill={vote === 1 ? 'currentColor' : 'none'} />
      </button>
      <span className={cn('min-w-6 text-center text-[12px] font-semibold tabular', vote === 1 ? 'text-[#ff6b3d]' : vote === -1 ? 'text-[#7c8cff]' : 'text-fg')}>{compact(total)}</span>
      <button
        type="button"
        aria-label="Voter contre"
        aria-pressed={vote === -1}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          doVote(id, -1)
        }}
        className={cn('grid size-7 place-items-center rounded-full transition-colors hover:bg-surface-3', vote === -1 ? 'text-[#7c8cff]' : 'text-subtle hover:text-[#7c8cff]')}
      >
        <ArrowBigDown className="size-[18px]" fill={vote === -1 ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

/* ---------------- Posts ---------------- */

const KIND: Record<Post['kind'], { label: string; icon: LucideIcon }> = {
  news: { label: 'Actu', icon: Newspaper },
  launch: { label: 'Lancement', icon: Rocket },
  opensource: { label: 'Open source', icon: GitFork },
  discussion: { label: 'Discussion', icon: MessageSquare },
  showcase: { label: 'Projet', icon: Code2 },
  question: { label: 'Question', icon: CircleHelp },
  video: { label: 'Vidéo', icon: PlaySquare },
  job: { label: 'Emploi', icon: Briefcase },
}

/** Type de post : icône + libellé neutres (la couleur est réservée aux états). */
export function KindBadge({ kind }: { kind: Post['kind'] }) {
  const k = KIND[kind]
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-[5px] bg-surface-3 px-1.5 text-[11.5px] font-medium text-muted">
      <k.icon className="size-3" />
      {k.label}
    </span>
  )
}

function share(path: string) {
  const url = `${location.origin}${path}`
  void navigator.clipboard?.writeText(url).then(
    () => toast.success('Lien copié'),
    () => toast.error('Copie impossible'),
  )
}

/** Aperçu de lien (actu externe ou page interne), façon carte de partage. */
function LinkPreview({ post }: { post: Post }) {
  const link = post.link!
  const external = link.url.startsWith('http')
  const logo = post.tags.find((t) => logoFor(t)) ?? (link.domain.includes('github') ? 'GitHub' : '')
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-[8px] border border-line bg-canvas text-muted">
        {logo ? <BrandLogo name={logo} size={20} /> : external ? <Globe className="size-[18px]" /> : post.kind === 'video' ? <PlaySquare className="size-[18px]" /> : <Briefcase className="size-[18px]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-fg">{external ? link.domain : post.kind === 'video' ? 'Regarder la vidéo' : 'Voir l’offre'}</span>
        <span className="block truncate text-[12px] text-subtle">{external ? link.url.replace(/^https?:\/\//, '') : link.domain}</span>
      </span>
      {external && <ExternalLink className="size-3.5 shrink-0 text-subtle" />}
    </>
  )
  const cls = 'relative z-10 mt-2.5 flex items-center gap-3 rounded-[14px] bg-canvas p-2 pr-3 transition-colors '
  return external ? (
    <a href={link.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={cls}>
      {body}
    </a>
  ) : (
    <Link to={link.url} onClick={(e) => e.stopPropagation()} className={cls}>
      {body}
    </Link>
  )
}

export function PostCard({ post, compactView }: { post: Post; compactView?: boolean }) {
  const saved = usePlatform((s) => s.saved.includes(post.id))
  const toggle = usePlatform((s) => s.toggle)
  const c = communityOf(post.community)
  const author = person(post.author)
  return (
    <article className="group relative flex gap-1.5 rounded-[20px] bg-surface-1 py-2 pr-4 pl-1.5 transition-colors ">
      <Link to={`/post/${post.id}`} className="absolute inset-0 rounded-[10px]" aria-label={post.title} />
      <div className="relative z-10 pt-0.5">
        <VoteBox id={post.id} score={post.score} />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="relative z-10 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-subtle">
          <Link to={`/c/${c.slug}`} className="inline-flex items-center gap-1.5 font-medium text-fg hover:underline">
            <CommunityIcon slug={c.slug} size={18} />
            c/{c.slug}
          </Link>
          <span aria-hidden>·</span>
          <Link to={`/u/${author.handle}`} className="inline-flex items-center gap-1 hover:underline">
            {post.editorial ? (
              <>
                {author.name}
                <BadgeCheck className="size-3.5 text-accent-text" aria-label="Rédaction" />
              </>
            ) : (
              `u/${author.handle}`
            )}
          </Link>
          <span aria-hidden>·</span>
          <Ago iso={post.createdAt} />
          <span className="ml-1 inline-flex items-center gap-1">
            <KindBadge kind={post.kind} />
            {!post.id.startsWith('mine-') && <DemoTag />}
          </span>
        </div>
        <h3 className="mt-1.5 text-[15px] leading-snug font-semibold tracking-[-0.01em] text-fg">{post.title}</h3>
        {!compactView && post.body && <p className="mt-1 line-clamp-3 text-[13.5px] leading-[1.55] text-muted">{post.body}</p>}
        {!compactView && post.code && (
          <pre className="mt-2 overflow-hidden rounded-[8px] border border-line bg-inset px-3 py-2 font-mono text-[12px] text-muted">
            <span className="line-clamp-2 whitespace-pre-wrap">{post.code}</span>
          </pre>
        )}
        {!compactView && post.image && (
          <div className="mt-2.5 overflow-hidden rounded-[8px] border border-line">
            <img src={post.image} alt="" loading="lazy" decoding="async" className="aspect-[2.2/1] w-full object-cover" />
          </div>
        )}
        {post.repo && (
          <a
            href={`https://github.com/${post.repo.name}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 mt-2.5 flex items-center gap-2.5 rounded-[14px] bg-canvas px-3 py-2 text-[12.5px] transition-colors "
          >
            <BrandLogo name="GitHub" size={15} />
            <span className="truncate font-mono font-medium text-fg">{post.repo.name}</span>
            {post.repo.language && (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-subtle">
                <span className="size-2.5 rounded-full" style={{ background: LANG_COLOR[post.repo.language] ?? '#8b8e9b' }} />
                {post.repo.language}
              </span>
            )}
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-subtle">
              <Star className="size-3.5" />
              {compact(post.repo.stars)}
            </span>
          </a>
        )}
        {post.link && <LinkPreview post={post} />}
        <div className="relative z-10 mt-2 -ml-2 flex flex-wrap items-center gap-0.5 text-[12.5px] font-medium text-muted">
          <Link to={`/post/${post.id}`} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-surface-3">
            <MessageSquare className="size-[15px]" />
            {compact(post.comments)} commentaires
          </Link>
          <button type="button" onClick={() => share(`/post/${post.id}`)} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-surface-3">
            <Share2 className="size-[15px]" />
            Partager
          </button>
          <button type="button" aria-pressed={saved} onClick={() => toggle('saved', post.id)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-surface-3', saved && 'text-accent-text')}>
            <Bookmark className="size-[15px]" fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          <span className="ml-auto hidden gap-1 sm:flex">
            {post.tags.slice(0, 3).map((t) => (
              <TechChip key={t} label={t} />
            ))}
          </span>
        </div>
      </div>
    </article>
  )
}

export const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  Python: '#3572a5',
  Dart: '#00b4ab',
  Go: '#00add8',
  PHP: '#4f5d95',
  Kotlin: '#a97bff',
}

/* ---------------- Entreprises ---------------- */

export function companyOf(slug: string): Company {
  return COMPANIES.find((c) => c.slug === slug) ?? COMPANIES[0]
}

export function CompanyLogo({ slug, size = 44, className }: { slug: string; size?: number; className?: string }) {
  const c = companyOf(slug)
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-[10px] font-semibold text-white', className)} style={{ width: size, height: size, background: c.logoColor, fontSize: size * 0.36 }}>
      {c.logoText}
    </span>
  )
}

/* ---------------- Vidéos (YouTube) ---------------- */

/** Coloration minimale pour les captures d'éditeur des vignettes. */
const KW = /^(const|let|await|async|fn|if|return|for|in|final|Future|void|import|from|export|def|services|image|build|ports|command)$/
function tokenize(line: string) {
  if (/^\s*(\/\/|#|>|\/\*)/.test(line)) return [{ t: line, c: '#6b7280' }]
  return line.split(/('[^']*'|"[^"]*"|\b\d+\b|\w+)/).filter(Boolean).map((t) => ({
    t,
    c: /^['"]/.test(t) ? '#86efac' : /^\d+$/.test(t) ? '#fdba74' : KW.test(t) ? '#93c5fd' : /^[A-Z]/.test(t) ? '#93c5fd' : '#e5e7eb',
  }))
}

/**
 * Vignette vidéo composée : une vraie capture d'éditeur (le code du sujet) et un titre court.
 * Unités de conteneur : la vignette garde ses proportions de 120 px à plein écran.
 */
export function VideoThumb({ video, className, big }: { video: Video; className?: string; big?: boolean }) {
  const t = video.thumb
  const accent = t.accent ?? '#0ea5e9'
  const lines = (t.editor ?? t.code ?? '').split('\n').slice(0, 7)
  return (
    <div className={cn('@container relative aspect-video overflow-hidden rounded-[10px] bg-[#0e1015]', className)}>
      <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(90% 120% at 100% 100%, ${accent}40, transparent 60%), radial-gradient(60% 80% at 0% 0%, ${accent}22, transparent 60%)` }} />
      {/* Fenêtre d'éditeur */}
      <div className="absolute top-[13%] right-[4.5%] bottom-[13%] w-[50%] overflow-hidden rounded-[1.6cqw] border border-white/10 bg-[#0b0d12]/95 shadow-[0_2cqw_6cqw_rgba(0,0,0,0.5)]">
        <div className="flex h-[11%] items-center gap-[1cqw] border-b border-white/[0.06] px-[2cqw]">
          <span className="size-[1.3cqw] rounded-full bg-[#ff5f57]" />
          <span className="size-[1.3cqw] rounded-full bg-[#febc2e]" />
          <span className="size-[1.3cqw] rounded-full bg-[#28c840]" />
          <span className="ml-[1.5cqw] truncate font-mono text-[max(6px,1.9cqw)] text-white/45">{t.file}</span>
        </div>
        <pre className="px-[2.4cqw] py-[2cqw] font-mono text-[max(6px,2.15cqw)] leading-[1.55]">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-[2cqw] whitespace-pre">
              <span className="w-[2.4cqw] shrink-0 text-right text-white/20">{i + 1}</span>
              <span>
                {tokenize(l).map((tk, j) => (
                  <span key={j} style={{ color: tk.c }}>
                    {tk.t}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </pre>
      </div>
      {/* Titre */}
      <div className="absolute top-0 bottom-0 left-0 flex w-[44%] flex-col justify-center pl-[5.5cqw]">
        {t.logo && (
          <span className="mb-[2.5cqw] grid size-[8cqw] place-items-center rounded-[1.8cqw] bg-white/[0.08] text-white">
            <BrandLogo name={t.logo} size={0} className="size-[4.6cqw]" />
          </span>
        )}
        <span className="text-[max(10px,6.4cqw)] leading-[1.04] font-semibold tracking-[-0.03em] text-white">{t.big}</span>
        <span className="mt-[1.8cqw] text-[max(7px,2.3cqw)] font-medium tracking-[0.12em] uppercase" style={{ color: accent }}>
          {t.kicker}
        </span>
      </div>
      {!big &&
        (video.live ? (
          <span className="absolute right-1.5 bottom-1.5 rounded-[4px] bg-[#e5333b] px-1.5 py-0.5 text-[11px] font-semibold text-white">EN DIRECT</span>
        ) : (
          <span className="absolute right-1.5 bottom-1.5 rounded-[4px] bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white tabular">{video.duration}</span>
        ))}
    </div>
  )
}

/* ---------------- Templates ---------------- */

/** Maquette composée en CSS : pas d'image à télécharger. */
export function TemplatePreview({ tpl, className }: { tpl: Template; className?: string }) {
  const { bg, accent, layout } = tpl.preview
  const bar = (w: string, o = 0.18, h = 6) => <span className="block rounded-full" style={{ width: w, height: h, background: `rgba(255,255,255,${o})` }} />
  return (
    <div className={cn('relative aspect-[16/10] overflow-hidden rounded-[10px] border border-line', className)} style={{ background: bg }}>
      <div className="flex h-5 items-center gap-1 px-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <span className="size-1.5 rounded-full bg-[#ff5f57]" />
        <span className="size-1.5 rounded-full bg-[#febc2e]" />
        <span className="size-1.5 rounded-full bg-[#28c840]" />
      </div>
      {layout === 'hero' && (
        <div className="flex h-[calc(100%-20px)] flex-col items-center justify-center gap-2 px-6">
          {bar('55%', 0.85, 10)}
          {bar('40%', 0.35)}
          <span className="mt-2 block h-4 w-20 rounded-full" style={{ background: accent }} />
          <div className="mt-3 grid w-full grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="block h-8 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.07)' }} />
            ))}
          </div>
        </div>
      )}
      {layout === 'dashboard' && (
        <div className="flex h-[calc(100%-20px)]">
          <div className="flex w-[22%] flex-col gap-2 p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i}>{bar(i === 1 ? '80%' : '65%', i === 1 ? 0.6 : 0.18, 5)}</span>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2.5">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="block h-8 rounded-[6px]" style={{ background: i === 0 ? accent : 'rgba(255,255,255,0.07)' }} />
              ))}
            </div>
            <div className="flex flex-1 items-end gap-1 rounded-[6px] p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <span key={i} className="block flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: i === 5 ? accent : 'rgba(255,255,255,0.18)' }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {layout === 'shop' && (
        <div className="grid h-[calc(100%-20px)] grid-cols-3 gap-2 p-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="block flex-1 rounded-[6px]" style={{ background: i === 1 ? accent : 'rgba(255,255,255,0.08)' }} />
              {bar('70%', 0.3, 4)}
            </div>
          ))}
        </div>
      )}
      {layout === 'mobile' && (
        <div className="flex h-[calc(100%-20px)] items-center justify-center gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex h-[86%] w-[26%] flex-col gap-1.5 rounded-[10px] border p-1.5" style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
              <span className="block h-[30%] rounded-[6px]" style={{ background: i === 0 ? accent : 'rgba(255,255,255,0.1)' }} />
              {bar('80%', 0.3, 4)}
              {bar('60%', 0.18, 4)}
              {bar('70%', 0.18, 4)}
            </div>
          ))}
        </div>
      )}
      {(layout === 'blog' || layout === 'docs') && (
        <div className="flex h-[calc(100%-20px)] gap-3 p-3">
          {layout === 'docs' && (
            <div className="flex w-[24%] flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i}>{bar('80%', 0.2, 4)}</span>
              ))}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            {bar('60%', 0.8, 8)}
            {bar('90%', 0.2, 4)}
            {bar('85%', 0.2, 4)}
            <span className="mt-1 block h-10 rounded-[6px] font-mono" style={{ background: 'rgba(0,0,0,0.35)', borderLeft: `3px solid ${accent}` }} />
            {bar('75%', 0.2, 4)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Mise en page commune ---------------- */

/** Rangée de filtres façon YouTube (puces défilantes). */
export function Chips<T extends string>({ items, value, onChange, className }: { items: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex gap-2 overflow-x-auto', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn('h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors', value === it.id ? 'bg-fg text-canvas' : 'bg-surface-1 text-fg hover:bg-surface-2')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** En-tête de page (charte Drivery) : très grand titre gras à gauche, action en pilule à droite. */
export function ServiceHeader({ title, subtitle, actions, children }: { icon?: LucideIcon; color?: string; title: string; subtitle: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.03em] text-fg sm:text-[42px]">{title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">{subtitle}</p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1.5">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

/** Cube 3D (icône des cartes d'indicateurs) : trois faces d'une même couleur. */
export function Cube({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 2.5 21 7.3 12 12.1 3 7.3Z" fill={color} />
      <path d="M3 7.3 12 12.1V22L3 17.1Z" fill={color} style={{ filter: 'brightness(0.78)' }} />
      <path d="M21 7.3 12 12.1V22l9-4.9Z" fill={color} style={{ filter: 'brightness(0.6)' }} />
    </svg>
  )
}

/** Petite courbe (carte noire « earned ») tracée à partir de vraies valeurs. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${36 - ((v - min) / Math.max(1, max - min)) * 32}`).join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${pts} 100,40`} fill="url(#spark)" />
      <polyline points={pts} fill="none" stroke="#fff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

/** Carte d'indicateur : libellé en minuscules, grand chiffre gras, variation verte. */
export function StatCard({ label, value, delta, note, dark, cube, spark, to }: { label: string; value: ReactNode; delta?: string; note?: string; dark?: boolean; cube?: string; spark?: number[]; to?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[12px] sm:text-[13px]', dark ? 'text-white/60' : 'text-muted')}>{label}</span>
        {cube && (
          <span className="grid size-8 place-items-center rounded-[10px] bg-canvas shadow-sm">
            <Cube color={cube} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn('text-[26px] leading-none font-bold tracking-[-0.028em] tabular sm:text-[34px]', dark ? 'text-white' : 'text-fg')}>{value}</span>
        {spark && <Sparkline values={spark} className="hidden h-10 w-[45%] sm:block" />}
      </div>
      {(delta || note) && (
        <p className={cn('mt-3 text-[11.5px] sm:text-[12px]', dark ? 'text-white/75' : 'text-fg')}>
          {delta && <span className={cn('font-semibold', dark ? 'text-[#4ade80]' : 'text-success')}>{delta} </span>}
          {note}
        </p>
      )}
    </>
  )
  const cls = cn('flex flex-col rounded-[20px] p-4 transition-colors sm:p-5', dark ? 'bg-black text-white' : 'bg-surface-1 hover:bg-surface-2')
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export const CUBE = { orange: '#ff9f1a', navy: '#1d4ed8', green: '#22c55e', blue: '#3b82f6', pink: '#ec4899' } as const

/** Petite carte latérale (colonne de droite façon Reddit). */
export function SideCard({ title, children, action, className }: { title: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[20px] bg-surface-1 p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold tracking-[-0.02em] text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded-[4px] bg-surface-3 px-1 py-0.5 font-mono text-[0.88em] text-fg">{children}</code>
}

export const SERVICE_COLORS = {
  feed: '#ff6b3d',
  help: '#f2575a',
  jobs: '#22a3ee',
  certs: '#f0b232',
  skills: '#0ea5e9',
  videos: '#e5333b',
  learn: '#3ccf8e',
  build: '#2563eb',
  templates: '#e879f9',
  projects: '#4f7cff',
  communities: '#fb923c',
} as const

export { Code2 }

/** Badge de certification : écusson sobre, logo de la techno au centre (comme un badge vérifiable). */
export function CertBadge({ color, logo, size = 56, earned = true, className }: { color: string; logo?: string; size?: number; earned?: boolean; className?: string }) {
  const id = `cb-${color.replace('#', '')}-${size}`
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', !earned && 'opacity-90', className)} style={{ width: size, height: size * 1.1 }}>
      <svg viewBox="0 0 100 110" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.95" />
            <stop offset="1" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path d="M50 3 92 25v42c0 21-17 34-42 40C25 101 8 88 8 67V25Z" fill="#14161c" stroke={`url(#${id})`} strokeWidth="5" />
        <path d="M50 14 82 31v35c0 15-12 25-32 30-20-5-32-15-32-30V31Z" fill={color} fillOpacity="0.12" />
      </svg>
      <span className="relative text-white" style={{ marginTop: -size * 0.04 }}>
        {logo && logoFor(logo) ? <BrandLogo name={logo} size={Math.round(size * 0.36)} /> : <Award style={{ width: size * 0.34, height: size * 0.34, color }} />}
      </span>
    </span>
  )
}
