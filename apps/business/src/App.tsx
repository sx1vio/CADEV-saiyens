import type { BusinessMeView } from '@devhub/contracts';
import { Briefcase, Building2, Gauge, LogOut, UserCog } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, isSignedOut } from './api';
import { Account } from './pages/Account';
import { Company } from './pages/Company';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { Welcome } from './pages/Welcome';

type Tab = 'tableau' | 'offres' | 'entreprise' | 'compte';
const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: 'tableau', label: 'Tableau de bord', icon: Gauge },
  { id: 'offres', label: 'Offres et candidatures', icon: Briefcase },
  { id: 'entreprise', label: 'Entreprise', icon: Building2 },
  { id: 'compte', label: 'Compte et équipe', icon: UserCog },
];
const tabFromHash = (): Tab => {
  const h = location.hash.slice(1).split('/')[0];
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'tableau';
};

/** Jeton d'un lien « mot de passe oublié » (#reinitialiser=…), retiré aussitôt de l'adresse. */
function readResetToken(): string | null {
  const m = /^#reinitialiser=([\w-]{20,200})$/.exec(location.hash);
  if (m) history.replaceState(null, '', location.pathname);
  return m?.[1] ?? null;
}

export function App() {
  const [resetToken] = useState(readResetToken);
  const [me, setMe] = useState<BusinessMeView | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(tabFromHash);

  const refresh = useCallback(() => {
    api.me().then(setMe, () => setMe(null));
  }, []);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const onError = useCallback((e: unknown) => {
    if (isSignedOut(e)) setMe(null);
  }, []);

  const signOut = () => {
    void api.signOut().finally(() => setMe(null));
  };

  if (me === undefined) return <div className="min-h-dvh" />;
  if (!me) return <Welcome onSignedIn={refresh} resetToken={resetToken} />;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-panel lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-start gap-3 px-5 py-5">
          <div className="min-w-0">
            <p className="text-[16px] font-bold">
              DevHub <span className="text-accent">Business</span>
            </p>
            <p className="mt-0.5 truncate text-[13px] text-muted">{me.company.name}</p>
          </div>
          {/* Sur mobile, le pied de la barre latérale est masqué : déconnexion ici. */}
          <button
            type="button"
            onClick={signOut}
            aria-label="Se déconnecter"
            className="ml-auto rounded-lg p-1.5 text-muted hover:text-ink lg:hidden"
          >
            <LogOut className="size-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium whitespace-nowrap ${
                tab === t.id
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted hover:bg-page hover:text-ink'
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-line px-5 py-4 lg:block">
          <p className="truncate text-[13px] font-semibold">{me.account.name}</p>
          <p className="truncate text-[12px] text-muted">{me.account.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        {tab === 'tableau' && <Dashboard me={me} onError={onError} />}
        {tab === 'offres' && <Jobs me={me} onError={onError} />}
        {tab === 'entreprise' && <Company me={me} onSaved={refresh} onError={onError} />}
        {tab === 'compte' && <Account me={me} onError={onError} />}
      </main>
    </div>
  );
}

/** Bandeau d'état de l'entreprise : en attente, refusée, validée. */
export function StatusBanner({ me }: { me: BusinessMeView }) {
  const c = me.company;
  if (c.status === 'verified') return null;
  const tone = c.status === 'pending' ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad';
  const text =
    c.status === 'pending'
      ? 'Votre entreprise est en cours de vérification par l’équipe DevHub (en général sous 48 h). Vous pouvez déjà préparer vos offres en brouillon.'
      : c.status === 'rejected'
        ? `Votre entreprise n’a pas été validée${c.statusReason ? ` : ${c.statusReason}` : '.'} Corrigez son profil (onglet Entreprise) : elle repassera en vérification.`
        : 'Votre entreprise est suspendue. Contactez l’équipe DevHub.';
  return <p className={`mb-6 rounded-xl px-4 py-3 text-[14px] ${tone}`}>{text}</p>;
}
