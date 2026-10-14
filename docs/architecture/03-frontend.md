# 03 · Front-end

> **Bibliothèques réellement retenues** : voir l'[ADR-0018](../adr/0018-pile-front-reelle.md) (`idb`, Zustand, Radix, oxlint), qui amende le tableau « Pile technique » ci-dessous. Les invariants (file hors ligne, `@devhub/contracts`, budget, pas de serveur simulé en production) restent ceux de ce document.

**PWA React** construite avec **Vite**, installable, utilisable hors ligne, en français et en anglais, légère sur un téléphone d'entrée de gamme. Voir [ADR-0003](../adr/0003-frontend-react-vite-pwa.md).

## Pile technique

| Besoin          | Choix                                                      | Pourquoi                                                                                        |
| --------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Framework       | React 19 + TypeScript                                      | Imposé par le cahier des charges (§8), connu de l'équipe                                        |
| Build           | Vite                                                       | Rapide, découpage du code natif, plugin PWA                                                     |
| Routage         | React Router (mode « data »)                               | Chargement paresseux par route, gestion des erreurs par route                                   |
| Données serveur | TanStack Query                                             | Cache, revalidation (« stale while revalidate »), états de chargement ; persisté dans IndexedDB |
| Stockage local  | Dexie (IndexedDB)                                          | File d'actions, cache de contenus, brouillons ; API simple et typée                             |
| Service worker  | Workbox via `vite-plugin-pwa` (mode `injectManifest`)      | Précache du shell, stratégies de cache, Background Sync                                         |
| i18n            | i18next + react-i18next                                    | Bascule sans rechargement (I1), fichiers de traduction chargés à la demande                     |
| Formulaires     | React Hook Form + résolveur zod                            | Réutilise les schémas de `@devhub/contracts`                                                    |
| Styles          | Tailwind CSS + variables CSS                               | CSS généré minimal, thème sombre (T4) par variables                                             |
| Rendu Markdown  | `marked` + `DOMPurify`                                     | Rendu assaini (§9) ; coloration du code chargée à la demande                                    |
| Tests           | Vitest + Testing Library ; Playwright pour le bout en bout | Même outil de test unitaire que le back                                                         |

Les bibliothèques de composants lourdes (MUI, Ant Design…) sont **exclues** : elles cassent le budget de 300 Ko.

## Organisation du code : par fonctionnalité

```text
src/
├── app/
│   ├── router.tsx            # déclaration des routes, chacune en import paresseux
│   ├── providers.tsx         # QueryClient, i18n, session, état réseau
│   ├── layouts/              # PublicLayout, AppLayout (barre réseau toujours visible)
│   └── guards.tsx            # RequireAuth, RequireAdmin
├── features/
│   └── sos/
│       ├── api.ts            # hooks TanStack Query + actions de la file (useAskQuestion…)
│       ├── pages/            # AskPage, QuestionPage, SosListPage
│       ├── components/       # QuestionForm, QualityGauge, AiHintCard, AnswerList…
│       ├── model.ts          # types et fonctions propres à l'écran
│       └── index.ts          # exports publics (routes, composants réutilisables)
├── offline/                  # moteur hors ligne, voir 04
├── shared/
│   ├── api/                  # client HTTP typé, intercepteur réseau (simulateur O5)
│   ├── ui/                   # Button, Card, TagChip, Avatar, ScoreBar, NetworkBadge…
│   ├── i18n/
│   └── lib/
└── locales/{fr,en}/{common,sos,rooms,passport,...}.json
```

### Règles d'import

| De → vers                                           | Autorisé ?                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `features/x` → `shared/*`, `offline/*`, `@devhub/*` | Oui                                                                     |
| `features/x` → `features/y/index.ts`                | Oui, seulement l'index public                                           |
| `features/x` → `features/y/components/...`          | **Non** : passer par l'index, ou remonter le composant dans `shared/ui` |
| `shared/*` → `features/*`                           | **Non**                                                                 |
| `offline/*` → `features/*`                          | **Non** : le moteur hors ligne ne connaît que des actions génériques    |

Ces règles sont vérifiées par ESLint. Elles permettent à plusieurs personnes de travailler sur des fonctionnalités différentes sans se gêner.

## Routes

Elles reprennent le §4 du cahier des charges, plus les ajouts v3.1 retenus.

