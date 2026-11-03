import { BadgeCheck, Briefcase, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { ApiError, api, errorMessage } from '../api';

const SECTORS = [
  'Fintech',
  'E-commerce',
  'Logistique',
  'Santé',
  'Éducation',
  'Agritech',
  'Télécoms',
  'Médias',
  'Services numériques (ESN)',
  'Administration',
  'ONG',
  'Autre',
];
const SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;
const COUNTRIES: [string, string][] = [
  ['BJ', 'Bénin'],
  ['BF', 'Burkina Faso'],
  ['CM', 'Cameroun'],
  ['CI', 'Côte d’Ivoire'],
  ['CD', 'RD Congo'],
  ['GA', 'Gabon'],
  ['GH', 'Ghana'],
  ['GN', 'Guinée'],
  ['KE', 'Kenya'],
  ['MA', 'Maroc'],
  ['MG', 'Madagascar'],
  ['ML', 'Mali'],
  ['NE', 'Niger'],
  ['NG', 'Nigeria'],
  ['RW', 'Rwanda'],
  ['SN', 'Sénégal'],
  ['TG', 'Togo'],
  ['TN', 'Tunisie'],
  ['ZA', 'Afrique du Sud'],
  ['FR', 'France'],
  ['BE', 'Belgique'],
  ['CA', 'Canada'],
];

/** Page d'accueil du portail : promesse, inscription de l'entreprise, connexion. */
export function Welcome({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  return (
    <div className="min-h-dvh bg-page">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5">
        <p className="text-[17px] font-bold">
          DevHub <span className="text-accent">Business</span>
        </p>
        <button
          type="button"
          className="btn-ghost h-9"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
        </button>
      </header>
      <main className="mx-auto grid max-w-[1180px] gap-10 px-5 pt-6 pb-16 lg:grid-cols-[1fr_460px]">
        <section>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand">
            <Sparkles className="size-4" /> Gratuit pendant le lancement
          </p>
          <h1 className="mt-4 text-[34px] leading-[1.1] font-bold tracking-tight sm:text-[44px]">
            Recrutez des devs africains aux compétences prouvées.
          </h1>
          <p className="mt-4 max-w-xl text-[16px] text-muted">
            Sur DevHub, chaque dev a un Passport : ses compétences sont calculées à partir de son
            code sur GitHub et de l’aide réelle qu’il apporte à la communauté. Publiez vos offres,
            recevez des candidatures avec ce Passport, suivez-les jusqu’à l’embauche.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              [
                ShieldCheck,
                'Entreprises vérifiées',
                'Chaque entreprise est validée par l’équipe DevHub : les devs savent que l’offre est réelle.',
              ],
              [
                BadgeCheck,
                'Compétences prouvées',
                'Score par technologie, Proof XP, dépôts GitHub : plus fiable qu’un CV déclaratif.',
              ],
              [
                Briefcase,
                'Offres publiées en direct',
                'Une fois validée, votre entreprise publie sans attendre. Vos offres apparaissent sur DevHub Emplois.',
              ],
              [
                Users,
                'Candidatures suivies',
                'Consultée, entretien, retenue : le dev voit l’avancement, vous gardez l’historique.',
              ],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={title as string} className="rounded-xl border border-line bg-panel p-4">
                  <I className="size-5 text-accent" />
                  <p className="mt-2 font-semibold">{title as string}</p>
                  <p className="mt-1 text-[13.5px] text-muted">{text as string}</p>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="self-start rounded-2xl border border-line bg-panel p-6 shadow-sm">
          {mode === 'register' ? <Register onDone={onSignedIn} /> : <Login onDone={onSignedIn} />}
        </section>
      </main>
    </div>
  );
}

function Row({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold">{label}</span>
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-[12.5px] text-bad">{error}</span>}
    </label>
  );
}

function Register({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    name: '',
    website: '',
    country: 'BJ',
    city: '',
    sector: 'Fintech',
    size: '11-50' as (typeof SIZES)[number],
    about: '',
    person: '',
    email: '',
    password: '',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api.register({
        company: {
          name: f.name,
          website: f.website.trim() || null,
          country: f.country || null,
          city: f.city.trim() || null,
          sector: f.sector,
          size: f.size,
          about: f.about,
        },
        account: { name: f.person, email: f.email, password: f.password },
      });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) setFields(err.fields);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <h2 className="text-[19px] font-bold">Inscrire votre entreprise</h2>
      <Row label="Nom de l’entreprise" error={fields['company.name']}>
        <input
          className="field"
          required
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Row>
      <Row label="Site web (https://)" error={fields['company.website']}>
        <input
          className="field"
          type="url"
          value={f.website}
          onChange={(e) => set('website', e.target.value)}
          placeholder="https://"
        />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Pays">
          <select
            className="field"
            value={f.country}
            onChange={(e) => set('country', e.target.value)}
          >
            {COUNTRIES.map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Ville">
          <input className="field" value={f.city} onChange={(e) => set('city', e.target.value)} />
        </Row>
        <Row label="Secteur">
          <select
            className="field"
            value={f.sector}
            onChange={(e) => set('sector', e.target.value)}
          >
            {SECTORS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Row>
        <Row label="Taille">
          <select className="field" value={f.size} onChange={(e) => set('size', e.target.value)}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} personnes
              </option>
            ))}
          </select>
        </Row>
      </div>
      <Row label="Présentation (facultatif)">
        <textarea
          className="field"
          rows={3}
          value={f.about}
          onChange={(e) => set('about', e.target.value)}
          placeholder="Ce que fait l’entreprise, son équipe tech…"
        />
      </Row>
      <hr className="border-line" />
      <Row label="Votre nom" error={fields['account.name']}>
        <input
          className="field"
          required
          value={f.person}
          onChange={(e) => set('person', e.target.value)}
        />
      </Row>
      <Row label="E-mail professionnel" error={fields['account.email']}>
        <input
          className="field"
          type="email"
          required
          autoComplete="username"
          value={f.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </Row>
      <Row label="Mot de passe (10 caractères au moins)" error={fields['account.password']}>
        <input
          className="field"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={f.password}
          onChange={(e) => set('password', e.target.value)}
        />
      </Row>
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Création…' : 'Créer le compte entreprise'}
      </button>
      <p className="text-[12.5px] text-muted">
        L’équipe DevHub vérifie votre entreprise (en général sous 48 h). Vous pouvez préparer vos
        offres en attendant.
      </p>
    </form>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.signIn({ email, password });
          onDone();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col gap-3.5"
    >
      <h2 className="text-[19px] font-bold">Se connecter</h2>
      <Row label="E-mail">
        <input
          className="field"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Row>
      <Row label="Mot de passe">
        <input
          className="field"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Row>
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
