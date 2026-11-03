import type { AdminSessionView } from '@devhub/contracts';
import { Briefcase, Building2, Gauge, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, isSignedOut } from './api';
import { Companies } from './pages/Companies';
import { Jobs } from './pages/Jobs';
import { Login } from './pages/Login';
import { Moderation } from './pages/Moderation';
import { Overview } from './pages/Overview';

type Tab = 'overview' | 'companies' | 'jobs' | 'moderation';
const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: 'overview', label: 'Vue d’ensemble', icon: Gauge },
  { id: 'companies', label: 'Entreprises', icon: Building2 },
  { id: 'jobs', label: 'Offres d’emploi', icon: Briefcase },
  { id: 'moderation', label: 'Modération', icon: ShieldAlert },
];

const tabFromHash = (): Tab => {
  const h = location.hash.slice(1);
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'overview';
};

export function App() {
  const [session, setSession] = useState<AdminSessionView | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(tabFromHash);

  const refresh = useCallback(() => {
    api.session().then(setSession, () => setSession(null));
  }, []);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Session expirée pendant l'utilisation : retour à la connexion.
  const onError = useCallback((e: unknown) => {
    if (isSignedOut(e)) setSession(null);
  }, []);

  if (session === undefined) return <div className="min-h-dvh" />;
  if (!session) return <Login onSignedIn={refresh} />;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-ink text-white lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <ShieldCheck className="size-6 text-blue-300" />
          <div>
            <p className="text-[15px] font-bold">DevHub</p>
            <p className="text-[12px] text-white/60">Administration</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white/12 text-white'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-5 py-4 lg:block">
          <p className="truncate text-[13px] font-semibold">{session.displayName}</p>
          <p className="truncate text-[12px] text-white/60">@{session.handle}</p>
          <button
            type="button"
            onClick={() => api.signOut().finally(() => setSession(null))}
            className="mt-3 inline-flex items-center gap-2 text-[13px] text-white/70 hover:text-white"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        {tab === 'overview' && <Overview onError={onError} />}
        {tab === 'companies' && <Companies onError={onError} />}
        {tab === 'jobs' && <Jobs onError={onError} />}
        {tab === 'moderation' && <Moderation onError={onError} />}
      </main>
    </div>
  );
}
