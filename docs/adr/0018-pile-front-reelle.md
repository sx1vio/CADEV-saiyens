# ADR-0018 : Pile front réellement retenue (amende l'ADR-0003)

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1 ; Sylvio, propriétaire du front)
- **Date** : 2026-10-09
- **Décideurs** : Sylvio (rôle 3), validé par Caleb
- **Exigences concernées** : §8, §9, O1 à O5 ; amende l'[ADR-0003](0003-frontend-react-vite-pwa.md)

## Contexte

L'ADR-0003 prévoyait TanStack Query, Dexie et React Router en mode « data ». Le front de #97 a fait d'autres choix, documentés dans `docs/front/decisions.md` §6 (branche de #97) :

| Besoin                   | ADR-0003                      | Retenu par le front                                                |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------ |
| IndexedDB                | Dexie                         | `idb`                                                              |
| Données serveur et cache | TanStack Query                | Couche `services/` maison, état global avec Zustand                |
| Composants               | Tailwind seul                 | Tailwind v4 + primitives Radix (base shadcn), Motion, lucide-react |
| Lint                     | ESLint (`@devhub/config`)     | oxlint                                                             |
| PWA                      | Workbox via `vite-plugin-pwa` | Identique                                                          |
| i18n                     | i18next                       | Identique                                                          |

## Décision

Les choix du front sont **acceptés**, car ils sont équivalents en capacité, déjà en place et sous la responsabilité de leur propriétaire. Les **invariants** de l'architecture, eux, restent obligatoires :

1. **Toutes les écritures passent par la file hors ligne**, avec un `Idempotency-Key` par action et le contrat de [04 · Hors ligne](../architecture/04-hors-ligne-sync.md) (`client_id`, `baseVersion`, `POST /sync`).
2. **Les types et schémas échangés avec l'API viennent de `@devhub/contracts`** ; le masquage des secrets avant la mise en file utilise `maskSecrets` de `@devhub/core` (O9). Aucune copie locale de ces règles.
3. **Budget** : accueil sous 300 Ko en conditions de production, contrôlé en CI.
4. **Pas de serveur simulé en production** ([ADR-0016](0016-perimetre-du-mvp.md)).
5. **Lint** : `apps/web` garde oxlint (plus rapide), mais il est branché sur le script `lint` lu par Turborepo, pour que la CI l'exécute.

## Conséquences

- La documentation [03 · Front-end](../architecture/03-frontend.md) décrit l'architecture ; pour les bibliothèques, c'est ce tableau qui fait foi.
- Les invariants 1 et 2 sont des conditions de fusion de #97, ou de ses PR découpées.
