# @devhub/web : PWA React

Propriétaire : **Sylvio CHALLA** (rôle 3, front-end et hors ligne).

PWA React + Vite, installable, hors ligne d'abord, en FR et EN. Architecture : [docs/architecture/03-frontend.md](../../docs/architecture/03-frontend.md). Moteur hors ligne : [04-hors-ligne-sync.md](../../docs/architecture/04-hors-ligne-sync.md).

## À initialiser (6 octobre)

```bash
pnpm create vite apps/web --template react-ts
pnpm --filter @devhub/web add react-router @tanstack/react-query dexie i18next react-i18next zod react-hook-form @hookform/resolvers
pnpm --filter @devhub/web add -D vite-plugin-pwa workbox-window tailwindcss vitest @testing-library/react fake-indexeddb @playwright/test size-limit
```

Puis : nommer le paquet `@devhub/web`, ajouter `@devhub/contracts` et `@devhub/core` (`workspace:*`), et créer la structure `src/{app,features,offline,shared,locales}` décrite dans la documentation.

## Scripts attendus

`dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e` (utilisés par Turborepo et la CI).
