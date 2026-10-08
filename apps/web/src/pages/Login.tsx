import { ArrowLeft, ArrowRight, Info, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Avatar, Field, Input, TechTag } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { api, type GitHubImport } from '@/services';
import { useSession } from '@/stores/app';
import { BrandLogo } from '@/platform/logos';
import { fetchHome, type HomeNews } from '@/platform/news';
import { Ago } from '@/platform/ui';
import { authProviders, fetchMe, githubSignInUrl, type Provider } from '@/platform/auth';

/** Connexion : GitHub, GitLab, Google (OAuth réel côté serveur), ou compte de démonstration. */
export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const setUser = useSession((s) => s.setUser);
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<GitHubImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const { data: providers } = useQuery<Record<Provider, boolean>>('auth:providers', authProviders);
  const { data: news } = useQuery<HomeNews>('news:home:all', () => fetchHome('all'));
  const next = params.get('next') ?? '/';

  const finish = async (data: GitHubImport) => {
    const u = await api.signUpWithGitHub(data);
    setUser(u);
    invalidate('');
    nav(u.codeOfConductAcceptedAt ? next : '/bienvenue');
  };

  // Retour d'OAuth : le serveur a ouvert une session, on récupère le profil et on importe les compétences.
  const handled = useRef(false);
  useEffect(() => {
    if (params.get('erreur')) toast.error('La connexion a échoué ou a été annulée. Réessaie.');
    if (params.get('oauth') !== 'ok' || handled.current) return;
    handled.current = true;
    setBusy(true);
    void (async () => {
      try {
        const me = await fetchMe();
        await finish(await api.importGitHub(me.handle));
      } catch (err) {
        toast.error(errorText(t, err));
        setBusy(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const oauth = (p: Provider) => {
    if (providers?.[p])
      window.location.href = githubSignInUrl(
        `/connexion?oauth=ok&next=${encodeURIComponent(next)}`,
      );
    else if (p === 'github') setManual(true);
  };

  const importProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setFound(await api.importGitHub(handle));
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setBusy(true);
    try {
      const u = await api.loginDemo('awa-kone');
      setUser(u);
      invalidate('');
      nav('/');
    } catch (err) {
      toast.error(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  const skills = found ? Object.entries(found.skills).sort((a, b) => b[1] - a[1]) : [];
  const providerBtn = (p: Provider, label: string, logo: string, primary?: boolean) => {
    const ready = providers?.[p] ?? false;
    const disabled = !ready && p !== 'github';
    return (
      <Button
        key={p}
        variant={primary ? 'primary' : 'secondary'}
        size="lg"
        className="w-full justify-center"
        onClick={() => oauth(p)}
        disabled={disabled || busy}
        title={disabled ? 'Connexion en cours de configuration sur le serveur' : undefined}
      >
        <BrandLogo name={logo} size={18} mono={primary} />
        {label}
        {disabled && <span className="ml-1 text-[12px] font-normal text-subtle">· bientôt</span>}
      </Button>
    );
  };

  return (
    <div className="flex min-h-dvh gap-3 bg-canvas p-3">
      {/* Panneau noir : la plateforme en un coup d'œil, avec l'actu réelle du moment */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col overflow-hidden rounded-[28px] bg-black p-9 text-white lg:flex">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[11px] bg-accent-strong">
            <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
              <path
                d="M24 20 14 32l10 12M40 20l10 12-10 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="32" r="5" fill="currentColor" />
            </svg>
          </span>
          <span className="text-[20px] font-bold tracking-[-0.03em]">DevHub</span>
        </Link>
        <h2 className="mt-14 text-[44px] leading-[1.02] font-bold tracking-[-0.045em]">
          La plateforme où les devs se retrouvent.
        </h2>
        <p className="mt-4 max-w-md text-[15px] text-white/65">
          Actu IA et tech, vidéos, entraide, emplois, certifications gratuites, skills pour agents
          IA et un guide pour créer ton app avec l’IA. Au même endroit.
        </p>
        {news && news.hero.length > 0 && (
          <div className="mt-auto">
            <p className="mb-3 inline-flex items-center gap-2 text-[12px] font-medium text-white/55">
              <span className="size-2 rounded-full bg-[#4ade80]" />
              En ce moment sur DevHub
            </p>
            <ul className="flex flex-col gap-2">
              {news.hero.slice(0, 3).map((h) => (
                <li key={h.id} className="rounded-[18px] bg-[#1c1c1e] px-4 py-3">
                  <p className="line-clamp-2 text-[14px] leading-snug font-medium">{h.title}</p>
                  <p className="mt-1 text-[12px] text-white/50">
                    {h.sourceName} · <Ago iso={h.publishedAt} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <main id="main" className="flex flex-1 flex-col px-3 py-4 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 self-end text-[13px] font-medium text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Link>
        <div className="dh-page mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[42px] leading-[1.05] font-bold tracking-[-0.045em] text-fg">
            Connexion
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            Ton profil se remplit tout seul depuis tes dépôts publics. Aucun mot de passe à retenir.
          </p>

          {!found && !manual && (
            <div className="mt-8 flex flex-col gap-2.5">
              {providerBtn('github', 'Continuer avec GitHub', 'GitHub', true)}
              {providerBtn('gitlab', 'Continuer avec GitLab', 'GitLab')}
              {providerBtn('google', 'Continuer avec Google', 'Google')}
              <p className="mt-1 flex items-start gap-2 text-[12px] leading-relaxed text-subtle">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                Lecture seule de ton profil public et de ton e-mail. On n’écrit jamais dans tes
                dépôts.
              </p>
            </div>
          )}

          {manual && !found && (
            <form onSubmit={importProfile} className="mt-8 flex flex-col gap-3">
              <Field label={t('auth.githubLabel')} htmlFor="gh" error={error}>
                <Input
                  id="gh"
                  autoFocus
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={t('auth.githubPlaceholder')}
                  aria-invalid={!!error || undefined}
                />
              </Field>
              <Button type="submit" variant="primary" size="lg" loading={busy}>
                <BrandLogo name="GitHub" size={18} mono />
                {busy ? t('auth.importing') : t('auth.importBtn')}
              </Button>
              <button
                type="button"
                onClick={() => setManual(false)}
                className="text-[13px] font-medium text-muted hover:text-fg"
              >
                Autres moyens de connexion
              </button>
            </form>
          )}

          {found && (
            <div className="dh-page mt-8 flex flex-col gap-5 rounded-[24px] bg-surface-1 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={found.displayName} src={found.avatarUrl} size={56} />
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-bold text-fg">{found.displayName}</p>
                  <p className="truncate text-[13px] text-muted">
                    @{found.handle}
                    {found.location ? ` · ${found.location}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-fg">
                <b className="font-semibold">{found.publicRepos}</b>{' '}
                <span className="text-muted">dépôts publics analysés</span>
              </p>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 10).map(([slug, n]) => (
                    <TechTag key={slug} label={`${slug} · ${n}`} />
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await finish(found);
                    } catch (err) {
                      toast.error(errorText(t, err));
                      setBusy(false);
                    }
                  }}
                >
                  {t('auth.confirm')}
                  <ArrowRight />
                </Button>
                <Button variant="ghost" size="lg" onClick={() => setFound(null)}>
                  {t('auth.notMe')}
                </Button>
              </div>
            </div>
          )}

          <div className="my-7 flex items-center gap-3 text-[12px] text-subtle">
            <span className="h-px flex-1 bg-line-strong" />
            {t('common.or')}
            <span className="h-px flex-1 bg-line-strong" />
          </div>
          <div className="rounded-[24px] bg-surface-1 p-5">
            <p className="text-[15px] font-bold text-fg">{t('auth.demoTitle')}</p>
            <p className="mt-1 text-[13px] text-muted">{t('auth.demoText')}</p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-4 w-full"
              loading={busy}
              onClick={demo}
            >
              {t('auth.demoBtn')}
            </Button>
          </div>
          {providers && !providers.github && (
            <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-subtle">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              La connexion OAuth s’active dès que les clés GitHub, GitLab et Google sont renseignées
              sur le serveur. En attendant, GitHub passe par l’import de ton profil public.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
