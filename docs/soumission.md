# Dossier de soumission CADEV 2026

> Préparé le 23/10/2026. Équipe **Saiyens** (groupe Bénin), projet **DevHub Africa**.
> Date limite officielle : **samedi 25/10/2026, 17:00 GMT** (inscription et soumission).

Le règlement officiel demande, au moment de la soumission : le dépôt git, une démo **déployée et en ligne** utilisant au moins un produit acheté sur Datacloud (platform.systalink.com), et trois déclarations : les composants et leurs licences, l'usage de l'IA, et la déclaration de propriété de chaque membre. Ce document rassemble ces trois déclarations et la liste de ce qui reste à faire par l'équipe.

## 1. Liste de contrôle avant l'envoi

| #   | Étape                                                                                                            | Qui               | État                                        |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------- |
| 1   | Acheter au moins un produit sur Datacloud avec le code promo −40 % (VPS **à Dakar**, pas hors de Dakar)          | Emmanuel, Sylvio  | À faire                                     |
| 2   | Déployer : secrets du dépôt, `DEPLOY_ENABLED=true`, pousser sur `main` (voir `infra/README.md`)                  | Emmanuel          | À faire                                     |
| 3   | Créer l'application OAuth GitHub de production et renseigner `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`         | Joachim, Emmanuel | À faire                                     |
| 4   | Vérifier que `AUTH_FAKE_PROVIDER` vaut `false` en production                                                     | Emmanuel          | À faire                                     |
| 5   | Optionnel : `LLM_API_KEY` plafonnée (sinon la piste IA, les tâches IA et la traduction utilisent le faux modèle) | Joachim           | À faire                                     |
| 6   | Ouvrir l'URL publique depuis un téléphone, hors du réseau de l'équipe                                            | Tous              | À faire                                     |
| 7   | Remplir et signer la section 4 (propriété), un membre après l'autre                                              | Chaque membre     | À faire                                     |
| 8   | Soumettre : URL du dépôt, URL de la démo, ce document                                                            | Caleb             | À faire                                     |
| 9   | **Vote des pairs du 25/10 18:00 au 26/10 23:59 : chaque membre doit voter, sinon l'équipe est exclue**           | Chaque membre     | À faire                                     |
| 10  | Aucun composant GPL, AGPL ou LGPL                                                                                | —                 | Fait le 23/10 (`sharp` remplacé, section 2) |

## 2. Composants et licences

Inventaire tiré de `pnpm licenses list` le 23/10/2026, sur `main`.

**Aucun composant sous GPL, AGPL ou LGPL.** Jusqu'au 23/10, l'API dépendait de `sharp`, dont la bibliothèque native libvips est sous LGPL-3.0. Elle est remplacée par `@napi-rs/canvas` (MIT, moteur Skia sous BSD-3-Clause) pour le proxy d'images des actualités et la Proof Card.

### Dépendances de production (525 paquets, directes et indirectes)