| Route                | Écran                                                                                                                                                                                                        | Accès              | Chargement                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------- |
| `/`                  | Accueil public « en direct » (T1) si non connecté, accueil personnel sinon (« Je suis bloqué », questions de mes stacks, salles recommandées, « Personne n'a encore répondu » S16, « Devs à rencontrer » D6) | Public             | Inclus dans le bundle initial      |
| `/sos`               | Liste et recherche de questions, base de connaissance                                                                                                                                                        | Public en lecture  | Paresseux                          |
| `/sos/nouvelle`      | Formulaire guidé (S1, S8, S9, S7)                                                                                                                                                                            | Connecté           | Paresseux                          |
| `/sos/:id`           | Question, piste IA, aidants suggérés, réponses, votes, validation, pair programming                                                                                                                          | Public en lecture  | Paresseux                          |
| `/projets`           | Liste des salles, création                                                                                                                                                                                   | Public en lecture  | Paresseux                          |
| `/p/:code`           | Fiche de salle : tâches (liste ou Kanban R11), membres, discussion, demandes                                                                                                                                 | Public en lecture  | Paresseux                          |
| `/decouvrir`         | Recherche de devs et de salles (D1)                                                                                                                                                                          | Public             | Paresseux                          |
| `/classement`        | Classement par pays, carte d'Afrique (D2, D4)                                                                                                                                                                | Public             | Paresseux                          |
| `/u/:handle`         | Developer Passport (PR2, PR3, PR7, PR8)                                                                                                                                                                      | Public sans compte | Paresseux, mis en cache hors ligne |
| `/u/:handle/preuves` | Chronologie complète des preuves                                                                                                                                                                             | Public             | Paresseux                          |
| `/moi/reglages`      | Profil, disponibilités, langues, confidentialité (PR14), notifications                                                                                                                                       | Connecté           | Paresseux                          |
| `/systalink`         | État des services, dernière sauvegarde (Y1, Y5)                                                                                                                                                              | Public             | Paresseux                          |
| `/impact`            | Chiffres réels (Y2, Y9)                                                                                                                                                                                      | Public             | Paresseux                          |
| `/regles`            | Comment marchent les Proof XP (X5)                                                                                                                                                                           | Public             | Paresseux                          |
| `/synchronisation`   | Centre de synchronisation (O8)                                                                                                                                                                               | Connecté           | Paresseux                          |
| `/admin`             | Signalements, retrait, comptes de démo                                                                                                                                                                       | Administrateur     | Paresseux, exclu du précache       |

## Gestion de l'état

Il n'y a pas de store global (Redux, Zustand). L'état se répartit ainsi :

| Type d'état                                                         | Où il vit                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Données serveur (questions, salles, Passport)                       | Cache TanStack Query, persisté dans IndexedDB                         |
| Actions en attente d'envoi                                          | File Dexie (`outbox`), exposée par `useOutbox()`                      |
| État réseau (en ligne, hors ligne, simulé, synchronisation, erreur) | Contexte `NetworkProvider`, alimenté par le moteur de synchronisation |
| Session (utilisateur courant)                                       | Requête `GET /me` dans TanStack Query                                 |
| Brouillons de formulaires                                           | Dexie (`drafts`), sauvegardés à chaque frappe (avec temporisation)    |
| État d'interface local                                              | `useState` dans le composant                                          |

### Lecture et écriture : le même chemin en ligne et hors ligne

- **Lecture** : `useQuery` lit d'abord le cache persisté (affichage immédiat, même hors ligne), puis revalide si le réseau est disponible.
- **Écriture** : un composant n'appelle **jamais** `fetch` directement. Il appelle une action (`enqueue('question.create', payload)`) qui passe toujours par la file, qu'on soit en ligne ou non. En ligne, la file se vide en quelques millisecondes. Hors ligne, elle attend. **Il n'y a qu'un seul chemin de code**, testé en permanence. Voir [04](04-hors-ligne-sync.md).
- **Mise à jour optimiste** : l'action insère immédiatement l'élément dans le cache TanStack Query avec un statut `pending` (badge « en attente »), puis le remplace par la réponse du serveur.

## Temps réel

Le hook `useRealtime()` ouvre une connexion `EventSource` vers `/api/v1/events` quand l'utilisateur est connecté et en ligne. Chaque événement invalide ou met à jour une clé de cache précise (`['question', id]`, `['notifications']`…). Si le SSE échoue trois fois, le hook passe en interrogation toutes les 30 secondes. Voir [07](07-taches-fond-temps-reel.md).

## Internationalisation (I1)

- Tous les textes sont dans `locales/{fr,en}/*.json`. **Aucune chaîne en dur dans les composants** (règle ESLint `i18next/no-literal-string` sur `features/`).
- Les fichiers sont découpés par espace de noms et chargés avec la route.
- Langue initiale : préférence enregistrée, sinon `navigator.language`, sinon le français.
- Bascule sans rechargement depuis l'en-tête ; elle est enregistrée dans le profil quand on est connecté.
- Dates et nombres passent par `Intl` (fuseau de l'utilisateur pour les créneaux de pair programming).
- Contenu utilisateur : jamais traduit automatiquement. Le bouton « Traduire » (S10) affiche la traduction à côté de l'original.

## Accessibilité (§9)

- Contrastes AA vérifiés dans les deux thèmes ; cibles tactiles d'au moins 44 px.
- Navigation complète au clavier, focus visible, `aria-live="polite"` sur l'indicateur réseau et les notifications.
- Composants interactifs construits sur des éléments natifs (`button`, `dialog`, `details`) avant tout ARIA personnalisé.
- Contrôle `axe` automatique dans les tests Playwright des pages principales.

## Performance : budgets vérifiés en CI

| Métrique                                       | Budget        | Comment on le tient                                                          |
| ---------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| Accueil, transfert total (gzip)                | < 300 Ko      | Routes paresseuses, polices système, icônes SVG en ligne, pas d'image lourde |
| JS initial                                     | < 150 Ko gzip | React + routeur + shell ; tout le reste par route                            |
| Largest Contentful Paint (Moto G4, 3G simulée) | < 2,5 s       | Shell précaché, squelettes, aucune requête bloquante au démarrage            |
| Lighthouse PWA / performance                   | ≥ 90          | Mesuré par `lhci` en CI sur l'URL de prévisualisation                        |

Un dépassement de budget fait échouer la CI. On ajoute une dépendance seulement après avoir vérifié son poids (`pnpm why`, bundlephobia).

### Mode économie de données (O6, P1)

Activé automatiquement si `navigator.connection.saveData` ou une connexion 2G est détectée : initiales à la place des avatars, pas de préchargement, revalidation espacée. Le réglage est manuel sinon.

## Aperçus de partage (Open Graph)

Une SPA ne peut pas fournir de balises `og:*` propres à chaque page aux robots de WhatsApp ou LinkedIn. Solution retenue ([ADR-0012](../adr/0012-apercus-partage-route-serveur.md)) :

- Caddy envoie les requêtes `/u/*` et `/p/*` à l'API.
- L'API lit le `index.html` construit, y injecte `<title>`, `og:title`, `og:description`, `og:image` (et `twitter:*`) propres au Passport ou à la salle, puis renvoie la page. Le navigateur charge ensuite l'application normalement.
- `og:image` pointe vers `/og/u/:handle.png` et `/og/p/:code.png`, images 1200 × 630 générées par l'API avec `satori` + `@resvg/resvg-js` (Proof Card, PR5), mises en cache une heure.

Le comportement est identique pour un humain et un robot : pas de détection d'agent utilisateur.

## Conventions de code front-end

- Composants en fonctions, nommés en PascalCase, un composant exporté par fichier.
- Hooks de données dans `features/x/api.ts`, préfixés `use`. Clés de cache centralisées dans `features/x/keys.ts`.
- Pas de `useEffect` pour charger des données : on utilise TanStack Query.
- Les textes générés par l'IA sont toujours rendus dans le composant `AiContent`, qui affiche la mention « généré par IA, à vérifier » (S2).
- Les comptes de démonstration sont affichés avec le composant `DemoBadge` partout où apparaît un utilisateur (règle §6.6).

## Accès aux données : serveur simulé et API réelle (état au 16 octobre)

Toutes les pages passent par `api` (`apps/web/src/services/index.ts`), qui choisit une implémentation du contrat `DevHubApi` ([ADR-0016](../adr/0016-perimetre-du-mvp.md) §4) :

| Contexte                        | Implémentation                                  | Choix                                                           |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Build de production             | `http` : vraie API, même origine (`/api/v1`)    | Imposé ; `VITE_API_MODE=local` fait échouer le build            |
| Développement (`pnpm dev`)      | `local` : serveur simulé dans le navigateur     | Par défaut ; bandeau « Données de démonstration » permanent     |
| Développement avec l'API locale | `http`, via le proxy Vite vers `localhost:3000` | `VITE_API_MODE=http` (ou `VITE_API_URL` pour une autre origine) |

Le serveur simulé n'est jamais inclus dans le build de production (aucun import statique de `services/local`).

L'implémentation `http` (`services/http.ts`) est un **adaptateur** : elle appelle les endpoints de [06-api.md](06-api.md) et convertit les réponses (`@devhub/contracts`) vers les types du front dans `services/http-mappers.ts` (fonctions pures, testées avec Vitest). Conventions :

- un utilisateur est identifié par son **handle** (l'API n'expose pas l'UUID des autres comptes), une étiquette par son **slug** ;
- chaque écriture porte `X-DevHub-Client: web` et une `Idempotency-Key` (le `clientId` quand il existe : une action rejouée par la file hors ligne ne crée pas de doublon) ;
- une fonction absente de l'API (pair programming, traduction, demande de retour, suppression de compte, connexion démo) lève `feature.unavailable`.

Limites connues : le temps réel (`GET /events`) n'est pas encore branché (les pages se rafraîchissent à la navigation) ; la file hors ligne rejoue les actions une par une plutôt que par `POST /sync` ; signaler un **compte** n'est pas possible depuis le front (l'API attend son UUID) ; le contrôle automatique du budget de 300 Ko en CI reste à ajouter (mesure locale : 262 Ko de JS et CSS compressés pour l'accueil, polices et images non comprises).
