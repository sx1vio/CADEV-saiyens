# Dossier de soumission CADEV 2026

> Préparé le 23/10/2026, mis à jour le 04/11/2026 puis le 12/11/2026 d'après le règlement officiel publié sur
> https://platform.systalink.com/cadev/conditions-generales. Équipe **Saiyens** (groupe Bénin),
> projet **DevHub Africa**.

## Calendrier officiel (heure de Dakar, GMT)

| Étape                               | Dates                                   |
| ----------------------------------- | --------------------------------------- |
| Inscriptions et soumission          | jusqu'au **15/11/2026 à 17:00**         |
| Vote des pairs (**obligatoire**)    | 15/11/2026 18:00 → **16/11/2026 23:59** |
| Campagne de l'équipe et vote public | 17/11/2026 00:00 → 20/11/2026 23:59     |
| Notation par le jury                | 21/11/2026 → 22/11/2026                 |
| Proclamation des résultats          | 23/11/2026                              |

## Ce que le règlement exige (articles 4, 6, 7 et 10)

- **Article 6.1** : une solution **déployée et accessible en ligne** (la version web est indispensable).
- **Article 6.2** : le déploiement utilise **au moins un produit Datacloud**, acheté avec le code promo de l'équipe (−40 %, hors VPS hors Dakar). Sinon le projet n'est **pas recevable** (condition de recevabilité, pas critère de note).
- **Article 6.3** : création originale, faite pour l'essentiel pendant le concours, libre de droits de tiers, sans contenu illicite. Le premier commit du dépôt date du **06/10/2026**, après l'ouverture des inscriptions (29/09/2026).
- **Article 6.4** : déclaration de titularité de **chaque membre** (section 4).
- **Article 6.5** : composants tiers sous licence permissive seulement ; **GPL, AGPL, LGPL interdites** ; tous les composants et leurs licences déclarés (section 2).
- **Article 6.6** : usage de l'IA déclaré (outils, parties concernées) ; le jury évalue la maîtrise du code par l'équipe, y compris le code écrit avec l'IA (section 3).
- **Article 7** : **chaque membre doit voter** pendant le vote des pairs, sinon le projet de l'équipe est **exclu**.
- **Article 4** : chaque membre a 18 ans révolus, la nationalité ou la résidence d'un pays africain francophone ou anglophone, et un compte Datacloud.
- **Article 10** : comptes multiples, manipulation des votes, plagiat ou déclaration inexacte entraînent la disqualification. Ne pas créer de faux comptes pour voter ni pour gonfler l'activité de la plateforme.

## 1. Liste de contrôle avant l'envoi

État au 12/11/2026.

