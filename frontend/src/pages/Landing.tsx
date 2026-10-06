import { ArrowRight, Award, Briefcase, GraduationCap, LifeBuoy, PlaySquare, Puzzle, Users, Wand2, Newspaper } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { errorText } from '@/components/domain'
import { Button, ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { invalidate, useQuery } from '@/lib/query'
import { api } from '@/services'
import { useSession } from '@/stores/app'
import { BrandLogo } from '@/platform/logos'
import { fetchHome, type HomeNews } from '@/platform/news'
import { HeroNews, SectionHead, VideoTile } from '@/platform/newsui'
import { CUBE, Cube, Sparkline } from '@/platform/ui'
import { PLATFORM_CERTS } from '@/platform/data/certs'
import { JOBS } from '@/platform/data/jobs'
import { SKILLS } from '@/platform/data/skills'

const SERVICES = [
  { to: '/', icon: Newspaper, title: 'Actualités', text: 'IA, Apple, Google, Samsung, dev : plus de 70 sources suivies en continu, en français et en anglais.', cube: CUBE.orange },
  { to: '/videos', icon: PlaySquare, title: 'Vidéos', text: 'Les nouvelles vidéos des chaînes tech et dev qui comptent, lisibles sur la plateforme.', cube: CUBE.pink },
  { to: '/sos', icon: LifeBuoy, title: 'Entraide', text: 'Bloqué ? Une piste en quelques secondes, puis l’aide d’un dev qui a déjà résolu le même problème.', cube: CUBE.purple },
  { to: '/emplois', icon: Briefcase, title: 'Emplois', text: 'Des offres où les entreprises demandent des compétences prouvées, pas des CV déclaratifs.', cube: CUBE.blue },
  { to: '/certifications', icon: Award, title: 'Certifications', text: 'Gratuites sur DevHub, et la base de toutes les certifications du marché pour bien choisir.', cube: CUBE.green },
  { to: '/skills', icon: Puzzle, title: 'Skills et plugins IA', text: 'Pour Claude Code, Codex, Antigravity et Cursor : skills, serveurs MCP, règles de projet.', cube: CUBE.purple },
  { to: '/apprendre', icon: GraduationCap, title: 'Apprendre', text: 'Des parcours gratuits, du premier HTML aux agents IA, qui mènent à une certification.', cube: CUBE.green },
  { to: '/creer', icon: Wand2, title: 'Créer une app avec l’IA', text: 'Un guide de l’idée à la mise en ligne, avec les points d’attention de chaque étape.', cube: CUBE.orange },
  { to: '/communautes', icon: Users, title: 'Communautés', text: 'Des espaces par sujet pour partager tes projets, tes questions et tes découvertes.', cube: CUBE.blue },
]

/** Page publique : comprise en 20 secondes, remplie de vraies infos, essai sans compte. */
export default function Landing() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const setUser = useSession((s) => s.setUser)
  const [busy, setBusy] = useState(false)
  const { data: news } = useQuery<HomeNews>('news:home:all', () => fetchHome('all'))
  const { data: health } = useQuery<{ newsItems: number }>('health', async () => {
    const r = await fetch('/api/health')
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  })

  const tryDemo = async () => {
    setBusy(true)
    try {
      const u = await api.loginDemo('awa-kone')
      setUser(u)
      invalidate('')
      nav('/')
    } catch (e) {
      toast.error(errorText(t, e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dh-page mx-auto flex max-w-7xl flex-col px-4 pt-6 pb-8 sm:px-6 sm:pt-10">
      {/* Accroche */}
      <section className="grid items-stretch gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col justify-center py-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-1 px-3 py-1.5 text-[12.5px] font-medium text-fg">
            <span className="size-2 rounded-full bg-success" />
            Par les devs, pour les devs
          </p>
          <h1 className="mt-5 text-[44px] leading-[1.0] font-bold tracking-[-0.05em] text-fg sm:text-[64px]">La plateforme où les devs se retrouvent.</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
            L’actu IA et tech en continu, les vidéos qui comptent, l’entraide, les emplois, les certifications gratuites, les skills pour agents IA et un guide pour créer ton app. Au même endroit.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <ButtonLink to="/connexion" variant="primary" size="lg">
              <BrandLogo name="GitHub" size={18} mono />
              Rejoindre avec GitHub
            </ButtonLink>
            <Button variant="secondary" size="lg" loading={busy} onClick={tryDemo}>
              Visiter sans compte
              <ArrowRight />
            </Button>
          </div>
          <p className="mt-3 text-[12.5px] text-subtle">Aussi avec GitLab ou Google. Gratuit, sans publicité.</p>
        </div>

        {/* Carte noire : la plateforme en chiffres réels */}
        <div className="flex flex-col rounded-[28px] bg-black p-6 text-white sm:p-7">
          <p className="text-[13px] text-white/60">éléments d’actu indexés</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <span className="text-[56px] leading-none font-bold tracking-[-0.05em] tabular">{health ? health.newsItems.toLocaleString('fr-FR') : '—'}</span>
            <Sparkline values={[3, 4, 4, 6, 5, 7, 8, 8, 10, 11]} className="h-14 w-[45%]" />
          </div>
          <p className="mt-3 text-[12.5px] text-white/70">
            <span className="font-semibold text-[#4ade80]">{news?.sources ?? '…'}</span> sources suivies, mises à jour toutes les 15 minutes
          </p>
          {news && (
            <ul className="mt-6 flex flex-col gap-1.5">
              {Object.values(news.sections)
                .flat()
                .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                .slice(0, 4)
                .map((it) => (
                  <li key={it.id}>
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-[#1c1c1e]">
                      <span className="w-14 shrink-0 text-[11px] text-white/45">{new Date(it.publishedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90">{it.title}</span>
                      <span className="hidden shrink-0 text-[11px] text-white/45 sm:inline">{it.sourceName}</span>
                    </a>
                  </li>
                ))}
            </ul>
          )}
          <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
            {[
              { n: PLATFORM_CERTS.length, l: 'certifications gratuites', c: CUBE.green },
              { n: JOBS.length, l: 'offres d’emploi', c: CUBE.orange },
              { n: SKILLS.length, l: 'skills et plugins IA', c: CUBE.purple },
            ].map((x) => (
              <div key={x.l} className="rounded-[18px] bg-[#1c1c1e] p-3">
                <Cube color={x.c} size={16} />
                <p className="mt-2 text-[22px] leading-none font-bold tabular">{x.n}</p>
                <p className="mt-1 text-[11.5px] leading-tight text-white/55">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* La vraie actu, visible sans compte */}
      <section className="mt-14">
        <SectionHead title="À la une en ce moment" action={{ label: 'Toute l’actu', to: '/connexion' }} />
        {news ? <HeroNews items={news.hero} /> : <Skeleton className="h-[380px] rounded-[24px]" />}
      </section>

      {news && news.videos.length > 0 && (
        <section className="mt-14">
          <SectionHead title="Vidéos du moment" action={{ label: 'Toutes les vidéos', to: '/videos' }} />
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {news.videos.slice(0, 4).map((v) => (
              <VideoTile key={v.id} item={v} />
            ))}
          </div>
        </section>
      )}

      {/* Les services */}
      <section className="mt-14">
        <SectionHead title="Tout ce qu’il faut à un dev" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.title} to={s.to} className="group flex flex-col rounded-[24px] bg-surface-1 p-5 transition-colors hover:bg-surface-2">
              <div className="flex items-start justify-between">
                <s.icon className="size-6 text-fg" />
                <span className="grid size-9 place-items-center rounded-[12px] bg-canvas shadow-sm">
                  <Cube color={s.cube} />
                </span>
              </div>
              <h3 className="mt-6 text-[18px] font-bold tracking-[-0.03em] text-fg">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-fg">
                Découvrir
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Appel final */}
      <section className="mt-14 flex flex-col items-start gap-5 rounded-[28px] bg-black p-8 text-white sm:flex-row sm:items-center sm:p-10">
        <div className="flex-1">
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.04em] sm:text-[38px]">Ton profil se remplit tout seul.</h2>
          <p className="mt-2 max-w-xl text-[15px] text-white/65">Connecte GitHub : tes langages et tes projets sont importés, puis chaque aide donnée, chaque contribution et chaque certification devient une preuve visible par les recruteurs.</p>
        </div>
        <ButtonLink to="/connexion" variant="contrast" size="lg">
          Commencer gratuitement
          <ArrowRight />
        </ButtonLink>
      </section>
    </div>
  )
}
