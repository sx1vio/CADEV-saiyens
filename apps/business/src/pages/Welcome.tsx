import { BadgeCheck, Briefcase, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { ApiError, api, errorMessage, SITE_URL } from '../api';

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
type Mode = 'register' | 'login' | 'forgot' | 'reset';

export function Welcome({
  onSignedIn,
  resetToken = null,
}: {
  onSignedIn: () => void;
  /** Jeton du lien « mot de passe oublié » (#reinitialiser=…), lu par App au chargement. */
  resetToken?: string | null;
}) {
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'register');
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="min-h-dvh bg-page">
      {/* Bandeau sombre aux couleurs de DevHub (Poppins, halos bleu et turquoise du logo) */}
      <div className="relative overflow-hidden bg-[#111214] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_90%_0%,rgba(37,99,235,0.45),transparent_70%),radial-gradient(50%_70%_at_0%_100%,rgba(20,184,166,0.22),transparent_70%)]"
        />
        <header className="relative mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5">
          <a href={SITE_URL} className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[17px] font-bold whitespace-nowrap sm:text-[18px]">
              Dev<span className="text-[#5eead4]">Hub</span>{' '}
              <span className="hidden font-medium text-white/70 min-[400px]:inline">Business</span>
            </span>
          </a>
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold whitespace-nowrap text-white ring-1 ring-white/25 hover:ring-white/60 sm:px-5"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </header>
        <main className="relative mx-auto grid max-w-[1180px] gap-10 px-5 pt-8 pb-16 lg:grid-cols-[1fr_460px] lg:pb-24">
          <section className="lg:pt-6">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/15">
              <Sparkles className="size-4 text-[#5eead4]" /> Gratuit pendant le lancement
            </p>
            <h1 className="mt-5 text-[36px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[54px]">
              Recrutez des devs africains aux compétences{' '}
              <span className="bg-gradient-to-r from-[#7fb0ff] to-[#5eead4] bg-clip-text text-transparent">
                prouvées
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
              Sur DevHub, chaque dev a un Passport : ses compétences sont calculées à partir de son
              code sur GitHub et de l’aide réelle qu’il apporte à la communauté. Publiez vos offres,
              recevez des candidatures avec ce Passport, suivez-les jusqu’à l’embauche.
            </p>
            <ol className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex flex-col gap-2 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[14px] font-bold text-[#111214]">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-snug font-medium text-white/90 sm:text-[14px]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="self-start rounded-[24px] bg-panel p-6 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] sm:p-7">
            {notice && (
              <p
                role="status"
                className="mb-4 rounded-lg bg-good-soft px-3 py-2 text-[13px] text-good"
              >
                {notice}
              </p>
            )}
            {mode === 'register' && <Register onDone={onSignedIn} />}
            {mode === 'login' && <Login onDone={onSignedIn} onForgot={() => setMode('forgot')} />}
            {mode === 'forgot' && <Forgot onBack={() => setMode('login')} />}
            {mode === 'reset' && resetToken && (
              <Reset
                token={resetToken}
                onDone={() => {
                  setNotice('Mot de passe changé. Connectez-vous avec le nouveau.');
                  setMode('login');
                }}
                onExpired={() => setMode('forgot')}
              />
            )}
          </section>
        </main>
      </div>

      <section className="mx-auto max-w-[1180px] px-5 py-16 sm:py-20">
        <p className="text-[14px] font-semibold text-brand">Pourquoi DevHub Business</p>
        <h2 className="mt-2 max-w-[720px] text-[30px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[40px]">
          Moins de CV à trier, plus de preuves à lire.
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text, tone }) => (
            <li
              key={title}
              className="flex gap-4 rounded-[20px] border border-line bg-panel p-5 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(11,18,32,0.35)] sm:flex-col sm:gap-0 sm:p-6"
            >
              <span className={`grid size-12 shrink-0 place-items-center rounded-[14px] ${tone}`}>
                <Icon className="size-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold sm:mt-5">{title}</span>
                <span className="mt-1.5 block text-[14px] leading-relaxed text-muted sm:mt-2">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DevHub · La plateforme d’échange des devs africains</p>
          <a href={SITE_URL} className="font-semibold text-ink hover:underline">
            Aller sur DevHub
          </a>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  'Inscrivez votre entreprise',
  'L’équipe DevHub la vérifie',
  'Publiez vos offres en direct',
  'Suivez chaque candidature',
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Entreprises vérifiées',
    text: 'Chaque entreprise est validée par l’équipe DevHub : les devs savent que l’offre est réelle.',
    tone: 'bg-[#e8efff] text-[#2563eb]',
  },
  {
    icon: BadgeCheck,
    title: 'Compétences prouvées',
    text: 'Score par technologie, Proof XP, dépôts GitHub : plus fiable qu’un CV déclaratif.',
    tone: 'bg-[#dcfaf5] text-[#0d9488]',
  },
  {
    icon: Briefcase,
    title: 'Offres publiées en direct',
    text: 'Une fois validée, votre entreprise publie sans attendre. Vos offres apparaissent sur DevHub Emplois.',
    tone: 'bg-[#fdf3e2] text-[#b45309]',
  },
  {
    icon: Users,
    title: 'Candidatures suivies',
    text: 'Consultée, entretien, retenue : le dev voit l’avancement, vous gardez l’historique.',
    tone: 'bg-[#f1e8ff] text-[#7c3aed]',
  },
];

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
      <p className="text-[12.5px] text-muted">
        Vos données et celles des candidats sont traitées selon la{' '}
        <a
          href={`${SITE_URL}/confidentialite`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent underline"
        >
          politique de confidentialité de DevHub
        </a>
        . Les candidatures ne servent qu’au recrutement pour l’offre concernée.
      </p>
    </form>
  );
}