| #   | Étape                                                                                                            | Qui              | État                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| 1   | Acheter au moins un produit Datacloud avec le code promo −40 %                                                   | Sylvio           | Fait : « Produit Systalink actif » validé sur la page CADEV (11/11) |
| 2   | Déployer : `DEPLOY_ENABLED=true`, déploiement automatique à chaque push sur `main`                               | Emmanuel, Sylvio | Fait : https://devafrica.tech en ligne depuis le 10/11              |
| 3   | Application OAuth GitHub de production (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`)                             | Sylvio           | Fait (10/11) ; boucle de connexion corrigée le 11/11                |
| 4   | `AUTH_FAKE_PROVIDER` à `false` en production                                                                     | Emmanuel         | Fait (connexion GitHub réelle en production)                        |
| 5   | **Envoi des e-mails** : SMTP + SPF, DKIM, DMARC sur devafrica.tech (inscription par e-mail, mot de passe oublié) | Sylvio           | **À faire** (anomalie majeure FONC-03 de la recette du 10/11)       |
| 6   | Optionnel : `LLM_API_KEY` plafonnée (sinon la piste IA et la traduction utilisent le modèle de secours)          | Joachim          | À décider                                                           |
| 7   | Ouvrir le site et l'application mobile sur un vrai téléphone, hors du réseau de l'équipe                         | Tous             | À faire                                                             |
| 8   | Label « DevHub Ready » de devafrica.tech : publier la preuve de domaine, relancer le pré-vol                     | Sylvio           | À faire (démo)                                                      |
| 9   | Vidéo de démo                                                                                                    | Sylvio           | À faire                                                             |
| 10  | Remplir et signer la section 4 (propriété), un membre après l'autre                                              | Chaque membre    | **À faire** : personne ne signe pour un autre                       |
| 11  | Soumettre sur la plateforme CADEV : URL du dépôt, URL de la démo, ce document, **avant le 15/11 à 17:00 GMT**    | Caleb            | À faire                                                             |
| 12  | **Vote des pairs du 15/11 18:00 au 16/11 23:59 : chaque membre doit voter, sinon l'équipe est exclue**           | Chaque membre    | À faire                                                             |
| 13  | Aucun composant GPL, AGPL ou LGPL                                                                                | —                | Revérifié le 12/11 (section 2), application mobile comprise         |
| 14  | Compte d'administration de production (CLI) et onglet Supervision                                                | Sylvio           | Fait (10/11)                                                        |
| 15  | Portail entreprise : `BUSINESS_URL`, `BUSINESS_ADDRESS`                                                          | Emmanuel, Sylvio | Fait : https://business.devafrica.tech répond                       |
| 16  | Adresse de contact affichée (`CONTACT_EMAIL`)                                                                    | Sylvio           | À vérifier sur `/confidentialite`                                   |
| 17  | Aucun compte de test ni contenu fictif en base de production                                                     | Tous             | À vérifier avant l'envoi                                            |

## 2. Composants et licences

Inventaire tiré de `pnpm licenses list` le 23/10/2026, revérifié le 04/11/2026 puis le **12/11/2026** (529 paquets de production pour le web, l'API, l'administration et le portail entreprise ; application mobile comptée à part, voir plus bas).

**Aucun composant sous GPL, AGPL ou LGPL.** Jusqu'au 23/10, l'API dépendait de `sharp`, dont la bibliothèque native libvips est sous LGPL-3.0. Elle est remplacée par `@napi-rs/canvas` (MIT, moteur Skia sous BSD-3-Clause) pour le proxy d'images des actualités et la Proof Card.

### Dépendances de production (529 paquets, directes et indirectes)

| Licence                                                                                        | Paquets  |
| ---------------------------------------------------------------------------------------------- | -------- |
| MIT                                                                                            | 427      |
| Apache-2.0                                                                                     | 37       |
| ISC                                                                                            | 33       |
| BSD-2-Clause                                                                                   | 8        |
| BSD-3-Clause                                                                                   | 6        |
| OFL-1.1 (polices Inter, JetBrains Mono, Plus Jakarta Sans, Poppins…)                           | 6        |
| Unlicense                                                                                      | 3        |
| BlueOak-1.0.0                                                                                  | 2        |
| 0BSD, CC0-1.0, MIT-0, MIT OR CC0-1.0, MIT and ISC                                              | 1 chacun |
| Python-2.0 (`argparse`)                                                                        | 1        |
| EPL-2.0 (`elkjs`, tiré par le CLI Prisma pour Prisma Studio, jamais exécuté par l'application) | 1        |

### Outils de développement et de build seulement (non livrés)

Mêmes familles de licences, plus `lightningcss` (MPL-2.0, utilisé par Tailwind et Vite au moment du build) et des jeux de données CC-BY-4.0 (`caniuse-lite`).

**MPL-2.0 et EPL-2.0** ne figurent pas parmi les licences citées par l'article 6.5 (GPL, AGPL, LGPL). Ce sont des licences à réciprocité limitée au fichier : elles ne s'appliquent qu'aux fichiers de ces composants s'ils étaient modifiés, ce qui n'est pas le cas, et n'empêchent pas l'exploitation exclusive de DevHub. `lightningcss` n'est pas livré (build seulement). `elkjs` est présent dans l'image Docker de l'API parce que le CLI Prisma (`prisma migrate deploy`) l'embarque, mais il n'est jamais exécuté. Pour lever tout doute, l'équipe peut poser la question à `cadev@systalink.com` avant le 15/11.

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

### Application mobile (Android et iOS, `apps/mobile`)

Kotlin Multiplatform et Compose Multiplatform. Dépendances lues dans `apps/mobile/gradle/libs.versions.toml` le 12/11/2026 : **aucune sous GPL, AGPL ou LGPL**.

| Composant                                                                                                               | Licence    |
| ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| Kotlin, kotlinx (coroutines, serialization), Compose Multiplatform, AndroidX (lifecycle, navigation, activity, browser) | Apache-2.0 |
| Ktor (client HTTP), Coil 3 (images), Okio                                                                               | Apache-2.0 |
| Icônes Lucide (tracés repris de lucide-react, `apps/mobile/LUCIDE-LICENSE.txt`)                                         | ISC        |
| Police Poppins (`apps/mobile/POPPINS-OFL.txt`)                                                                          | OFL-1.1    |

### Données, images et services

| Élément                                    | Origine                                                      | Licence ou conditions                                                   |
| ------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Frontières de la carte de l'Afrique (D4)   | Natural Earth 5.1.2 (`scripts/generate-africa-map.mjs`)      | Domaine public                                                          |
| Mascotte Djeli, illustrations et bannières | Générées par l'équipe avec Higgsfield                        | Images générées pour le projet                                          |
| Logos des technologies                     | `simple-icons`                                               | CC0-1.0 ; marques citées pour désigner la technologie, sans affiliation |
| Image Docker de l'API                      | `node:24-alpine`, paquets Alpine `fontconfig`, `font-dejavu` | MIT, licence Bitstream Vera (libre)                                     |
| Image Docker du front                      | `caddy:2-alpine`                                             | Apache-2.0                                                              |
| Base de données                            | PostgreSQL 16                                                | Licence PostgreSQL (permissive)                                         |

### Contenus de tiers affichés sur la plateforme

DevHub n'héberge aucun contenu fictif. Les contenus externes sont collectés depuis des API ou flux publics, affichés avec leur source et un lien vers l'original ; seuls le titre, un court résumé et une vignette sont repris.

| Contenu                     | Sources                                                                                                                                | Usage                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Actualités tech             | Flux RSS publics des éditeurs (TechCrunch, The Verge, TechCabal, Numerama, etc.), Hacker News, DEV                                     | Titre, résumé, vignette, lien vers l'article             |
| Vidéos                      | Flux publics des chaînes YouTube, lecture par le lecteur YouTube intégré                                                               | Vignette et lecteur officiel                             |
| Offres d'emploi             | API publiques Remotive, Jobicy, Himalayas, Greenhouse, Ashby, MyJobMag ; offres ajoutées par l'équipe ou par les entreprises vérifiées | Lien vers l'annonce officielle et mention de la source   |
| Certifications              | Catalogue public Microsoft Learn, pages officielles des certifications                                                                 | Description et lien vers l'organisme                     |
| Skills et outils IA         | Dépôts publics GitHub (Anthropic, OpenAI…), registre MCP officiel                                                                      | Nom, description, lien vers le dépôt                     |
| Activité GitHub du Passport | API publique GitHub, données **publiques** du membre qui a relié son compte                                                            | Dépôts publics, commits récents, événements des 90 jours |

Les données personnelles des membres sont décrites sur la page `/confidentialite` du site.

## 3. Usage de l'IA

| Outil                                                           | Usage                                                                                                                                                                                                                                                                                                      | Parties concernées                                                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Claude Code (Anthropic)                                         | Assistant de développement utilisé par plusieurs membres : écriture et relecture de code, tests, documentation, analyse des anomalies, recette QA. Les commits concernés portent la ligne `Co-Authored-By: Claude`.                                                                                        | Tout le dépôt : `apps/api`, `apps/web`, `apps/admin`, `apps/business`, `apps/mobile`, `packages/*`, `infra/`, `docs/` |
| Higgsfield (génération d'images)                                | Mascotte Djeli, illustrations, bannières                                                                                                                                                                                                                                                                   | `apps/web/public/`                                                                                                    |
| API Claude (modèle `LLM_MODEL`, par défaut `claude-sonnet-5-5`) | Fonction du produit, appelée côté serveur seulement : piste IA sur une question (S2), tâches proposées depuis la discussion d'une salle (R5), traduction FR ↔ EN (S10). Chaque contenu généré est marqué « généré par IA », les secrets sont masqués avant l'envoi et un quota par utilisateur s'applique. | `apps/api/src/modules/ai`                                                                                             |

Chaque membre doit pouvoir expliquer le code de son module, y compris la partie écrite avec l'IA (critère « qualité technique », 30 %). Les choix structurants sont expliqués dans les ADR (`docs/adr/`) et dans `context.md`. L'IA a écrit du code, l'équipe l'a relu, testé (plus de 700 tests automatiques sur l'API, tests du web et de l'application mobile, CI à chaque push) et déployé.

**Le serveur MCP de DevHub** (`/mcp`, `docs/guides/mcp.md`) n'est pas un usage de l'IA par l'équipe : c'est une fonction du produit, qui permet à l'agent IA **d'un développeur** d'agir sur la plateforme en son nom, avec ses droits et un jeton révocable. Aucun modèle d'IA n'est appelé par cette fonction.

## 4. Déclaration de propriété des membres

Chaque membre remplit sa ligne, avec la date.

> Je déclare avoir contribué à DevHub Africa dans le cadre de CADEV 2026, pendant la durée du concours. Ma contribution a été créée **en dehors de toute mission confiée par un employeur, un client ou un établissement d'enseignement** susceptible d'en revendiquer les droits (à défaut, je joins l'autorisation écrite de cette personne). Je détiens les droits sur ma contribution ou je l'ai produite à partir de composants dont la licence le permet, et j'accepte le règlement du concours.

Si un membre a intégré du code personnel antérieur au concours (article 6.5), il le déclare ici avec son emplacement.

| Membre            | Rôle                                   | Contributions principales                                                                                                   |
| ----------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Caleb KPOSSOU     | Back-end, produit et pitch (rôle 1)    | `identity`, `passport`, `reputation`, `discovery`                                                                           |
| Florent AMAMION   | Back-end temps réel et synchronisation | `sos`, `matching`, `notifications`, `sync`, application mobile (`apps/mobile`)                                              |
| Joachim GOEH-AKUE | Back-end, IA et intégrations (rôle 5)  | `ai`, `github`, `rooms`, recette QA et verdict GO / NO-GO du pré-vol                                                        |
| Sylvio CHALLA     | Front-end et hors ligne (rôle 3)       | `apps/web`, `apps/admin`, `apps/business`, pré-vol, label DevHub Ready, serveur MCP, banc d'essai, Systalink, mise en ligne |
| Emmanuel OKORIE   | DevOps et sécurité (rôle 4)            | `moderation`, `platform`, `infra/`                                                                                          |

### Signatures

Chaque membre lit la déclaration ci-dessus, puis écrit lui-même la date et « Lu et approuvé » sur
sa ligne (personne ne signe pour un autre).

| Membre            | Code personnel antérieur au concours (art. 6.5) | Date | Lu et approuvé |
| ----------------- | ----------------------------------------------- | ---- | -------------- |
| Caleb KPOSSOU     |                                                 |      |                |
| Florent AMAMION   |                                                 |      |                |
| Joachim GOEH-AKUE |                                                 |      |                |
| Sylvio CHALLA     |                                                 |      |                |
| Emmanuel OKORIE   |                                                 |      |                |

## 5. Points à trancher par l'équipe

- **Vote des pairs** : prévoir qui rappelle le 15/11 au soir que les **cinq** membres votent avant le 16/11 23:59.
- **Licence du projet** : MIT (fichier `LICENSE`, 10/11/2026), au nom des cinq membres. Permissive et compatible avec toutes les licences des composants de la section 2 ; elle n'empêche pas Systalink ni l'équipe d'exploiter DevHub.
- **Contributeur `Neme6X-dev`** (PR #183 à #196 de l'application mobile, #199 dépendances) : à rattacher à l'un des cinq membres dans la section 4 avant l'envoi.
- **Contributeur `Sacem270`** : c'est Florent AMAMION (PR #151 à #154 et application mobile #194), confirmé par Sylvio le 10/11/2026.
