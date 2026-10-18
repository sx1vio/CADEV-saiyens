import { ArrowLeft, ArrowRight, ChevronDown, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorText } from '@/components/domain';
import { Logo } from '@/components/shell/PublicShell';
import { Button } from '@/components/ui/button';
import { Avatar, Field, Input, TechTag } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api, type GitHubImport } from '@/services';
import { useSession } from '@/stores/app';
import { BrandLogo } from '@/platform/logos';
import { authProviders, fetchMe, githubSignInUrl, type Provider } from '@/platform/auth';
import djeli from '@/assets/djeli/laptop.webp';

const COPY = {
  login: {
    title: 'pub.loginTitle',
    text: 'pub.loginText',
    switchText: 'pub.loginSwitchText',
    switchLabel: 'pub.createAccount',
    switchTo: '/inscription',
  },
  signup: {
    title: 'pub.signupTitle',
    text: 'pub.signupText',
    switchText: 'pub.signupSwitchText',
    switchLabel: 'pub.signIn',
    switchTo: '/connexion',
  },
} as const;

/** Connexion et inscription : un seul choix principal (GitHub), le reste replié. */
export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const mode = pathname.startsWith('/inscription') ? 'signup' : 'login';
  const copy = COPY[mode];
  const [params] = useSearchParams();
  const setUser = useSession((s) => s.setUser);
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<GitHubImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [others, setOthers] = useState(false);
  const { data: providers } = useQuery<Record<Provider, boolean>>('auth:providers', authProviders);
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
    if (params.get('erreur')) toast.error(t('pub.authFailed'));
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

  const github = () => {
    if (providers?.github)
      window.location.href = githubSignInUrl(
        `/connexion?oauth=ok&next=${encodeURIComponent(next)}`,
      );
    else setManual(true);
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

  return (
    <div className="flex min-h-dvh gap-3 bg-canvas p-3">
      {/* Panneau de marque : une phrase, une illustration. Rien d'autre à lire. */}
      <aside className="dh-ink relative hidden w-[42%] max-w-[560px] flex-col overflow-hidden rounded-[10px] p-10 lg:flex">
        <Link to="/" aria-label={t('pub.homeAria')} className="w-fit [&_span]:text-white">
          <Logo />
        </Link>
        <p className="mt-auto max-w-sm text-[30px] leading-[1.15] font-bold tracking-[-0.02em]">
          {t('pub.brandLine')}
        </p>
        <p className="mt-3 max-w-sm text-[15px] text-white/60">{t('pub.brandText')}</p>
        <img
          src={djeli}
          alt=""
          className="pointer-events-none absolute top-16 right-6 w-[46%] max-w-[240px] opacity-95 drop-shadow-2xl"
        />
      </aside>

      <main id="main" className="flex flex-1 flex-col px-3 py-4 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden" aria-label={t('pub.homeAria')}>
            <Logo />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Link>
        </div>

        <div className="dh-page mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-fg">
            {t(copy.title)}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(copy.text)}</p>

          {!found && !manual && (
            <div className="mt-8 flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center"
                loading={busy}
                onClick={github}
              >
                <BrandLogo name="GitHub" size={18} mono />
                {t('pub.continueGithub')}
              </Button>
              {api.mode === 'local' && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full justify-center"
                  disabled={busy}
                  onClick={demo}
                >
                  {t('pub.visit')}
                </Button>
              )}

              <button
                type="button"
                aria-expanded={others}
                onClick={() => setOthers((o) => !o)}
                className="mt-1 inline-flex items-center justify-center gap-1 text-[13px] font-medium text-subtle hover:text-fg"
              >
                {t('pub.otherMethods')}
                <ChevronDown
                  className={cn('size-4 transition-transform', others && 'rotate-180')}
                />
              </button>
              {others && (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['gitlab', 'GitLab'],
                      ['google', 'Google'],
                    ] as const
                  ).map(([p, label]) => (
                    <Button
                      key={p}
                      variant="secondary"
                      className="justify-center"
                      disabled={!providers?.[p]}
                      title={providers?.[p] ? undefined : t('pub.comingSoon')}
                    >
                      <BrandLogo name={label} size={16} />
                      {label}
                      {!providers?.[p] && (
                        <span className="text-[12px] font-normal text-subtle">
                          {t('pub.soonShort')}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {manual && !found && (
            <form onSubmit={importProfile} className="mt-8 flex flex-col gap-3">
              <p className="text-[13px] text-muted">{t('pub.githubOff')}</p>
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
                {t('common.back')}
              </button>
            </form>
          )}

          {found && (
            <div className="dh-card mt-8 flex flex-col gap-5 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={found.displayName} src={found.avatarUrl} size={52} />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold text-fg">{found.displayName}</p>
                  <p className="truncate text-[13px] text-muted">
                    @{found.handle} · {t('pub.publicRepos', { count: found.publicRepos })}
                  </p>
                </div>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 6).map(([slug]) => (
                    <TechTag key={slug} label={slug} />
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

          <p className="mt-8 text-center text-[14px] text-muted">
            {t(copy.switchText)}{' '}
            <Link to={copy.switchTo} className="font-semibold text-fg hover:underline">
              {t(copy.switchLabel)}
            </Link>
          </p>
          <p className="mt-6 text-center text-[12px] leading-relaxed text-subtle">
            <Lock className="mr-1.5 inline size-3.5 align-[-2px]" />
            {t('pub.readOnly')}
          </p>
        </div>
      </main>
    </div>
  );
}
