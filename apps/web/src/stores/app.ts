import { create } from 'zustand';
import { api, type User } from '@/services';
import { storageGet, storageSet } from '@/lib/utils';

/* ---------------- Session ---------------- */

interface SessionState {
  user: User | null;
  ready: boolean;
  load: () => Promise<void>;
  setUser: (u: User | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  ready: false,
  load: async () => {
    // Pas de session locale enregistrée : inutile de charger le serveur local avant le premier affichage.
    if (api.mode === 'local' && !storageGet('dh-session')) return set({ user: null, ready: true });
    const user = await api.getSession().catch(() => null);
    set({ user, ready: true });
  },
  setUser: (user) => set({ user }),
}));

/* ---------------- Interface ---------------- */

export type Theme = 'dark' | 'light';

function initialTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' ? 'dark' : 'light';
}

interface UIState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  navCollapsed: boolean;
  toggleNav: () => void;
  drawerOpen: boolean;
  setDrawer: (o: boolean) => void;
  paletteOpen: boolean;
  setPalette: (o: boolean) => void;
  syncOpen: boolean;
  setSync: (o: boolean) => void;
  askOpen: boolean;
  setAsk: (o: boolean, prefill?: AskPrefill) => void;
  askPrefill: AskPrefill | null;
  tourStep: number | null;
  startTour: () => void;
  setTourStep: (n: number | null) => void;
  shortcutsOpen: boolean;
  setShortcuts: (o: boolean) => void;
}

export interface AskPrefill {
  roomId?: string;
  tagIds?: string[];
  title?: string;
}

export const useUI = create<UIState>((set) => ({
  theme: initialTheme(),
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0B0B0C');
    storageSet('dh-theme2', theme);
    set({ theme });
  },
  navCollapsed: storageGet('dh-nav') === 'collapsed',
  toggleNav: () =>
    set((s) => {
      storageSet('dh-nav', s.navCollapsed ? null : 'collapsed');
      return { navCollapsed: !s.navCollapsed };
    }),
  drawerOpen: false,
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
  syncOpen: false,
  setSync: (syncOpen) => set({ syncOpen }),
  askOpen: false,
  askPrefill: null,
  setAsk: (askOpen, prefill) => set({ askOpen, askPrefill: askOpen ? (prefill ?? null) : null }),
  tourStep: null,
  startTour: () => set({ tourStep: 0, drawerOpen: false, paletteOpen: false }),
  setTourStep: (tourStep) => set({ tourStep }),
  shortcutsOpen: false,
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
}));
