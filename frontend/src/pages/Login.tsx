import { ArrowLeft, ArrowRight, Info, Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import heroHub from '@/assets/hero-hub.webp'
import { Djeli } from '@/components/djeli'
import { errorText } from '@/components/domain'
import { GitHubIcon } from '@/components/icons'
import { Logo } from '@/components/shell/PublicShell'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Field, Input, TechTag } from '@/components/ui/primitives'
import { invalidate } from '@/lib/query'
import { api, type GitHubImport } from '@/services'
import { useSession } from '@/stores/app'

/** A1 : connexion GitHub → Passport rempli en moins de 3 clics. */
export default function Login() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const setUser = useSession((s) => s.setUser)
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState<GitHubImport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!handle.trim()) return
    setBusy(true)
    setError(null)
    try {
      setFound(await api.importGitHub(handle))
    } catch (err) {
      setError(errorText(t, err))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!found) return
    setBusy(true)
    try {
      const u = await api.signUpWithGitHub(found)
      setUser(u)
      invalidate('')
      nav(u.codeOfConductAcceptedAt ? (params.get('next') ?? '/') : '/bienvenue')
    } catch (err) {
      toast.error(errorText(t, err))
    } finally {
      setBusy(false)
    }
  }

  const demo = async () => {
    setBusy(true)
    try {
      const u = await api.loginDemo('awa-kone')
      setUser(u)
      invalidate('')
      nav('/')
    } catch (err) {
      toast.error(errorText(t, err))
    } finally {
      setBusy(false)
    }
  }

  const skills = found ? Object.entries(found.skills).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1fr_minmax(480px,560px)]">
      {/* Panneau de marque */}
      <aside className="relative hidden overflow-hidden bg-hero p-10 text-on-hero lg:flex lg:flex-col">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_100%,rgba(255,255,255,0.16),transparent_60%)]" />
        <Link to="/" className="relative inline-flex items-center gap-2 font-bold">
          <img src="/favicon.svg" alt="" className="size-9 rounded-[12px] ring-2 ring-white/30" />
          DevHub Africa
        </Link>
        <img src={heroHub} alt="" width={600} height={573} className="pointer-events-none absolute -top-10 -right-24 w-[520px] max-w-none opacity-90" />
        <div className="relative mt-auto max-w-lg">
          <Djeli pose="wave" size={150} float />
          <p className="mt-6 text-[34px] leading-[1.08] font-bold tracking-tight">{t('app.slogan')}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-on-hero-muted">{t('app.pitch')}</p>
        </div>
      </aside>

      {/* Formulaire */}
      <main id="main" className="flex flex-col px-5 py-6 sm:px-10 sm:py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden" aria-label={t('app.name')}>
            <Logo />
          </Link>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Link>
        </div>

        <div className="dh-page mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-fg">{t('auth.title')}</h1>
          <p className="mt-2 text-muted">{t('auth.subtitle')}</p>

          {!found ? (
            <form onSubmit={importProfile} className="mt-8 flex flex-col gap-4">
              <Field label={t('auth.githubLabel')} htmlFor="gh" error={error}>
                <div className="relative">
                  <GitHubIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-subtle" />
                  <Input
                    id="gh"
                    autoFocus
                    autoComplete="username"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={t('auth.githubPlaceholder')}
                    className="h-12 pl-11 text-[15px]"
                    aria-invalid={!!error || undefined}
                  />
                </div>
              </Field>
              <Button type="submit" variant="primary" size="lg" loading={busy} icon={<GitHubIcon />}>
                {busy ? t('auth.importing') : t('auth.importBtn')}
              </Button>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                {t('auth.privacy')}
              </p>
            </form>
          ) : (
            <div className="dh-page mt-8 flex flex-col gap-5 rounded-[20px] border border-line bg-surface-1 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={found.displayName} src={found.avatarUrl} size={56} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-fg">{found.displayName}</p>
                  <p className="truncate text-sm text-subtle">
                    @{found.handle}
                    {found.location ? ` · ${found.location}` : ''}
                  </p>
                </div>
              </div>
              <Badge tone="blue" className="self-start">
                <GitHubIcon />
                {t('auth.found', { repos: found.publicRepos })}
              </Badge>
              <div>
                <p className="label-caps">{t('auth.skillsDetected')}</p>
                {skills.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.slice(0, 10).map(([slug, n]) => (
                      <TechTag key={slug} label={`${slug} · ${n}`} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">{t('auth.noSkills')}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button variant="primary" size="lg" className="flex-1" loading={busy} onClick={confirm}>
                  {t('auth.confirm')}
                  <ArrowRight />
                </Button>
                <Button variant="ghost" size="lg" onClick={() => setFound(null)}>
                  {t('auth.notMe')}
                </Button>
              </div>
            </div>
          )}

          <div className="my-8 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" />
            {t('common.or')}
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="flex items-center gap-4 rounded-[20px] border border-line bg-surface-1 p-4">
            <Djeli pose="point" size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">{t('auth.demoTitle')}</p>
              <p className="text-sm text-muted">{t('auth.demoText')}</p>
            </div>
          </div>
          <Button variant="secondary" size="lg" className="mt-3" loading={busy} onClick={demo}>
            {t('auth.demoBtn')}
          </Button>

          {api.mode === 'local' && (
            <p className="mt-6 flex items-start gap-2 rounded-[12px] bg-surface-1 px-3 py-2.5 text-xs leading-relaxed text-subtle">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {t('auth.localNote')}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
