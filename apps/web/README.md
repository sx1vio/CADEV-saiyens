# @devhub/web : PWA React

Propriétaire : **Sylvio CHALLA** (rôle 3, front-end et hors ligne).

> **Aider → Construire → Prouver.** La plateforme écosystème des développeurs : actu IA et tech, vidéos, entraide, communautés, emplois, certifications, skills IA, parcours, guide « Créer avec l’IA », templates. Hors ligne d’abord, en FR et EN.
> Décisions : [`docs/front/decisions.md`](../../docs/front/decisions.md) · journal : [`SUIVI.md`](../../SUIVI.md) · architecture cible : [`03-frontend.md`](../../docs/architecture/03-frontend.md) · hors ligne : [`04-hors-ligne-sync.md`](../../docs/architecture/04-hors-ligne-sync.md)

## Lancer

Depuis la racine du dépôt (Node 24, pnpm 10) :

```bash
pnpm install
pnpm --filter @devhub/web dev        # http://localhost:5173
pnpm --filter @devhub/web build      # build de production + service worker (PWA)
pnpm --filter @devhub/web typecheck
pnpm --filter @devhub/web lint
```

En développement, Vite renvoie `/api` vers l’API NestJS (`apps/api`, port 3000). Pour avoir l’actualité réelle et la connexion GitHub, lancer aussi l’API et le worker (voir [`apps/api/README.md`](../api/README.md)), puis une première collecte :

```bash
pnpm --filter @devhub/api news:ingest   # ~70 sources, une trentaine de secondes
```

Sans API, la plateforme reste utilisable : les services de la communauté tournent sur un **serveur local** (IndexedDB) qui applique les règles du cahier des charges, et « Visiter sans compte » ouvre un compte de démonstration.

## Ce que le front utilise de l’API

| Route                                       | Usage                                                         |
| ------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/v1/auth/github?returnTo=…`        | Connexion GitHub (retour sur `/connexion?oauth=ok`)           |
| `GET /api/v1/me`                            | Profil de la session ; les compétences sont importées ensuite |
| `POST /api/v1/auth/logout`                  | Déconnexion (en-tête `X-DevHub-Client: web`)                  |
| `GET /api/v1/healthz`                       | GitHub disponible ou non sur l’écran de connexion             |
| `GET /api/v1/news/home`, `/news`, `/videos` | Accueil, rubriques d’actualité, vidéos YouTube                |
| `GET /api/v1/news/sources`, `/news/status`  | Page « Sources », chiffres de l’accueil public                |
| `GET /api/v1/img?u=…&w=…`                   | Images d’articles redimensionnées en WebP                     |

Les services de la communauté (questions, salles, Passport…) passent par `src/services/` : implémentation `local` (IndexedDB) aujourd’hui, `http` dès que `VITE_API_URL` est défini et que les modules de l’API existent.

## Architecture

```text
src/
  app/          routeur (pages chargées à la demande), fonctionnalités Motion
  components/   ui/ (système de design), shell/ (navigation, palette Ctrl+K, réseau),
                AskDialog, Tour (visite de Djeli), TagPicker, domain (cartes métier)
  pages/        un fichier par écran
  platform/     services de l’écosystème (données de démo marquées), actualités, connexion
  services/     contrat d’API du cahier des charges : local (IndexedDB) et http
  offline/      état réseau, simulateur (?net=offline|2g), file d’attente IndexedDB
  i18n/         fr.ts (référence) et en.ts (typé : une clé manquante casse le build)
  lib/          règles, détection (étiquettes, secrets, qualité), cache de requêtes
  styles/       tokens (thèmes clair et sombre) et utilitaires
```

L’organisation diffère de `03-frontend.md` (`features/`, TanStack Query, Dexie) : voir la décision 14 de [`docs/front/decisions.md`](../../docs/front/decisions.md).

## Règles

- **Pas de couleur en dur :** tout passe par les tokens de `styles/globals.css`.
- **Une action primaire par écran.** Chargement par squelettes, jamais de spinner plein écran.
- **Écritures hors ligne :** passent par `enqueue()` ; écritures en ligne seulement : `requireNetwork()` d’abord.
- **Données de démo :** toujours marquées « Démo » ; aucune affirmation inventée sur des entreprises réelles.
- **Suivi :** chaque changement est noté, daté, dans `SUIVI.md`.

## Raccourcis

`Ctrl/⌘ K` palette · `N` je suis bloqué · `G` puis `H`/`S`/`P`/`D`/`C` navigation · `[` replier la barre · `?` aide