function Login({ onDone, onForgot }: { onDone: () => void; onForgot: () => void }) {
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
      <button
        type="button"
        onClick={onForgot}
        className="self-center text-[13px] font-medium text-accent hover:underline"
      >
        Mot de passe oublié ?
      </button>
    </form>
  );
}

/** Demande d'un lien de réinitialisation : même réponse que le compte existe ou non. */
function Forgot({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (sent)
    return (
      <div className="flex flex-col gap-3" role="status">
        <h2 className="text-[19px] font-bold">Regardez vos e-mails</h2>
        <p className="text-[14px] text-muted">
          Si un compte existe avec <strong className="text-ink">{email}</strong>, un lien vient de
          partir. Il est valable une heure.
        </p>
        <button type="button" className="btn-ghost" onClick={onBack}>
          Retour à la connexion
        </button>
      </div>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.forgotPassword(email.trim());
          setSent(true);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col gap-3.5"
    >
      <h2 className="text-[19px] font-bold">Mot de passe oublié</h2>
      <p className="text-[14px] text-muted">
        Indiquez l’adresse de votre compte : nous vous envoyons un lien pour en choisir un nouveau.
      </p>
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
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Envoi…' : 'Recevoir le lien'}
      </button>
      <button type="button" onClick={onBack} className="self-center text-[13px] text-muted">
        Retour à la connexion
      </button>
    </form>
  );
}

/** Nouveau mot de passe depuis le lien reçu ; toutes les sessions du compte sont fermées. */
function Reset({
  token,
  onDone,
  onExpired,
}: {
  token: string;
  onDone: () => void;
  onExpired: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (password.length < 10) return setError('10 caractères au moins.');
        setBusy(true);
        try {
          await api.resetPassword(token, password);
          onDone();
        } catch (err) {
          setExpired(err instanceof ApiError && err.code === 'auth.reset_invalid');
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
      className="flex flex-col gap-3.5"
    >
      <h2 className="text-[19px] font-bold">Nouveau mot de passe</h2>
      <Row label="Nouveau mot de passe (10 caractères au moins)">
        <input
          className="field"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Row>
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}
      {expired ? (
        <button type="button" className="btn-primary" onClick={onExpired}>
          Demander un nouveau lien
        </button>
      ) : (
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      )}
    </form>
  );
}

/** Symbole DevHub (même tracé que apps/web/src/components/brand.tsx). */
function BrandMark() {
  return (
    <svg viewBox="0 0 100 80" width={38} height={30} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="dh-mark" x1="0" y1="0.75" x2="1" y2="0.25">
          <stop offset="0" stopColor="#0a6cff" />
          <stop offset="0.5" stopColor="#10b0f0" />
          <stop offset="1" stopColor="#20e2b4" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#dh-mark)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 21 12 40l17 14" strokeWidth="9" />
        <path d="M65 26l23 14-21 16" strokeWidth="9" />
        <path d="M19 65c10 7 21 4 25-8l10-34c4-11 15-14 25-7" strokeWidth="8" />
      </g>
    </svg>
  );
}
