# ADR-0003 : PWA React + Vite + Workbox + Dexie

- **Statut** : **Accepté le 2026-10-09, amendé par [ADR-0018](0018-pile-front-reelle.md)** (bibliothèques réellement retenues par le front).
- **Date** : 2026-10-06
- **Décideurs** : rôle 3 (Sylvio)
- **Exigences concernées** : §8, §9 (performance), O1–O5, I1

## Contexte

Le cahier des charges impose une **PWA React (Vite)** avec Workbox et IndexedDB, installable, hors ligne d'abord, en FR et EN, sous 300 Ko à l'accueil et avec un score Lighthouse PWA d'au moins 90. Il reste à choisir les bibliothèques autour.

## Options envisagées et choix

| Besoin                  | Retenu                                            | Écarté                         | Raison                                                                                                      |
| ----------------------- | ------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Données serveur         | **TanStack Query** (persisté)                     | Redux Toolkit Query, SWR       | Revalidation, persistance IndexedDB, mises à jour optimistes ; SWR n'a pas de persistance native            |
| IndexedDB               | **Dexie**                                         | `idb`, localForage             | API typée, requêtes par index, transactions ; `idb` est plus bas niveau ; localForage n'a pas d'index       |
| Service worker          | **Workbox** (`vite-plugin-pwa`, `injectManifest`) | SW écrit à la main             | Précache fiable avec empreintes, stratégies prêtes, Background Sync                                         |
| Routage                 | **React Router** (mode data)                      | TanStack Router                | Plus connu de l'équipe ; chargement paresseux par route                                                     |
| Styles                  | **Tailwind CSS**                                  | MUI, Chakra, CSS Modules seuls | Bibliothèques de composants trop lourdes pour le budget ; Tailwind ne garde que les classes utilisées       |
| i18n                    | **i18next**                                       | FormatJS                       | Chargement par espace de noms, bascule sans rechargement                                                    |
| Next.js / rendu serveur | **Non**                                           | Next.js                        | Le cahier des charges demande Vite ; les aperçus de partage passent par une route serveur dédiée (ADR-0012) |

## Décision

PWA React + Vite + TanStack Query + Dexie + Workbox + React Router + Tailwind + i18next, avec une organisation **par fonctionnalité** ([03 · Front-end](../architecture/03-frontend.md)).

## Conséquences

### Positives

- Pile légère, connue, bien documentée ; chaque brique répond à une exigence du cahier des charges.

### Négatives

- Une seule personne au front pour une interface riche et le moteur hors ligne : **risque de charge** (voir l'organisation de l'équipe, où des back-end prennent des écrans après le Jalon 2).

### Risques et parades

- Risque : dépassement du budget de 300 Ko → Parade : `size-limit` bloquant en CI, revue de chaque nouvelle dépendance.
- Risque : service worker qui garde une vieille version → Parade : `sw.js` en `no-cache`, invite « Nouvelle version disponible ».
