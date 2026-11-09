import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand';
import { Djeli } from '@/components/djeli';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { AccountError, requestPasswordReset, resetPassword } from '@/lib/account';

/**
 * Mot de passe oublié, en deux temps : demander un lien par e-mail, puis choisir un nouveau
 * mot de passe depuis ce lien. Le jeton arrive dans le fragment (#…) : il n'est jamais envoyé
 * au serveur web ni écrit dans un journal, et on l'efface de la barre d'adresse.
 */
export default function PasswordReset() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [token] = useState(() => {
    const t = window.location.hash.slice(1);
    if (t) history.replaceState(null, '', window.location.pathname);
    return t;
  });
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Entre une adresse e-mail valide.');
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof AccountError ? err.message : 'Une erreur est survenue. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.');
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast.success('Mot de passe changé. Connecte-toi avec le nouveau.');
      nav('/connexion', { replace: true });
    } catch (err) {
      setError(err instanceof AccountError ? err.message : 'Une erreur est survenue. Réessaie.');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4 py-5 sm:px-10">
      <div className="flex items-center justify-between">
        <Link to="/">
          <BrandLogo size={32} />
        </Link>
        <Link
          to="/connexion"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Retour à la connexion
        </Link>
      </div>

      <main
        id="main"
        className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10"
      >
        <Djeli pose={sent ? 'celebrate' : 'laptop'} size={96} eager className="mx-auto" />
        {token ? (
          <>
            <h1 className="mt-4 text-center text-[28px] font-bold tracking-[-0.02em] text-fg">
              Nouveau mot de passe
            </h1>
            <p className="mt-2 text-center text-[15px] text-muted">
              Choisis-en un nouveau. Tes autres sessions seront fermées.
            </p>
            <form onSubmit={save} className="mt-7 flex flex-col gap-4" noValidate>
              <Field
                label="Nouveau mot de passe"
                htmlFor="rp-pw"
                hint="8 caractères au moins. Une phrase courte est plus sûre qu’un mot compliqué."
              >
                <div className="relative">
                  <Input
                    id="rp-pw"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                    autoFocus
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
              {error && (
                <p role="alert" className="text-[14px] text-danger">
                  {error}{' '}
                  {error.includes('nouveau') && (
                    <Link to="/mot-de-passe" reloadDocument className="font-semibold underline">
                      Nouveau lien
                    </Link>
                  )}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" loading={busy}>
                Enregistrer
              </Button>
            </form>
          </>
        ) : sent ? (
          <div className="mt-4 text-center" role="status">
            <MailCheck className="mx-auto size-8 text-success" />
            <h1 className="mt-3 text-[26px] font-bold tracking-[-0.02em] text-fg">
              Regarde tes e-mails
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              Si un compte existe avec <strong className="text-fg">{email.trim()}</strong>, un lien
              vient de partir. Il est valable une heure. Pense à regarder les indésirables.
            </p>
            <p className="mt-4 text-[13px] text-muted">
              Compte créé avec GitHub ? Il n’a pas de mot de passe :{' '}
              <Link to="/connexion" className="font-medium text-accent-text hover:underline">
                connecte-toi avec GitHub
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-center text-[28px] font-bold tracking-[-0.02em] text-fg">
              Mot de passe oublié
            </h1>
            <p className="mt-2 text-center text-[15px] text-muted">
              Entre l’adresse de ton compte : on t’envoie un lien pour en choisir un nouveau.
            </p>
            <form onSubmit={ask} className="mt-7 flex flex-col gap-4" noValidate>
              <Field label="E-mail" htmlFor="rp-email">
                <Input
                  id="rp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="awa@exemple.com"
                  autoFocus
                  required
                />
              </Field>
              {error && (
                <p role="alert" className="text-[14px] text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" loading={busy}>
                Recevoir le lien
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
