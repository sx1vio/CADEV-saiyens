import { KeyRound, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api, errorMessage } from '../api';

/** Connexion : e-mail, mot de passe et code à 6 chiffres de l'application d'authentification. */
export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.signIn({ email, password, code });
      onSignedIn();
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[380px] rounded-2xl border border-line bg-panel p-7 shadow-sm"
      >
        <ShieldCheck className="size-8 text-brand" />
        <h1 className="mt-3 text-[20px] font-bold">Administration DevHub</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Accès réservé. Chaque connexion est journalisée.
        </p>
        <label className="mt-6 block text-[13px] font-semibold" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mt-1.5"
        />
        <label className="mt-4 block text-[13px] font-semibold" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mt-1.5"
        />
        <label className="mt-4 block text-[13px] font-semibold" htmlFor="code">
          Code de l’application d’authentification
        </label>
        <div className="relative mt-1.5">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="field pl-9 font-mono tracking-[0.3em]"
            placeholder="000000"
          />
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
          {busy ? 'Vérification…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
