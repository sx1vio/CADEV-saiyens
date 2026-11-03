import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand';
import { Djeli } from '@/components/djeli';
import { errorText } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Avatar, Field, Input, TechTag } from '@/components/ui/primitives';
import { AccountError, loginAccount, registerAccount } from '@/lib/account';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { BrandLogo as TechLogo } from '@/platform/logos';
import { authProviders, fetchMe, githubSignInUrl, type Provider } from '@/platform/auth';
import { api, type GitHubImport, type User } from '@/services';
import { useSession } from '@/stores/app';

/** Force du mot de passe : longueur, variété, pas de motif évident. 0 à 4. */
function strength(pw: string) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (/^(.)\1+$|^(123|azerty|qwerty|password|motdepasse)/i.test(pw)) s = 0;
  return Math.min(4, s);
}
const STRENGTH = ['Trop court', 'Faible', 'Correct', 'Solide', 'Excellent'];
const STRENGTH_COLOR = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];

/**
 * Connexion et inscription (deux routes, un seul écran) :
 * e-mail + mot de passe (compte serveur), GitHub / GitLab / Google quand ils sont configurés,
 * ou import du profil GitHub public, et l'essai sans compte.
 */
export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const signup = pathname.startsWith('/inscription');
  const setUser = useSession((s) => s.setUser);
  const next = params.get('next') ?? '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghMode, setGhMode] = useState(false);
  const [handle, setHandle] = useState('');
  const [found, setFound] = useState<GitHubImport | null>(null);

  const { data: providers } = useQuery<Record<Provider, boolean>>('auth:providers', authProviders);

  useEffect(() => setError(null), [signup]);

  const done = (u: User) => {
    setUser(u);
    invalidate('');
    nav(u.codeOfConductAcceptedAt ? next : '/bienvenue', { replace: true });
  };

  // Retour d'OAuth : le serveur a ouvert la session, on ouvre le profil de l'appareil.
  const handled = useRef(false);
  useEffect(() => {
    if (params.get('erreur'))
      toast.error(
        params.get('erreur') === 'suspended' ? t('pub.authSuspended') : t('pub.authFailed'),
      );
    if (params.get('oauth') !== 'ok' || handled.current) return;
    handled.current = true;
    setBusy(true);
    void (async () => {
      try {
        const me = await fetchMe();
        done(await api.signUpWithGitHub(await api.importGitHub(me.handle)));
      } catch (err) {
        toast.error(errorText(t, err));
        setBusy(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pw = strength(password);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signup) {
      if (name.trim().length < 2) return setError('Indique ton nom (2 caractères au moins).');
      if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.');
      if (!accept) return setError('Accepte les règles de la communauté pour continuer.');
    }
    setBusy(true);
    try {
      done(
        signup ? await registerAccount(name, email, password) : await loginAccount(email, password),
      );
    } catch (err) {
      setError(err instanceof AccountError ? err.message : errorText(t, err));
      setBusy(false);
    }
  };

  const oauth = (p: Provider) => {
    // L'OAuth GitHub passe par l'API ; sans API (serveur simulé), on importe le profil public.
    if (p === 'github' && providers?.github && api.mode === 'http')
      window.location.href = githubSignInUrl(
        `/connexion?oauth=ok&next=${encodeURIComponent(next)}`,
      );
    else if (p === 'github') setGhMode(true);
  };

  const importGh = async (e: FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setFound(await api.importGitHub(handle.trim()));
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
      setBusy(false);
    }
  };

  const available = (['github', 'gitlab', 'google'] as const).filter(
    (p) => p === 'github' || providers?.[p],
  );
  const label = { github: 'GitHub', gitlab: 'GitLab', google: 'Google' };

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Panneau de marque, bleu nuit et horizon, comme la landing */}
      <aside className="relative hidden w-[44%] max-w-[620px] flex-col overflow-hidden bg-[#0a0f1f] p-10 text-white lg:flex">
        <Link to="/">
          <BrandLogo size={38} onDark />
        </Link>
        <h2 className="mt-16 text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em]">
          {signup ? 'Ton QG de dev commence ici' : 'Content de te revoir'}
          <span className="text-[#f2b33d]">.</span>
        </h2>
        <ul className="mt-8 flex flex-col gap-3.5 text-[15.5px] text-white/75">
          {[
            'Des cours gratuits, 10 minutes par jour',
            'De l’aide quand tu es bloqué',
            'Un profil qui prouve ce que tu sais faire',
          ].map((b) => (
            <li key={b} className="flex items-center gap-3">
              <Check className="size-4 text-[#2dd4bf]" />
              {b}
            </li>
          ))}
        </ul>
        {/* Djeli, en grand, posé en bas du panneau */}
        <Djeli
          pose={signup ? 'wave' : 'laptop'}
          size={300}
          eager
          className="absolute -bottom-6 right-6"
        />
      </aside>

      <main id="main" className="flex flex-1 flex-col px-4 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden">
            <BrandLogo size={32} />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Link>
        </div>

        <div className="dh-page mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="mt-2 text-[36px] leading-[1.05] font-bold tracking-[-0.03em] text-fg">
                {signup ? 'Créer ton compte' : 'Se connecter'}
              </h1>
              <p className="mt-2 text-[14px] text-muted">
                {signup ? 'Déjà inscrit ? ' : 'Pas encore de compte ? '}
                <Link
                  to={`${signup ? '/connexion' : '/inscription'}${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="font-semibold text-accent-text hover:underline"
                >
                  {signup ? 'Se connecter' : 'Créer un compte'}
                </Link>
              </p>
            </div>
            <Djeli pose="wave" size={88} eager className="shrink-0" />
          </div>

          {!ghMode && (
            <>
              <div
                className={cn(
                  'mt-7 grid gap-2',
                  available.length === 2 && 'sm:grid-cols-2',
                  available.length === 3 && 'sm:grid-cols-3',
                )}
              >
                {available.map((p) => (
                  <Button
                    key={p}
                    variant="secondary"
                    size="lg"
                    className="w-full justify-center"
                    onClick={() => oauth(p)}
                    disabled={busy}
                  >
                    <TechLogo name={label[p]} size={18} />
                    {available.length > 1 ? label[p] : `Continuer avec ${label[p]}`}
                  </Button>
                ))}
              </div>

              <div className="my-6 flex items-center gap-3 text-[12px] text-subtle">
                <span className="h-px flex-1 bg-line-strong" />
                ou avec ton e-mail
                <span className="h-px flex-1 bg-line-strong" />
              </div>

              <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                {signup && (
                  <Field label="Nom" htmlFor="au-name">
                    <Input
                      id="au-name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Awa Koné"
                    />
                  </Field>
                )}
                <Field label="Adresse e-mail" htmlFor="au-email">
                  <Input
                    id="au-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="awa@exemple.com"
                    required
                  />
                </Field>
                <Field
                  label="Mot de passe"
                  htmlFor="au-pw"
                  hint={
                    signup
                      ? '8 caractères au moins. Une phrase courte est plus sûre qu’un mot compliqué.'
                      : undefined
                  }
                >
                  <div className="relative">
                    <Input
                      id="au-pw"
                      type={show ? 'text' : 'password'}
                      autoComplete={signup ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-fg"
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                {signup && password && (
                  <div className="-mt-2 flex items-center gap-2" aria-live="polite">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            i < Math.max(1, pw) ? STRENGTH_COLOR[pw] : 'bg-surface-3',
                          )}
                        />
                      ))}
                    </div>
                    <span className="w-20 text-right text-[12px] text-muted">
                      {password.length < 8 ? STRENGTH[0] : STRENGTH[pw]}
                    </span>
                  </div>
                )}
                {signup && (
                  <label className="flex items-start gap-2.5 text-[13px] text-muted">
                    <input
                      type="checkbox"
                      checked={accept}
                      onChange={(e) => setAccept(e.target.checked)}
                      className="mt-0.5 size-4 accent-[var(--accent)]"
                    />
                    <span>
                      J’accepte les{' '}
                      <Link
                        to="/regles"
                        target="_blank"
                        className="font-medium text-accent-text hover:underline"
                      >
                        règles de la communauté
                      </Link>{' '}
                      : bienveillance, entraide honnête, pas de spam.
                    </span>
                  </label>
                )}
                {error && (
                  <p
                    role="alert"
                    className="rounded-[12px] bg-danger-soft px-3 py-2.5 text-[13px] text-danger"
                  >
                    {error}
                  </p>
                )}
                <Button type="submit" variant="primary" size="lg" loading={busy}>
                  {signup ? 'Créer mon compte' : 'Se connecter'}
                  <ArrowRight />
                </Button>
              </form>
            </>
          )}

          {ghMode && !found && (
            <form onSubmit={importGh} className="mt-7 flex flex-col gap-3">
              <p className="text-[13.5px] text-muted">
                On lit ton profil GitHub public (dépôts et langages) pour remplir tes compétences.
                Aucun droit d’écriture.
              </p>
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
                />
              </Field>
              <Button type="submit" variant="primary" size="lg" loading={busy}>
                <TechLogo name="GitHub" size={18} mono />
                {busy ? t('auth.importing') : t('auth.importBtn')}
              </Button>
              <button
                type="button"
                onClick={() => setGhMode(false)}
                className="text-[13px] font-medium text-muted hover:text-fg"
              >
                Revenir à l’e-mail
              </button>
            </form>
          )}

          {found && (
            <div className="dh-page mt-7 flex flex-col gap-4 rounded-[24px] bg-surface-1 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={found.displayName} src={found.avatarUrl} size={52} />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold text-fg">{found.displayName}</p>
                  <p className="truncate text-[13px] text-muted">
                    @{found.handle} · {found.publicRepos} dépôts publics
                  </p>
                </div>
              </div>
              {Object.keys(found.skills).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(found.skills)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([slug, n]) => (
                      <TechTag key={slug} label={`${slug} · ${n}`} />
                    ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setFound(null)}>
                  {t('auth.notMe')}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const u = await api.signUpWithGitHub(found);
                      done(u);
                    } catch (err) {
                      toast.error(errorText(t, err));
                      setBusy(false);
                    }
                  }}
                >
                  <Check />
                  {t('auth.confirm')}
                </Button>
              </div>
            </div>
          )}

          {/* Les comptes de démonstration n'existent qu'avec le serveur simulé (ADR-0016). */}
          {api.mode === 'local' && (
            <div className="mt-8 flex items-center justify-between gap-3 rounded-[18px] bg-surface-1 px-4 py-3">
              <p className="text-[13px] text-muted">
                Juste regarder ? Entre sur un compte de démonstration.
              </p>
              <Button variant="secondary" size="sm" onClick={demo} disabled={busy}>
                {t('auth.demoBtn')}
              </Button>
            </div>
          )}
          <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-subtle">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            Mot de passe chiffré (scrypt), session sécurisée par cookie. On ne revend aucune donnée.
          </p>
        </div>
      </main>
    </div>
  );
}