| Licence                                                                                        | Paquets  |
| ---------------------------------------------------------------------------------------------- | -------- |
| MIT                                                                                            | 426      |
| Apache-2.0                                                                                     | 37       |
| ISC                                                                                            | 33       |
| BSD-2-Clause                                                                                   | 8        |
| BSD-3-Clause                                                                                   | 6        |
| OFL-1.1 (polices Inter, JetBrains Mono, Plus Jakarta Sans)                                     | 3        |
| Unlicense                                                                                      | 3        |
| BlueOak-1.0.0                                                                                  | 2        |
| 0BSD, CC0-1.0, MIT-0, MIT OR CC0-1.0, MIT and ISC                                              | 1 chacun |
| Python-2.0 (`argparse`)                                                                        | 1        |
| EPL-2.0 (`elkjs`, tiré par le CLI Prisma pour Prisma Studio, jamais exécuté par l'application) | 1        |

### Outils de développement et de build seulement (non livrés)

Mêmes familles de licences, plus `lightningcss` (MPL-2.0, utilisé par Tailwind et Vite au moment du build) et des jeux de données CC-BY-4.0 (`caniuse-lite`). MPL-2.0 et EPL-2.0 ne figurent pas parmi les licences interdites.

### Dépendances directes

| Partie          | Composant                                                                                                                          | Licence         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| API             | NestJS (`@nestjs/*`), `rxjs`, `reflect-metadata`                                                                                   | MIT, Apache-2.0 |
| API             | Prisma (`prisma`, `@prisma/client`, `@prisma/adapter-pg`), `pg`, `pg-boss`                                                         | Apache-2.0, MIT |
| API             | `@anthropic-ai/sdk` (piste IA, tâches IA, traduction)                                                                              | MIT             |
| API             | `@napi-rs/canvas` (images)                                                                                                         | MIT             |
| API             | `pino`, `pino-http`, `nestjs-pino`, `nestjs-zod`, `zod`, `rss-parser`                                                              | MIT             |
| API             | `nodemailer`                                                                                                                       | MIT-0           |
| API             | `dotenv`                                                                                                                           | BSD-2-Clause    |
| Front           | React, React Router, Radix UI, `cmdk`, `motion`, `sonner`, `zustand`                                                               | MIT             |
| Front           | i18next, `react-i18next`, `react-hook-form`, `react-markdown`, `rehype-sanitize`, `prism-react-renderer`, `tailwind-merge`, `clsx` | MIT             |
| Front           | `idb`, `lucide-react`                                                                                                              | ISC             |
| Front           | `class-variance-authority`                                                                                                         | Apache-2.0      |
| Front           | `simple-icons`                                                                                                                     | CC0-1.0         |
| Front           | Polices `@fontsource-variable/*`                                                                                                   | OFL-1.1         |
| Contrat partagé | `zod`                                                                                                                              | MIT             |
| Outils          | TypeScript, Vite, Tailwind CSS, Vitest, Playwright, oxlint, ESLint, Prettier, Turborepo, husky, commitlint                         | Apache-2.0, MIT |

### Données, images et services

| Élément                                      | Origine                                                      | Licence ou conditions               |
| -------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| Frontières de la carte de l'Afrique (D4)     | Natural Earth 5.1.2 (`scripts/generate-africa-map.mjs`)      | Domaine public                      |
| Mascotte Djeli, avatars et bannières de démo | Générés par l'équipe avec Higgsfield                         | Images générées pour le projet      |
| Image Docker de l'API                        | `node:24-alpine`, paquets Alpine `fontconfig`, `font-dejavu` | MIT, licence Bitstream Vera (libre) |
| Image Docker du front                        | `caddy:2-alpine`                                             | Apache-2.0                          |
| Base de données                              | PostgreSQL 16                                                | Licence PostgreSQL (permissive)     |

## 3. Usage de l'IA

| Outil                                                           | Usage                                                                                                                                                                                                                                                                                                      | Parties concernées                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Claude Code (Anthropic)                                         | Assistant de développement utilisé par plusieurs membres : écriture et relecture de code, tests, documentation, analyse des anomalies. Les commits concernés portent la ligne `Co-Authored-By: Claude`.                                                                                                    | Tout le dépôt : `apps/api`, `apps/web`, `packages/*`, `infra/`, `docs/` |
| Higgsfield (génération d'images)                                | Mascotte Djeli, avatars des comptes de démonstration, bannières de salles                                                                                                                                                                                                                                  | `apps/web/public/`                                                      |
| API Claude (modèle `LLM_MODEL`, par défaut `claude-sonnet-5-5`) | Fonction du produit, appelée côté serveur seulement : piste IA sur une question (S2), tâches proposées depuis la discussion d'une salle (R5), traduction FR ↔ EN (S10). Chaque contenu généré est marqué « généré par IA », les secrets sont masqués avant l'envoi et un quota par utilisateur s'applique. | `apps/api/src/modules/ai`                                               |

Chaque membre doit pouvoir expliquer le code de son module, y compris la partie écrite avec l'IA (critère « qualité technique », 30 %). Les choix structurants sont expliqués dans les ADR (`docs/adr/`) et dans `context.md`.

## 4. Déclaration de propriété des membres

Chaque membre remplit sa ligne, avec la date.

> Je déclare avoir contribué à DevHub Africa dans le cadre de CADEV 2026, détenir les droits sur ma contribution ou l'avoir produite à partir de composants dont la licence le permet, et accepter le règlement du concours.

| Membre            | Rôle                                   | Contributions principales                         | Date et accord |
| ----------------- | -------------------------------------- | ------------------------------------------------- | -------------- |
| Caleb KPOSSOU     | Back-end, produit et pitch (rôle 1)    | `identity`, `passport`, `reputation`, `discovery` |                |
| AMAMION Florent   | Back-end temps réel et synchronisation | `sos`, `matching`, `notifications`, `sync`        |                |
| Joachim GOEH-AKUE | Back-end, IA et intégrations (rôle 5)  | `ai`, `github`, `rooms`                           |                |
| Sylvio CHALLA     | Front-end et hors ligne (rôle 3)       | `apps/web`, design, moteur hors ligne, Systalink  |                |
| Emmanuel OKORIE   | DevOps et sécurité (rôle 4)            | `moderation`, `platform`, `infra/`                |                |

## 5. Points à trancher par l'équipe

- **Licence du projet** : le dépôt n'a pas de fichier `LICENSE`. Le règlement ne l'exige pas, mais la question peut être posée au jury. À décider avant la soumission, si l'équipe veut en mettre une.
- **Contributeur `Sacem270`** : auteur des PR #151 à #154, non rattaché à un membre connu (`context.md`, section 6). À identifier pour la déclaration de propriété.
