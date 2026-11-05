# Suivi du projet — CADEV Saiyens

> Journal de bord du travail front de Sylvio (rôle 3), commencé sur la branche `sylvio-frontend`, intégré à `main` le 08/10/2026.
> **Règle :** chaque action, changement, décision ou fix est noté ici, avec sa date. Les entrées les plus récentes vont en haut du journal.

---

## Contexte

**Hackathon :** CADEV 2026 — Systalink Challenge (Coupe d'Afrique des Développeurs)
**Produit :** DevHub Africa (nom de travail, nom définitif le 8 oct.) — la plateforme des développeurs basée sur la preuve : AIDER → CONSTRUIRE → PROUVER, hors ligne d'abord
**Équipe :** 5 personnes
**Code :** `apps/web/` (front, `@devhub/web`) et `apps/api/src/modules/news/` (actualités) ; une branche courte par sujet depuis `main` (voir `docs/equipe/workflow-git.md`)
**Dépôt :** `git@github.com:sx1vio/CADEV-saiyens.git`
**Dates clés :** gel des P2 le 15 oct. · gel du code le 22 oct. · soumission le 24 oct. · date limite repoussée au **15 nov.** par les organisateurs (version web déployée obligatoire)

**Documents de référence :**

- `docs/Cahier_des_charges_v3_DevHub_Africa.pdf` — cahier des charges de référence (v3, 5 oct.)
- `docs/CDC_v3.1_DevHub_Africa_Propositions.pdf` — 59 propositions d'ajouts, **à voter en équipe** (ne remplace pas le v3)
- `docs/front/prompt-frontend-design.md` — brief design/UX du frontend
- `docs/front/phase0-analyse.md` — analyse frontend de la Phase 0
- `docs/front/decisions.md` — **toutes les décisions frontend** (ambition, Kotlin vs React, périmètre v3.1, mascotte, règles de navigation, architecture)

**Sujet :**
Une plateforme d'échange pour les développeurs, par les développeurs et pour les développeurs : un espace où ils peuvent se retrouver, échanger, poser des questions, partager leurs connaissances, présenter leurs projets et collaborer.

Questions auxquelles la plateforme doit répondre :

- Comment les développeurs se rencontrent ?
- Comment ils échangent ?
- Comment ils partagent leurs projets ?
- Comment ils collaborent ?
- Qu'est-ce qui rend la plateforme réellement utile ?

---

## État actuel

| Élément                                                                         | État                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cahier des charges                                                              | ✅ Reçu et analysé (v3 + propositions v3.1)                                                                                                                                                                          |
| Phase 0 — Analyse                                                               | ✅ Terminée ; Sylvio m'a délégué toutes les décisions (`docs/decisions.md`)                                                                                                                                          |
| Stack technique                                                                 | ✅ React 19 + Vite + TS PWA (Kotlin Multiplatform étudié et écarté)                                                                                                                                                  |
| Mascotte Djeli + visuel 3D                                                      | ✅ 6 images générées (Higgsfield)                                                                                                                                                                                    |
| Projet front                                                                    | ✅ Dans `apps/web/` du monorepo (08/10/2026), build OK, testé de bout en bout avec l’API NestJS                                                                                                                      |
| Design system (tokens, composants, thèmes sombre/clair)                         | ✅ Charte « Drivery » : clair, barre latérale noire, pilules, cartes grises, police Inter (06/10/2026)                                                                                                               |
| Services de l’écosystème                                                        | ✅ Fil, communautés, emplois, certifications, skills IA, vidéos, apprendre, guide « Créer avec l’IA », templates (06/10/2026, données de démo)                                                                       |
| Shell (rail, colonne repliable, onglets mobiles, Ctrl+K, visite Djeli)          | ✅                                                                                                                                                                                                                   |
| Écrans (17)                                                                     | ✅ Tous en place, vérifiés en captures 375 / 1440 px                                                                                                                                                                 |
| Hors ligne (file IndexedDB, centre de synchro, SW ; simulateur retiré le 16/10) | ✅ Testé : écriture hors ligne → rechargement → synchronisation sans doublon                                                                                                                                         |
| Poids de l'accueil                                                              | 🟡 312 Ko en mode local (≈ 290 Ko attendus avec l'API : le serveur local de démo n'est plus chargé)                                                                                                                  |
| Revue (768 / 1280 px, contrastes thème clair)                                   | ✅                                                                                                                                                                                                                   |
| Intégration à `main`                                                            | 🟡 PR ouverte depuis `feat/web-platform` (08/10/2026), en attente de relecture                                                                                                                                       |
| Backend                                                                         | 🟡 Actualités, vidéos et proxy d’images portés dans l’API NestJS (module `news`, 08/10/2026) ; connexion par le module `identity` de Caleb ; les services de la plateforme (posts, emplois, certifs…) restent locaux |
| Intégration Systalink (A, B, C)                                                 | ✅ Preuve « en production », bouton « Déployer sur Systalink » compté, aide Systalink (16/10/2026)                                                                                                                   |
| Pré-vol (« du prompt à la prod vérifiée »)                                      | ✅ Livré (04/11/2026) : page `/prevol`, rapport pour l’IA, jetons d’API, serveur MCP, action GitHub (contrôle du code + pré-vol). Guide : `docs/guides/prevol.md`                                                    |
| Démo / pitch                                                                    | ⏳ Pas commencé                                                                                                                                                                                                      |

---

## Reste à faire

- [ ] Pré-vol, pour aller plus loin (demande de Sylvio : « une CI vraiment poussée, un vrai contrôle de code ») : analyse statique de sécurité (Semgrep ou CodeQL) et détection de secrets dans tout l’historique (gitleaks) dans l’action GitHub ; audit Lighthouse mobile réel ; couverture de tests dans le rapport ; commentaire automatique sur les pull requests (04/11/2026)
- [ ] Pré-vol : tests réels entre devs (appareil, réseau, ce qui casse) payés en XP ; tableau de bord Systalink dans `apps/admin` (04/11/2026)
- [ ] Pré-vol : essayer l’action GitHub sur un vrai dépôt une fois `main` en ligne (testée seulement en local, sans `jq`) et remplacer `api-url` par le domaine définitif (04/11/2026)
- [ ] Production : renseigner `PREFLIGHT_GITHUB_TOKEN` (jeton GitHub en lecture seule), sinon 60 requêtes GitHub par heure pour tout le serveur (04/11/2026)
- [ ] Demander à Systalink (cadev@systalink.com) : « Quel est votre plus gros frein pour attirer des développeurs ? » et s'ils permettent de créer des espaces par programme (04/11/2026)
- [ ] **Avant le 25/10 17:00 GMT** : suivre la liste de contrôle de [`docs/soumission.md`](docs/soumission.md) (achat Datacloud à Dakar, mise en ligne, OAuth GitHub de production, déclarations signées, envoi) (23/10/2026)
- [ ] **Vote des pairs du 25/10 18:00 au 26/10 23:59 : chaque membre doit voter, sinon l'équipe est exclue** (23/10/2026)
- [ ] **Héberger et déployer sur Systalink** (VPS, base, SMTP, sauvegarde ; `DEPLOY_ENABLED=true` dans les variables du dépôt) : prévu à la fin par Sylvio
- [ ] Créer l'application OAuth GitHub de production (avec Joachim / Emmanuel) ; GitLab et Google (A2) restent à faire côté API
- [ ] Confirmer avec Systalink (cadev@systalink.com) leurs plages IP (`SYSTALINK_IP_RANGES`), un lien de déploiement préparé et un éventuel programme de crédits ou de commission
- [ ] Décider d'une licence pour le dépôt (aucun fichier `LICENSE`) et identifier le contributeur `Sacem270` (23/10/2026)
- [ ] Tester sur un vrai téléphone d'entrée de gamme, réseau coupé (CDC O1-O3)
- [ ] Dette technique : 39 avertissements oxlint (règles React : pureté, setState dans effet, exports mixtes)
- [ ] Phase 4 : audit du mouvement, audit d'accessibilité, revue de code
- [ ] Passer les services « écosystème » (posts, emplois, certifications, progression) du stockage local à l'API (roadmap, ADR-0016)
- [x] Tests Playwright dans le dépôt et en CI (15 parcours, verts le 23/10/2026)
- [x] PR #97 fusionnée vers `main` (14/10/2026)
- [x] Branche `sylvio-frontend` supprimée, BUG-004 et BUG-005 clos (16/10/2026)

## Fait

- [x] Pré-vol, étape 1 : module API `preflight`, page `/prevol`, rapport Markdown pour l'agent IA, 14 tests (04/11/2026)
- [x] Pré-vol, étape 2 : jetons d'API personnels, serveur MCP `/api/v1/mcp`, action GitHub `actions/prevol` (contrôle du code + pré-vol), guide `docs/guides/prevol.md` (04/11/2026)
- [x] Récupération du travail de l'équipe (#172 à #179) et fusion sur `main` ; `sharp` (LGPL) remplacé ; dossier de soumission (23/10/2026)
- [x] Audit de toutes les branches ; `main` vérifiée de bout en bout (16/10/2026)
- [x] Correctifs BUG-027, BUG-039, test e-mail Y3 ; simulateur de réseau retiré (16/10/2026)
- [x] Systalink A (preuve « en production », +10 XP), B (déploiement compté, écosystème, vitrine), C (aide Systalink) (16/10/2026)
- [x] Nouveau logo DevHub (16/10/2026)
- [x] Accueil en fil unique façon Facebook, landing et connexion/inscription épurées, matière « Retail-X » sur toute la plateforme (08/10/2026)
- [x] Front déplacé dans `apps/web` du monorepo, branché sur l’API NestJS ; backend Fastify porté en module `news` (08/10/2026)
- [x] Premier commit et push de `sylvio-frontend` (06/10/2026)
- [x] Suppression des fichiers `*:Zone.Identifier` + `.gitignore` racine (06/10/2026)
- [x] README du front : lancer, brancher l'API, architecture, règles d'équipe (06/10/2026)
- [x] Vérification 768 / 1280 px, connexion, Passport et salle sur mobile (06/10/2026)
- [x] Design system complet : tokens sombre/clair, boutons, cartes, badges, nav segmentée (image 03), barre G+P, heatmap, code, Markdown assaini (06/10/2026)
- [x] Shell façon Discord : rail des espaces (QG + mes salles), colonne repliable à coins inversés (image 04), barre du haut, onglets mobiles, tiroir avec balayage, panneau contextuel (06/10/2026)
- [x] 17 écrans : accueil public, connexion GitHub, onboarding 5 étapes, QG, SOS Dev, question, Projets, nouvelle salle, salle (Kanban), Découvrir, Classement, Passport, Systalink, Impact, Règles, Modération, Réglages, 404 (06/10/2026)
- [x] Visite guidée par Djeli (7 étapes, projecteur sur les vrais éléments, clavier, mobile) (06/10/2026)
- [x] Palette Ctrl+K, raccourcis G+H/S/P/D, N, [, ?, / (06/10/2026)
- [x] Test de bout en bout du parcours de démo (06/10/2026)
- [x] Budget de poids : 295 Ko pour l'accueil (06/10/2026)
- [x] Réponses de Sylvio : rôle 3 confirmé, page publique sans compte, décisions déléguées (06/10/2026)
- [x] Étude Kotlin / Compose Multiplatform → écarté, on reste en React PWA (06/10/2026)
- [x] `docs/decisions.md` rédigé (06/10/2026)
- [x] Projet `frontend/` créé (Vite + React + TS) et dépendances installées (06/10/2026)
- [x] Mascotte Djeli générée : salut, désigne, célèbre, ordinateur (+ lecture, hors ligne en cours) ; visuel 3D du hero (06/10/2026)
- [x] Phase 0 : analyse du cahier des charges v3 et des propositions v3.1 → `docs/phase0-analyse.md` (06/10/2026)
- [x] Vérification des contrastes WCAG de la palette (06/10/2026)
- [x] Prompt de design enregistré dans `docs/prompts/prompt-frontend-design.md` (06/10/2026)
- [x] Ajout de l'image de référence `04b-sidebar-coins-inverses.png` (06/10/2026)
- [x] Prompt de design/UX frontend rédigé + 5 images d'inspiration ajoutées (06/10/2026)
- [x] Création de la branche `sylvio-frontend` (06/10/2026)
- [x] Création du fichier de suivi `SUIVI.md` (06/10/2026)

---

## Décisions

Les choix structurants (stack, architecture, conventions, périmètre) et leur raison.

| Date       | Décision                                                                                                                                                                                  | Raison                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 08/10/2026 | **Intégration au monorepo de `main`** : front dans `apps/web`, backend Fastify abandonné au profit de l’API NestJS (module `news` ajouté, connexion par `identity`)                       | `sylvio-frontend` n’avait aucun historique commun avec `main` ; une seule API pour l’équipe (ADR-0002). Détails : `docs/front/decisions.md` §14 |
| 06/10/2026 | Le cahier des charges v3 est la référence ; les propositions v3.1 n'entrent dans le périmètre qu'après le vote d'équipe                                                                   | Règle du prompt : le CDC l'emporte ; le v3.1 est un document « à discuter »                                                                     |
| 06/10/2026 | Mise en page Discord conservée, mais adaptée aux 6 sections du CDC : rail = sections + mes salles ; colonne = sous-sections du contexte                                                   | Le CDC dit « ni un Discord », Stack Spaces et chat temps réel sont en roadmap, pas de menu à 15 entrées                                         |
| 06/10/2026 | IndexedDB (`idb`) pour le cache et la file hors ligne ; `localStorage` seulement pour les préférences                                                                                     | O1/O2 (P0) et section 6.5 du CDC                                                                                                                |
| 06/10/2026 | Services `src/services/` calqués sur les endpoints (CDC §8) et le modèle de données (§7) ; mocks = comptes « Démo » marqués                                                               | Brancher la vraie API sans toucher l'UI ; CDC : aucune donnée inventée présentée comme réelle                                                   |
| 06/10/2026 | i18n FR/EN (react-i18next) dès le premier composant                                                                                                                                       | I1 est P0                                                                                                                                       |
| 06/10/2026 | Prism au lieu de Shiki, une seule police web en sous-ensemble, Motion en LazyMotion                                                                                                       | Budget CDC : accueil < 300 Ko, téléphones d'entrée de gamme                                                                                     |
| 06/10/2026 | **React PWA, pas Kotlin Multiplatform**                                                                                                                                                   | Compose web encore en bêta, rendu canvas + ~9 Mo de Wasm, accessibilité/SEO limités, contredit le CDC (§8, §9). Détails `docs/decisions.md` §2  |
| 06/10/2026 | Propositions v3.1 retenues : T1-T5, S8-S11, S14, S16, O5, O8, O9, PR7, PR8, PR10, PR11, R11, D6, X5, Y6, M3                                                                               | Décision déléguée ; liste et raisons dans `docs/decisions.md` §3                                                                                |
| 06/10/2026 | Mascotte **Djeli** (griot = guide, gardien du savoir) + visite guidée en 6 étapes après l'inscription                                                                                     | Demande de Sylvio : un vrai hub, pas un site plat                                                                                               |
| 06/10/2026 | 8 règles de navigation et de mise en page (une intention par page, préchargement, skeletons, transitions ≤ 220 ms, raccourcis, état dans l'URL…)                                          | Demande de Sylvio : navigation très fluide, écrans très intuitifs. `docs/decisions.md` §5                                                       |
| 06/10/2026 | **Polices système** au lieu d'Inter web (Inter utilisée seulement si installée localement)                                                                                                | CDC §9 « polices système » ; −47 Ko, indispensable pour passer sous 300 Ko                                                                      |
| 06/10/2026 | Shell connecté, palette, visite, dialogues et serveur local chargés à la demande ; anglais chargé seulement si choisi ; préchargement des pages seulement en 4G sans « économie de data » | Accueil 443 Ko → 295 Ko                                                                                                                         |
| 06/10/2026 | La piste « IA » en mode local est une **piste automatique par motifs d'erreurs connues**, étiquetée comme telle ; la vraie piste IA viendra du serveur                                    | Le CDC interdit la clé IA côté front ; ne jamais présenter du généré comme ce qu'il n'est pas                                                   |
| 06/10/2026 | Pas de fausse activité : en démo, on **change de compte démo** (menu avatar) pour jouer les deux côtés d'une conversation                                                                 | Le CDC interdit les données inventées présentées comme réelles                                                                                  |
| 06/10/2026 | Code front dans `frontend/` ; services à deux implémentations : `api` (HTTP) et `local` (IndexedDB, qui applique les règles du CDC)                                                       | Une app qui marche de bout en bout avant que l'API existe, puis bascule par `VITE_API_URL`                                                      |

---

## Idées et suggestions

Pistes d'amélioration proposées en cours de route, à valider ou écarter.

| Date       | Idée                                                                                                                                            | Statut                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 06/10/2026 | Command palette Ctrl/Cmd+K pour la recherche et la navigation (public de devs)                                                                  | Vérifié : absente du v3, **P2** dans le v3.1 (T5). Gardée pour après le cœur du MVP |
| 06/10/2026 | Couche `src/services/` mockée et typée, pour que l'équipe backend puisse brancher l'API sans toucher l'UI                                       | Retenue (voir Décisions)                                                            |
| 06/10/2026 | Pousser au vote d'équipe T1 + T2 (accueil public + essai sans compte), O5 (simulateur réseau), PR7 (barre G + P), S9 (étiquettes auto)          | Proposé : faible coût front, fort impact sur le vote                                |
| 06/10/2026 | Corrections de palette : `--text-subtle` → `#7E84B2`, fond de pilule active `#6857E0`, texte accent `#9B8FFF`, texte sombre sur pastille corail | Proposé : passe WCAG AA (détails `docs/phase0-analyse.md` §7)                       |

---

## Journal

### 05/11/2026 — Refonte v3 : navigation resserrée, accueil façon LinkedIn, tons Discord, verre Apple

- **Demande de Sylvio** : retirer Vidéos, Communautés (garder des centres d'intérêt), Passport (doublon du profil), Apprendre, Guide IA, Templates, Classement ; fusionner l'Entraide dans l'accueil ; s'inspirer de GitHub, LinkedIn et Discord ; Poppins ; éléments plus grands ; un vrai fil d'actualité ; pas de points verts ni de panneau « En direct » ; icônes pleines et unies ; pas de texte gris ; un peu de glassmorphisme Apple ; carte de gauche retirée, filtres masquables, colonne centrale plus large ; menu latéral : garder les coins inversés.
- **Fait** (branche `feat/plateforme-v2`, poussée) : pages et données retirées, anciens liens redirigés (`/sos` → `/?f=questions`, `/apprendre` → `/certifications`, `/creer` et `/templates` → `/prevol`, `/classement` → `/decouvrir`) ; navigation en trois groupes (réseau, Progresser, Livrer) avec une entrée « Banc d'essai » à venir ; accueil = fil unique (articles réels avec images, publications, questions d'entraide) filtré par centres d'intérêt, section « À la une » parmi les sujets, onglets Questions et Actualité, panneau de filtres (contenu, langue, centres d'intérêt) masquable et mémorisé ; profil refait (carte d'identité, bannière dessinée avec l'activité réelle, graphe de contributions vert, colonne certifications) ; mot « Passport » remplacé par « profil » ; Poppins (OFL) ; tons Discord (#f2f3f5 / #313338), texte foncé ; icônes Phosphor pleines (MIT) dans le shell et l'accueil ; verre Apple sur les cartes, la barre du haut, les boutons et les puces.
- **Environnement** : Postgres 17 portable lancé depuis le scratchpad (pas de Docker dans WSL), front en mode HTTP (`VITE_API_MODE=http`), 847 articles collectés en local (`news:ingest`). Suite API : 566 tests verts (2 instables en suite complète, verts seuls).
- **Pas encore fait** : pré-vol v2 (Lighthouse réel, test de charge avec preuve de propriété, gitleaks et osv-scanner dans l'action, commentaire de PR), Banc d'essai (tests entre devs), préparation des certifications, site vitrine, tests e2e à mettre à jour pour les pages retirées.

### 04/11/2026 — Pré-vol : agent IA et CI (étape 2), documentation

- **Demande de Sylvio** : « oui » pour l'étape 2, puis « je veux plus que ça : des tests automatiques et gratuits, une CI vraiment poussée, un vrai contrôle de code », puis « finis les améliorations du pré-vol, mets à jour la doc et on s'arrête ». Fait : l'étape 2, avec un contrôle du code dans l'action GitHub ; le reste est noté dans « Reste à faire ».
- **Jetons d'API personnels** (module `identity`) : table `api_tokens` (migration `20261104190000`), `dh_pat_` + 256 bits, seule l'empreinte SHA-256 est stockée, 5 au plus. Routes `GET/POST /api/v1/me/tokens` et `DELETE /api/v1/me/tokens/:id` (session uniquement). Décorateur `@AllowApiToken()` : session **ou** jeton, réservé aux routes du pré-vol ; `OriginGuard` laisse passer ces routes avec un jeton ou sans cookie (pas de CSRF possible), sinon le contrôle d'origine reste le même. Jetons supprimés avec le compte, refusés si le compte est suspendu.
- **Serveur MCP** : `POST /api/v1/mcp` (Streamable HTTP sans état, JSON-RPC écrit à la main, versions 2024-11-05 à 2025-11-25) ; outils `run_preflight`, `get_preflight_report`, `list_preflights` ; consignes pour l'agent ; erreurs (quota, dépôt privé, site injoignable) renvoyées comme résultat d'outil lisible. `GET` → 405, sans jeton → 401. Essai réel : `systalink.com` + `expressjs/express` lancé par MCP, rapport Markdown complet en 11 s.
- **Action GitHub** `actions/prevol` (composite) : installation avec le bon gestionnaire (pnpm, yarn, bun, npm), puis `lint`, `typecheck`, `test` et `build` s'ils existent, tableau dans le résumé du job ; puis pré-vol avec le jeton, rapport dans le résumé, annotations par problème, seuils `fail-on` et `min-score`, dépôt privé ignoré automatiquement. **Non exécutée sur GitHub** (vérifiée seulement par `bash -n` ; `jq` absent en local).
- **Front** : section « Brancher ton agent IA et ta CI » sur `/prevol` (onglets Claude Code, Cursor et autres, GitHub Actions avec configuration prête à copier ; création, affichage unique et suppression des jetons). Vérifié en captures 1366 et 390 px, sans débordement.
- **Documentation** : nouveau guide `docs/guides/prevol.md`, routes ajoutées à `docs/architecture/06-api.md`, exception CSRF des jetons décrite dans `docs/architecture/10-securite.md`, lien dans `docs/README.md`.
- **Tests** : `mcp-server.spec.ts` (5 tests) et `test/api-tokens.e2e.spec.ts` (4 tests de bout en bout : jeton montré une fois, limité au pré-vol, 401 sans jeton, révocation).

### 04/11/2026 — Pré-vol : « du prompt à la prod vérifiée » (étape 1)

- **Demande de Sylvio** : retenir les idées d'une conversation avec Claude (le dernier kilomètre entre le code écrit par l'IA et une application qui tient en vrai, au service des devs et de Systalink), puis « vasy » pour la première brique.
- **Ce qui a été retenu** : compléter la CI au lieu de la refaire (« GitHub Actions teste votre code, nous testons votre produit dans le monde réel ») ; un rapport lisible par l'IA du dev ; des tests réels entre devs payés en XP ; le badge existant (preuve Systalink et surveillance) comme socle. **Écarté pour la démo** : « Cloner et lancer chez moi » et la création d'espaces Systalink par programme (API non vérifiée), et le déploiement par agent (le catalogue Systalink annonce déjà une connexion MCP). Correction : l'usage de Systalink est une condition de recevabilité, pas un critère noté à 40 %.
- **API** (module `preflight`, branche `feat/prevol`) : `POST /api/v1/preflight` (compte requis, 10 par heure, un à la fois), `GET /api/v1/preflight` (mes 20 derniers), `GET /api/v1/preflight/:id` (public, non listé) et `GET /api/v1/preflight/:id/report.md` (Markdown avec une consigne pour l'agent, les corrections dans l'ordre et un identifiant stable par contrôle). Table `preflight_reports` (migration `20261104170000`).
- **Contrôles du site** : `.env`, `.env.local`, `.env.production` et `.git/config` lisibles (sans confondre avec la page d'accueil d'une SPA) ; clés privées, AWS, GitHub, Stripe, OpenAI, Anthropic et Slack dans le JavaScript servi (motifs de `@devhub/core`, valeur jamais stockée) ; redirection HTTP → HTTPS ; en-têtes de sécurité ; cartes de source publiques ; version du serveur annoncée ; premier affichage estimé sur le profil « 3G rapide » de Chrome (1,6 Mbit/s, 562 ms) ; poids ; compression ; images lourdes ; cache ; viewport mobile ; temps de réponse ; hébergement chez Systalink (`SYSTALINK_IP_RANGES`). Les scripts tiers (mesure d'audience) ne sont pas reprochés au site pour le cache et la compression.
- **Contrôles du dépôt** : fichiers de secrets publiés (hors dossiers de test, d'exemple et `playground/`) ; failles connues dans la base publique OSV avec la version corrigée (package-lock, pnpm-lock y compris en plusieurs documents, yarn.lock, package.json, requirements.txt) ; fichier de verrouillage absent ; licence du dépôt ; dépendances directes GPL ou AGPL (registre npm).
- **Sécurité du pré-vol** : refus du réseau interne à chaque redirection (anti-SSRF, `127.0.0.1.nip.io` et `169.254.169.254` vérifiés refusés), plafonds de taille et de durée par requête, budget global de 45 s, aucun code du dépôt analysé n'est exécuté. Nouvelle variable facultative `PREFLIGHT_GITHUB_TOKEN`.
- **Front** : page `/prevol` (formulaire, historique) et `/prevol/:id` (score, verdict, mesures, contrôles groupés, « Copier pour mon IA », téléchargement `.md`, lien, relance, consigne prête pour l'agent) ; entrée « Pré-vol » dans la section Créer. Vérifié en captures 1366 et 390 px (débordement horizontal corrigé sur téléphone).
- **Essais réels** : `systalink.com` + `vitejs/vite` (score 70, hébergé chez Systalink détecté, 1 241 dépendances lues) ; `OWASP/NodeGoat` (clé privée publiée et 131 dépendances vulnérables détectées, versions corrigées indiquées).
- **Tests** : `preflight.spec.ts` (14 tests) ; suite API complète verte (557 tests), types, lint et build du front OK.
- **Environnement local** : Node 24 installé dans `~/.local/node24` ; `main` locale était en retard sur GitHub (récupération en HTTPS) ; `.env` local créé.

### 04/11/2026 — Activité GitHub sur le Passport, confidentialité, conformité au règlement

- **Demande de Sylvio** : « la connexion GitHub d'un profil doit permettre de voir leurs projets, commits, activités » ; puis « assure-toi qu'on est dans les règles » (conditions générales CADEV).
- **Activité GitHub** : `GET /api/v1/users/:handle/github` (module `passport`) : profil public, dépôts mis en avant (sources publiques, les plus étoilés), commits récents de l'auteur sur ses trois derniers dépôts, événements publics des 90 derniers jours, calendrier, langages. **Données publiques seulement**, jeton du membre utilisé pour le quota (lecture seule) et abandonné s'il est révoqué. Cache d'une heure en base, ancienne version servie jusqu'à 7 jours si GitHub est en panne. Masquée si le membre masque ses statistiques. Section « Sur GitHub » sur le Passport. Vérifié avec le vrai profil public `sx1vio` (compte local temporaire supprimé ensuite).
- **Confidentialité** : nouvelle page `/confidentialite` (données collectées, messages privés, candidatures, activité GitHub, partage avec GitHub et Anthropic, durées, suppression, droits), lien dans le pied de page et dans l'inscription du portail entreprise. Adresse de contact configurable (`VITE_CONTACT_EMAIL`).
- **Règlement relu** (page officielle, 04/11) : soumission le **15/11 à 17:00 GMT**, **vote des pairs obligatoire pour chaque membre du 15/11 18:00 au 16/11 23:59**, vote public 17–20/11, jury 21–22/11, résultats le 23/11. Vérifications : premier commit le 06/10 (après l'ouverture du 29/09) ; aucune licence GPL, AGPL ou LGPL ; seules licences non permissives : `elkjs` (EPL-2.0, dans le CLI Prisma de l'image API, jamais exécuté) et `lightningcss` (MPL-2.0, build seulement), justifiées. `docs/soumission.md` mis à jour : calendrier, exigences article par article, contenus de tiers et leurs sources, déclaration de titularité conforme à l'article 6.4 (hors mission d'employeur, client ou école), nouvelles étapes avant l'envoi (compte admin par la CLI, sous-domaine business, adresse de contact, aucune donnée de test en production).
- Divers : libellé « GitHub · 1 an » au singulier.
- Tests : `github-activity.spec.ts` (règles pures) et `github-activity.e2e.spec.ts` (faux GitHub, cache, panne, confidentialité).
- CI : le parcours Playwright « Contacter » cliquait sur l'ancien bouton ; il suit maintenant le nouveau parcours (message privé depuis le Passport, notification, lecture en direct). 18 parcours verts en local.

### 04/11/2026 — Messagerie entre devs

- **Demande de Sylvio** : « sur la plateforme DevHub elle-même, je veux un chat, pouvoir contacter et discuter avec les devs ».
- **API** (module `messaging`) : tables `conversations` (une seule par paire), `conversation_members` (lecture), `direct_messages` (idempotents par `clientId`), `user_blocks`. Routes `GET/POST /api/v1/conversations`, `GET/POST /api/v1/conversations/:id/messages`, `POST …/read`, `POST/DELETE /api/v1/users/:handle/block`. Garde-fous : 20 nouvelles conversations par jour, 30 messages par minute, pas d'écriture vers un compte suspendu, supprimé, bloqué ou d'administration.
- **Temps réel** : sujet SSE `dm:<id>` réservé aux deux membres (le fil se met à jour en direct) et signal personnel `signal.dm` (liste et compteur de non-lus). Une seule notification « message reçu » par série de messages non lus, pas une par message.
- **Modération** : un message privé peut être signalé, uniquement par un membre de la conversation ; la modération le masque comme les autres contenus (`direct_message`).
- **Site** : page `/messages` (liste, recherche, fil avec séparateurs par jour, envoi avec Entrée, nouvel essai si l'envoi échoue, messages précédents, bloquer, signaler), icône Messages avec le nombre de non-lus dans la barre du haut, bouton « Envoyer un message » sur le Passport (remplace le contact par e-mail). Logo de la barre mobile lisible en thème clair.
- Tests : `messages.e2e.spec.ts` (7 scénarios : paire unique, non-lus et notification par série, idempotence, confidentialité y compris le flux temps réel, blocage, signalement, compte suspendu) ; vérifié dans le navigateur avec deux comptes (desktop et mobile). API : 535 tests verts.

### 04/11/2026 — Administration complète

- **Demande de Sylvio** : « gestion administration et main totale sur toute la plateforme : les flux, les activités, vraiment tout ».
- **API** (`admin-platform.controller.ts`, toutes les routes en 404 sans session d'administration) : utilisateurs (recherche, filtres, statistiques par compte, suspendre / réactiver / marquer démo / supprimer), contenus des six types (lister, chercher, masquer, rétablir), fil d'activité, statistiques sur 30 jours, flux collectés (passages, erreurs, relance d'une collecte), annonces, administrateurs (liste, ajout avec mot de passe et double facteur, rôle, retrait). Chaque action est journalisée.
- **Rôles** : `super` (tout) et `moderator` (pas de gestion des admins ni de suppression de compte). Les admins existants deviennent `super` (migration `20261104120000_admin_full`), la CLI crée des super-admins.
- **Suspension** : un compte suspendu perd ses sessions, et sa reconnexion (GitHub ou e-mail) est refusée avec un message dédié.
- **Annonces** : `GET /api/v1/announcements` (public) et bandeau refermable sur le site, connecté ou non.
- **`apps/admin`** : onglets Activité, Utilisateurs, Contenus, Flux, Annonces, Administrateurs, en plus des existants ; rôle affiché dans la barre latérale.
- Tests : `admin-platform.e2e.spec.ts` (8 scénarios : invisibilité, rôles, suspension et reconnexion refusée, contenus, activité/statistiques/flux, annonces et lien piégé refusé, gestion des admins, suppression). API : 527 tests verts.

### 04/11/2026 — Portail entreprise (DevHub Business)

- **Demande de Sylvio** : pouvoir s'inscrire en tant qu'entreprise sur un sous-domaine (`business.devhub…`) pour publier des offres ; un admin avec la main sur toute la plateforme ; une messagerie entre devs ; le profil GitHub (dépôts, commits, activité) sur le Passport. Choix validés : entreprise validée une fois par l'admin puis publication directe, candidatures sur DevHub, gratuit pour le concours, admin complet (utilisateurs, contenus, entreprises, admins, annonces, statistiques, flux et activité).
- **API** (module `business`) : tables `companies`, `business_accounts` (séparés des comptes devs), `business_sessions`, `job_applications` ; `job_offers` gagne `company_id` et accepte une offre sans lien externe. Routes `/api/v1/business/*` (inscription, connexion, profil, offres, candidatures, statut) invisibles hors de `BUSINESS_URL`, CORS fermé, tentatives limitées. Côté devs : `POST /api/v1/jobs/:id/apply`, `GET/DELETE /api/v1/me/applications`, `GET /api/v1/companies/:slug`. Une offre d'entreprise n'est publique que si l'entreprise est validée. Notification `application.status` au dev à chaque étape.
- **Admin** : onglet « Entreprises » (à vérifier, validées, refusées, suspendues ; comptes, activité ; valider, refuser avec motif, suspendre, réactiver), actions journalisées ; suspendre ferme les sessions des recruteurs. Les offres d'entreprise sont signalées dans la liste ; l'admin peut seulement les retirer ou changer leur échéance.
- **`apps/business`** (port 5399) : accueil pour les recruteurs avec inscription, connexion, tableau de bord, offres (éditeur, brouillon tant que l'entreprise n'est pas validée), candidatures avec le Passport du candidat et changement de statut, profil de l'entreprise. Caddy : bloc `BUSINESS_ADDRESS`. Documentation : `apps/business/README.md`.
- **Site** : « Postuler avec mon Passport » sur les offres d'entreprise, « Mes candidatures » sur `/emplois`, page publique `/entreprises/:slug`, lien « Vous recrutez ? » vers le portail.
- Tests : `business.e2e.spec.ts` (invisible hors de son origine, attente puis validation, publication, candidature, notification, isolement entre entreprises, suspension) ; parcours complet vérifié dans le navigateur (inscription → validation admin → offre → candidature → entretien → statut vu par le dev).

### 02/11/2026 — Contenu réel partout, onboarding selon le niveau, apprentissage façon Duolingo

- **Demande de Sylvio** (captures de l'onboarding) : un dev confirmé n'a pas à choisir un rythme d'apprentissage ; un débutant doit avoir un parcours façon Duolingo selon ce qu'il veut apprendre ; les pastilles de langue cassent ; le fuseau horaire doit être une liste. Puis : de vraies certifications (officielles avec liens, et DevHub), de vraies offres d'emploi tenues par l'admin, un espace admin caché et sécurisé (pas accessible par `/admin` ni depuis le front), de vrais skills et plugins IA, « un vrai contenu partout », plateforme prête à être soumise.
- Branche `sylvio-contenu` depuis `main`.
- **Lancement local** : PostgreSQL et Mailpit dans Docker Desktop, `.env` local (non suivi), front sur le port 5199 (`APP_URL` aligné), Node 22 avec `npm_config_engine_strict=false` en attendant Node 24.
- **Onboarding** (`pages/Onboarding.tsx`) : étapes selon le niveau. Débutant ou curieux : niveau, objectifs, **cours choisi**, rythme, profil, plan. Dev confirmé : pas d'objectif « Apprendre à coder », pas de rythme, une étape « Comment veux-tu aider ? » (disponibilité, missions). Dev avec quelques projets : domaines et compétences, rythme et disponibilité. Coche des pastilles décalée (plus de chevauchement avec « Français »), centrée sur les pastilles en ligne. **Fuseau horaire** : liste IANA groupée par région, Afrique en premier, avec le décalage UTC (`components/TimezoneSelect.tsx`), fuseau du navigateur par défaut.
- **Apprendre façon Duolingo** : 6 cours (sites web, Python, Git et GitHub, SQL, Flutter, Créer avec l'IA), 4 unités de 3 leçons chacun, soit 72 leçons et environ 430 exercices rédigés (`platform/data/courses/`, chargés à la demande). Chaque leçon : une fiche de cours puis des exercices de 5 types (choix, vrai ou faux, code à trou, lignes à remettre dans l'ordre, association). `/apprendre` montre le chemin du cours en zigzag (leçon en cours qui pulse avec sa bulle, leçons verrouillées, trophée de fin d'unité, Djeli), la série, les XP et l'objectif du jour réglable. Lecteur plein écran `/lecon/:cours/:leçon` : barre de progression, compteur de bonnes réponses d'affilée, correction animée (secousse, rebond, feuille verte ou rouge avec l'explication), les erreurs reviennent en fin de leçon, raccourcis clavier (1-4, Entrée), écran de fin avec confettis, XP, précision et temps. Animations coupées si « réduire les animations » est actif.
- Parcours approfondis gardés sous le chemin (« Pour aller plus loin ») ; auteurs fictifs et nombres d'apprenants inventés retirés.
- Bandeau « contenus de démonstration » retiré de `/apprendre` et `/creer` (contenu réel, seule la progression reste sur l'appareil). La carte de série de la barre latérale suit l'objectif du jour réel.
- **Espace d'administration séparé et sécurisé** (`apps/admin`, module API `backoffice`) : application à part sur sa propre origine (port 5299 en local, sous-domaine en production), session à part (cookie `__Host-dh-adm`, SameSite=Strict, 30 min d'inactivité, 8 h au plus), connexion par e-mail, mot de passe et **code TOTP** (RFC 6238, vecteurs officiels testés, anti-rejeu). Comptes créés **uniquement par la CLI** (`pnpm --filter @devhub/api admin create|reset-2fa|revoke|list`), secret TOTP chiffré AES-256-GCM. Toutes les routes `/api/v1/admin/*` répondent **404** sans session d'administration, même pour un membre marqué admin ; écritures limitées à `ADMIN_URL` + `X-DevHub-Client: admin` ; CORS fermé sur ces routes ; liste d'IP optionnelle (`ADMIN_ALLOWED_IPS`). Connexions et actions journalisées. Caddy : bloc `ADMIN_ADDRESS` (noindex, CSP stricte, seules les routes admin relayées). Documentation : `apps/admin/README.md`.
- **Front public sans aucune trace de l'admin** : page `/admin`, entrée de menu, palette, appels et textes de modération retirés ; la modération (signalements, journal) passe dans l'application d'administration.
- **Offres d'emploi réelles** : table `job_offers`, gérée depuis l'administration (brouillon, publiée, archivée, expiration, lien de candidature https ou mailto, **lien obligatoire vers l'annonce officielle**). `GET /api/v1/jobs` public. Page `/emplois` réécrite : « Sélection DevHub » (offres publiées par l'admin) puis offres collectées en direct ; candidature sur le site de l'entreprise, aucune donnée captée. Entreprises et offres fictives, faux formulaire « Publier une offre » et candidatures simulées supprimés.
- **Collecte des offres** : filtre des métiers du logiciel resserré (ingénieries du bâtiment et de l'industrie, vente, RH écartées) ; filtre strict pour les sites d'emploi généralistes (MyJobMag), appliqué aussi à la lecture des offres déjà stockées.
- Tests : API `admin.e2e.spec.ts` (404 partout sans session, connexion, anti-rejeu, cookie strict, origine, CORS, cycle de vie d'une offre, journal, révocation) et `moderation.e2e.spec.ts` adapté ; TOTP (RFC 6238) ; filtres d'offres ; e2e web : `/admin` introuvable côté site.
- **Certifications DevHub complètes** : 9 certifications (développement web, JavaScript, Python, Git et GitHub, SQL, React, sécurité web, Docker et mise en production, IA responsable), chacune avec une **banque de 25 questions** rattachées aux thèmes du programme (225 questions rédigées, avec explications). Examen : 20 questions tirées au hasard (au moins une par thème), réponses mélangées, **chronomètre** (25 à 30 min), navigation et questions marquées, envoi confirmé, **score par thème**, correction détaillée, **code de vérification** du certificat, nouvelle tentative une heure après un échec, lien vers le cours de préparation. Compteurs de titulaires inventés supprimés.
- **Catalogue des certifications officielles** refait : 56 fiches vérifiées en novembre 2026 (AWS, Microsoft, Google Cloud, Linux Foundation et CNCF, Red Hat, HashiCorp, GitHub, Cisco, CompTIA, ISC2, Python Institute, Oracle, MongoDB, Databricks, Snowflake, Scrum.org, ISTQB, Salesforce, freeCodeCamp, CS50, Microsoft Applied Skills, Kaggle, Hugging Face, Anthropic Academy, Cisco NetAcad, Google et Meta sur Coursera) : code d'examen, format, score requis, validité, **lien direct vers la page officielle**, préparation officielle gratuite, prix public indicatif, et changements datés (AI-901 remplace AI-900, AZ-204 et AI-102 retirés, SAP-C03 au 17/11, fin du programme gratuit ISC2, Terraform 004…). Bandeau « démonstration » retiré de `/certifications`.
- **Test de contenu** (`platform/data/content.spec.ts`) : chaque question et chaque exercice des cours est vérifié (bonne réponse présente, thème valide, code à trou cohérent, lignes et paires uniques). Il a trouvé une paire en double dans le cours IA, corrigée.
- **Skills et plugins IA réels** : catalogue de l'écosystème officiel (skills et plugins d'Anthropic, serveurs MCP Playwright, Chrome DevTools, GitHub, Context7, Supabase, Sentry, Cloudflare, Notion, Linear, Figma, Stripe, serveurs de référence MCP, formats AGENTS.md, CLAUDE.md et Cursor Rules), chacun avec son dépôt ou sa documentation et la **commande d'installation générée selon la syntaxe de chaque outil** (`claude mcp add`, `~/.codex/config.toml`, `.cursor/mcp.json`, configuration MCP d'Antigravity). 12 skills et règles DevHub avec leur fichier complet téléchargeable (revue de code, mobile money, PWA hors ligne, secrets, commits, tests Playwright, accessibilité, i18n, OpenAPI, déploiement VPS, Flutter entrée de gamme, Laravel). Faux auteurs, faux compteurs et fausses URL d'installation supprimés ; bandeau « démonstration » retiré de `/skills`.
- **03/11 — Fil de la communauté réel** (module API `community`) : tables `posts`, `post_comments`, `post_votes` ; `GET/POST /api/v1/posts`, détail avec commentaires en fil, réponses, votes (±1), suppression par l'auteur, `GET /api/v1/communities` (activité réelle : publications, auteurs, semaine). Limites anti-spam (10 publications et 100 commentaires par jour, pas de lien pendant la première heure d'un compte), liens https uniquement, `rel="nofollow ugc"`. Posts et commentaires **signalables et masquables** depuis l'administration (cibles `post`, `post_comment`). Test d'intégration `posts.e2e.spec.ts`.
- Front branché sur cette API : fil « Discussions » de l'accueil (récentes, populaires), annuaire et pages des communautés (plus de nombres de membres inventés), page d'une publication (vote, commentaires et réponses, signaler, supprimer), page « Publier » (avec extrait de code), palette de commandes. Posts, commentaires et votes fictifs supprimés, ainsi que l'état local qui les simulait.
- **Vidéos** : section « Créateurs DevHub » et lecteur fictifs retirés ; seules les vraies vidéos YouTube collectées restent. **Templates** : remplacés par 13 starters officiels (Next.js, Next.js + Supabase, Vite, T3, Laravel, Astro, Starlight, Medusa, Expo, Flutter, NestJS, FastAPI, Django) avec la commande de leur documentation, leur licence et leurs liens. Faux profils (`data/people.ts`) et vidéos fictives supprimés. **Bandeau « contenus de démonstration » supprimé** : plus aucune page de l'écosystème n'en a besoin.
- **Vérification complète (03/11)** : API 510 tests (90 fichiers) ; front 76 tests unitaires ; **19 parcours Playwright** de bout en bout, dont le nouveau `community.e2e.ts` (publier, commenter, répondre) ; lint et formatage propres ; builds de l'API, du front et de l'administration. L'utilitaire CIDR passe dans `@devhub/core` (règle pure, utilisable par la couche domaine).
- **Fusion** de `sylvio-contenu` sur `main`.

### 25-26/10/2026 — Refonte bleue reportée dans le monorepo, comptes par e-mail dans l'API

- PR #181 (emplois, certifications et skills collectés en direct) fusionnée dans `main`.
- La refonte faite sur `sylvio-frontend` (branche sans historique commun avec `main`) est reportée dans `apps/web` par fusion à trois voies, fichier par fichier : barre latérale bleue (entrée active fusionnée, flèches de défilement, carte de série de Djeli), barre du haut sur ordinateur, logo DevHub, Bricolage Grotesque et IBM Plex Sans (OFL), landing façon GitHub (onglets produit, quiz jouable, logos défilants) avec la section « En direct » de l'équipe (T1), en-tête et pied de page publics, connexion et inscription, onboarding en 6 étapes, guide « Créer » qui suit le type de projet, verre façon Apple sur le guide, bulle de la visite qui reste dans l'écran, nouvelles poses de Djeli.
- Gardé de `main` : i18n, temps réel (Y8), déconnexion serveur, bandeaux « données de démonstration », déploiement Systalink dans le guide, BUG-027 (pays vide), comptes de démonstration seulement avec le serveur simulé (ADR-0016).
- API : `POST /api/v1/auth/email/register` et `/login` (module identity). Hash scrypt (N = 2^15), même réponse pour adresse inconnue et mauvais mot de passe (temps constant), 10 échecs par IP en 15 min puis 429, pseudo tiré du nom affiché (jamais de l'adresse), colonne `users.password_hash` (migration). Tests unitaires et e2e.
- La lettre d'information du pied de page renvoie vers l'inscription (le récapitulatif Y3 est réservé aux membres).
- Reste : textes de la landing, de la connexion et de l'onboarding en français seulement ; vérifier l'e-mail par un lien.
- 26/10 : audit de dépendances remis au vert (`pnpm audit --prod --audit-level high`) : `zod` ^4.6.6 (GHSA-mrhx-c7xc-m3w5), `body-parser` ^2.4.0 (GHSA-27r3-jxmh-p828) et `multer` ^2.5.0 (GHSA-q7qp-rjg7-q26m) imposés dans `pnpm-workspace.yaml`. Restent 6 failles modérées et 2 faibles, sous le seuil de la CI.

### 23/10/2026 — Récupération du travail de l'équipe, conformité des licences, dossier de soumission

- **Récupération** : `main` locale avait 31 commits de retard (#151 à #176, travail de Joachim et `Sacem270` : S5, S14, S16, X5, PR4, PR14, S10, R5, R6…). Trois PR de Joachim restaient ouvertes ; fusionnées sur `chore/finalisation` puis sur `main` : **#177** accueil public « en direct » (T1), **#178** Proof Card du Passport (PR5), **#179** carte interactive de l'Afrique (D4). Conflits de #179 résolus en gardant les deux côtés (`http-mappers.ts`, son test, `06-api.md`, suivi du CDC).
- **Correctif** `apps/web/src/i18n/index.ts` : la langue du document n'est posée que si `document` existe. Le test de la carte importait un composant traduit en environnement Node et faisait échouer la suite web.
- **Correctif de tests** : `me.e2e.spec.ts` et `passport.e2e.spec.ts` échouaient depuis le 22/10, car un compte créé après cette date n'est plus « Membre fondateur ». La date d'inscription est maintenant fixée au 10/10 dans ces tests.
- **Licences (condition de recevabilité)** : `sharp` embarque libvips sous **LGPL-3.0**, interdite par le règlement. Remplacé par **`@napi-rs/canvas`** (MIT, Skia sous BSD) dans un module partagé `apps/api/src/infrastructure/image/raster.ts` (proxy d'images des actualités en WebP, Proof Card SVG → PNG), avec ses tests. Scan `pnpm licenses` : plus aucun composant GPL, AGPL ou LGPL.
- **Dossier de soumission** `docs/soumission.md` : liste de contrôle avant l'envoi, inventaire des licences, déclaration d'usage de l'IA, déclaration de propriété à signer par chaque membre, points à trancher.
- **Documentation** : `context.md` corrigé (Datacloud = condition de recevabilité, pas « 40 % de la note » ; barème et dates officiels), README et suivi du CDC à jour (34 exigences v3 sur 37, S5 terminée).
- **Vérifié en local** (Node 24, PostgreSQL 16) : format, lint (0 erreur), types, 583 tests (API 436, core 80, web 61, contrats 6), build, **15 parcours Playwright**, `pnpm audit --prod --audit-level high`.

### 16/10/2026 — Audit des branches, correctifs, Systalink au cœur de la plateforme (A, B, C), nouveau logo

- **Demande de Sylvio** : récupérer le travail des autres branches et vérifier que tout est bien fait ; trouver comment rendre chaque utilisateur bénéfique à Systalink (« la plateforme doit fonctionner grâce à eux, leur être rentable et utile »). Puis : corriger, faire A, B, C, tenir le suivi ; héberger et déployer à la fin.
- **Audit (toutes les branches)** : `main` saine (format, lint 0 erreur, typage, 431 tests, build). Branches actives hors `main` : `feat/web-admin-audit` (#145, CI verte) et `feat/email-notifications` (chim31, sans PR). Les autres sont déjà fusionnées. **Point bloquant relevé** : le déploiement n'est pas activé (variable `DEPLOY_ENABLED` absente) ; pas d'URL de production. Sylvio : « on va héberger et déployer à la fin ».
- **Outillage local** : Node 24 + pnpm (corepack) et PostgreSQL 16 embarqué dans le dossier temporaire de Claude (pas de Docker sur la machine).
- **Correctifs** :
  - BUG-039 (nouveau) : course dans l'outil e2e `signIn` (compte neuf envoyé vers `/bienvenue`) ; corrigé (#146, et repris sur `feat/systalink`).
  - Test e-mail Y3 instable (panne SMTP simulée qui tombait sur le compte d'un autre fichier) : correctif proposé à chim31 (#147, vers sa branche).
  - BUG-027 : onboarding, choix vide « Choisis ton pays » (#148).
  - **Simulateur de réseau retiré** (décision de Sylvio : « une plateforme normale ») : plus de mode avion ni de 2G simulés ; le vrai hors ligne reste. BUG-031 rejeté, O5 écarté (#150 ; #149 fermée).
  - BUG-024 (poids de l'accueil) : laissé de côté, décision de Sylvio (« tu fais trop attention au poids »).
- **Systalink, idée A — preuve « en production »** : une salle donne l'URL de son application, qui sert un jeton (fichier `/.well-known/devhub-proof.txt` ou balise meta). Si l'adresse est dans les plages Systalink (`SYSTALINK_IP_RANGES`, `102.203.220.0/22` par défaut, **à confirmer avec Systalink**), badge « En production sur Systalink » et +10 Proof XP une fois. Le worker sonde la disponibilité toutes les 30 min. Carte « En production » dans la salle.
- **Idée B — « Déployer sur Systalink »** : bouton compté par l'API (`/go/systalink`, liste fermée de destinations avec `utm_*`) dans la salle, les templates, le guide « Créer avec l'IA » (étape déploiement, Orion pour les sites) et `/systalink`, qui affiche maintenant ce que la communauté apporte à Systalink et une vitrine des projets qui y tournent.
- **Idée C — aide Systalink** : étiquette de référence `systalink` ; page publique `/systalink/aide` (FAQ des réponses validées, questions en attente, question pré-étiquetée), liée depuis l'entraide et `/systalink`.
- **Logo** : « Dev » fin, « Hub » gras, invite `>_` (maquette de Sylvio).
- **Fusion sur `main` (demande de Sylvio)** : #145 (journal de modération, chim31), Y3 e-mails (chim31) avec le correctif #147, #146, #148, #150 et `feat/systalink`, en merges successifs. Conflits résolus (registre des anomalies, configuration, catalogue des tâches) ; test du contrat `/me` corrigé (champ `emailNotifications` de Y3). Vérifié sur bases neuves : format, lint (0 erreur), typage, 452 tests, build, 9 parcours e2e sur 9.
- **Méthode** : Sylvio ne veut plus une PR par sujet : une branche `feat/systalink`, commits et push, puis tout est ramené sur `main` à la fin.
- **Pistes suivantes (pitch, accord Systalink nécessaire)** : programme « dev partenaire » (commission sur l'hébergement des clients), crédits Systalink gagnés par les Proof XP, aperçus de PR déployés, certification pratique Systalink, badge « Équipe Systalink » sur les réponses.

### 14/10/2026 — Fusion de toutes les PR dans `main`

- **Demande de Sylvio** : « corrige les PR et fais les merges sur le main, pour toutes les PR ».
- **Pile backend #105 → #114** (ADR 0014-0019, SOS, réponses, matching, SSE, sync, salles, tâches, Passport public, Découvrir) fusionnée dans `main` par merge commits, dans l'ordre, CI verte sur chacune. #112 a été fusionnée dans `feat/rooms` (coupure réseau pendant le changement de base) ; son contenu est arrivé dans `main` via #113. L'arbre de `main` est identique à la pointe de la pile.
- **PR #97** : `main` fusionnée dans `feat/web-calm-ui`. Conflits résolus (`apps/api/README.md`, `app.module.ts`, `worker.ts`, `pnpm-lock.yaml` régénéré).
- **Module `news` porté sur la file de jobs commune** : `news.ingest` et `news.ingest-github` ajoutés au catalogue (`infrastructure/jobs/catalog.ts`, file `exclusive` et `cron`), `JobQueue.schedule()` ajouté, handlers dans `NewsJobs` (worker seulement, comme `MatchingJobs`) ; `registerNewsJobs` supprimé.
- **Migration** `20261008120000_news` renommée `20261014120000_news` pour passer après les migrations XP déjà sur `main`.
- Les branches des PR fusionnées n'ont pas été supprimées (suppression refusée par le garde-fou local).

### 08/10/2026 (nuit, fin) — Pull request vers `main`

- **Demande de Sylvio** : « fais une pull request vers main ».
- **PR #97** (`feat/web-calm-ui`) redirigée vers `main` : elle contient tout #96 (intégration, module `news`) et la refonte (systèmes de design v1 puis v2). Titre et description mis à jour, étiquettes `front`, `back`, `contrat`. Fusionnable sans conflit ; CI verte (lint, typecheck, tests, build, secrets, e2e).
- **#96** est désormais incluse dans #97 : à fermer si l'équipe relit #97 directement.
- `sylvio-frontend` poussée (commit `aa93f45`, backend Fastify) pour garder l'historique.

### 08/10/2026 (nuit, suite) — Écran d'erreur

- **Signalé par Sylvio** (capture) : « Unexpected Application Error » — le module `newsui.tsx` servi vide par Vite (cache du rechargement à chaud pris pendant une réécriture du fichier). Pas un bug du code : serveur de dev redémarré avec son cache vidé, pages revérifiées sans erreur.
- **Amélioration** : écran d'erreur de route propre (« Cette page n’a pas pu s’afficher », boutons Recharger et Accueil, détail technique seulement en développement) à la place de l'écran brut de React Router. Utile aussi en production quand une nouvelle version est déployée pendant une session.

### 08/10/2026 (nuit) — Système de design v2 : éditorial, bleu nuit / bleu roi, Liquid Glass sur les boutons

- **Demandes de Sylvio** : une critique collée (« trop de cartes, trop de violet, trop arrondi, look dashboard SaaS IA ; viser un réseau social éditorial ») ; « bleu nuit – bleu roi partout au lieu du violet » ; « jamais cette mini bande, nulle part, jamais » ; « tous les boutons en glassmorphisme (Liquid Glass d’Apple), toujours en bleu » ; « cartes trop grandes, slop » ; « on ne lit pas les trucs avec la carte comme ça » (carte sélectionnée du guide IA).
- **Système** écrit avant le code : `docs/front/design-system.md` ; décision 16.
- **Couleurs** : tokens bleu nuit / bleu roi (clair et sombre), violets en dur remplacés, icônes PWA et favicon redessinés (chevron blanc sur bleu nuit).
- **Mini bandes supprimées** : barre de progression en haut de page, liseré des extraits de code et des citations, trait devant les titres, soulignements d’onglets, filets des fils de commentaires et du guide, tiret du logo ; code mort des « coins inversés » retiré.
- **Liquid Glass** : classes `.lg-tint`, `.lg-clear`, `.lg-ghost` ; composant Bouton, pastilles, onglets, barre latérale, actions du fil ; replis d’accessibilité (transparence réduite, contraste élevé, mouvement réduit).
- **Formes** : rayons plafonnés à 12 px dans tout le code (capsules et avatars exceptés) ; boutons en capsule ; police Inter + JetBrains Mono ; logo `devhub` en monospace.
- **Navigation** : trois groupes (l’essentiel : Accueil, Entraide, Communautés, Emplois · Explorer · Créer) ; Classement accessible depuis Développeurs et Ctrl K.
- **Accueil** : fil sans cartes, favicon réel des sources, actions Discuter (formulaire prérempli) · Enregistrer · Partager, recherche par sujet (`/?q=`), rail Tendances (comptées sur les vrais titres) · Ça discute (Hacker News) · Emplois.
- **Chiffres clés** compacts partout ; **guide IA** : sélection lisible.
- **Vérifié** : captures accueil, emplois, classement, guide, connexion ; aucune erreur JS ; typecheck, lint, build.
- **Pas encore vérifié** : thème sombre ; les autres écrans gardent des blocs teintés (à revoir écran par écran avec le système).

### 08/10/2026 (soir) — Barre latérale retravaillée

- **Demande de Sylvio** (capture de la barre) : « améliore la barre latérale » (skills ui-ux-pro-max et ui-styling).
- **Constat** : 17 entrées sans repère, liste coupée net en bas (« Classement » tronqué), trois lignes en pied (Notifications, Paramètres, Se déconnecter), bouton « + » blanc qui attire l’œil plus que tout le reste.
- **Fait** (`components/shell/AppShell.tsx`) :
  - quatre groupes titrés : (cœur) Accueil, Entraide, Communautés · **Services** · **Créer** · **Réseau** ; « Mon profil » passe dans la carte compte ;
  - cloche des notifications à côté du logo (pastille rouge, libellé accessible avec le nombre de non lues) ;
  - recherche plus discrète, bouton « + » lavande au lieu de blanc ;
  - la liste défile avec un fondu en haut et en bas au lieu d’une coupe nette ;
  - pied : **une seule carte compte** (avatar, nom, @pseudo), dont le menu porte profil, réglages, thème, langue, visite, comptes démo et déconnexion ;
  - encart « Bloqué sur un bug ? » en dégradé (façon Retail-X), affiché seulement à partir de 1 000 px de hauteur pour ne jamais cacher la navigation ;
  - anneaux de focus visibles ; entrées de 44 px dans le tiroir mobile.
- **Vérifié** : captures 1440×900, 1440×760, 1920×1080, tiroir 390 px ; menu du compte complet ; aucune erreur JS ; typecheck.

### 08/10/2026 (après-midi) — Fil façon Facebook, landing et connexion épurées, matière « Retail-X »

- **Demandes de Sylvio** : (1) avec une capture du tableau de bord « Retail-X » : « garde le design actuel de ma plateforme, mais utilise les polices, espacements et textures de cette image ; ma plateforme est trop plate ; aménage la landing page, les écrans de connexion et d’inscription ; je veux que ma plateforme soit la plus pro » ; (2) avec une capture de l’accueil : « un fil d’actualité style Facebook (pas les likes, réactions et autres) ; tel que c’est, c’est trop mélangé, farfelu, chargé ; pareil pour la landing et la connexion ; tu balances beaucoup trop d’infos en même temps ».
- **Branche** `feat/web-calm-ui`, partie de `feat/web-platform` (PR #96).
- **Accueil** réécrit (`pages/Feed.tsx`) : fil unique en une colonne, publication au format unique (source, titre, extrait, image, Lire · Enregistrer · Partager), sans réactions, cinq onglets, défilement infini, carte « En bref » à droite. Barre « Quoi de neuf ? » avec « Je suis bloqué » et « Partager un projet ».
- **Landing** réécrite : promesse, un vrai article en aperçu, deux boutons, trois idées, appel final. En-tête public : trois liens, « Se connecter », « Créer un compte » ; langue et thème déplacés dans le pied de page.
- **Connexion / inscription** : nouvelle route `/inscription` ; un titre, une phrase, GitHub, « Visiter sans compte », « Autres méthodes » replié ; plus d’en-tête public sur ces écrans.
- **Matière « Retail-X »** (tokens, donc toutes les pages) : Plus Jakarta Sans, fond gris clair, cartes blanches à ombre douce, ardoise texturée pour les surfaces sombres, dégradé lavande → bleu, trait d’accent devant les titres, titres de page plus petits, barre latérale allégée. Détails : `docs/front/decisions.md` §15.
- **Vérifié** : captures 1440 et 390 px (landing, connexion, inscription, accueil, emplois, entraide, profil), aucune erreur JS ; format, lint (0 erreur), typecheck, build.
- **Pas encore vérifié** : le thème sombre avec les nouveaux tokens.

### 08/10/2026 — Intégration à `main` : front dans le monorepo, actualités dans l’API NestJS

- **Demande de Sylvio** : « parcours le projet, lis le suivi et ce qui est sur le main, fais une pull request de ce que j’ai fait vers le main » ; puis « adapte ce qu’on a fait à ce qui est sur le main, pour que ce qui est sur le main fonctionne maintenant avec ce que j’ai fait ».
- **Constat** : `main` est devenu un monorepo pnpm + Turborepo (Caleb) : API NestJS + Prisma 7 + pg-boss (`apps/api`), connexion GitHub déjà fusionnée (PR #95), emplacement `apps/web` réservé au front, CI (Prettier, lint, typecheck, tests, build, gitleaks, audit). `sylvio-frontend` n’avait **aucun historique commun** avec `main` (GitHub refuse la PR) et le commit `aa93f45` n’était pas poussé.
- **Branche** `feat/web-platform` créée depuis `main` (dans un second dossier de travail, `../CADEV-saiyens-web`, pour ne pas toucher à `sylvio-frontend`).
- **Front → `apps/web`** (`@devhub/web`) : scripts `dev`, `build`, `lint`, `typecheck` ; dépendances dans le lockfile pnpm ; formaté au Prettier du dépôt (points-virgules, 100 colonnes).
  - Connexion : `/api/v1/auth/github?returnTo=…` (retour sur `/connexion?oauth=ok`), `/api/v1/me`, déconnexion `POST /api/v1/auth/logout` avec `X-DevHub-Client: web` (nouveau `src/platform/auth.ts`). GitLab et Google affichés « bientôt ».
  - Actualités : `/api/v1/news/*`, `/api/v1/videos`, `/api/v1/img` ; cache PWA et proxy Vite (port 3000) mis à jour ; avatars DEV passés par le proxy d’images (CSP `img-src 'self'`).
- **Backend Fastify → module NestJS `news`** (`apps/api/src/modules/news`, architecture hexagonale comme `identity`) :
  - tables Prisma `news_items`, `news_ingest_runs` + migration `20261008120000_news` ;
  - collecte par le worker pg-boss : `news.ingest` toutes les 15 min, `news.ingest-github` toutes les heures, une passe au démarrage ; commande `pnpm --filter @devhub/api news:ingest` ;
  - proxy d’images avec anti-SSRF revérifié à chaque redirection ; variable `NEWS_IMAGE_CACHE_DIR` ;
  - 27 tests (texte, diversité du fil, anti-SSRF, collecte, routes HTTP).
- **Infra** : CSP (`infra/Caddyfile`, mode rapport) complétée par `frame-src https://www.youtube-nocookie.com` pour la lecture des vidéos.
- **Docs** : `docs/front/` (décisions, analyse, brief, inspirations), index `docs/README.md`, contrat d’API (06), jobs (07), modèle de données (05), READMEs `apps/web` et `apps/api`.
- **Vérifié** (Node 24, PostgreSQL embarqué PGlite faute de Docker) : migrations appliquées ; collecte réelle 72/72 sources, ~900 éléments ; routes de l’API ; navigateur : accueil public avec les vrais chiffres, connexion GitHub (faux fournisseur) → `/me` 200 → onboarding → déconnexion 204 → `/me` 401, vidéos, sources, aucune erreur JS ; CI locale (voir la PR).

### 07/10/2026 — Backend : vraies données, vraies connexions, accueil rempli

- **Demande de Sylvio** : « commit, push, attaque ces pages ; entame le backend, importe de vraies données, fais de vraies connexions ; un accueil rempli d’infos (vidéos, actu IA, tech, Apple, Samsung, Google…) ; propose et fais des améliorations ».
- **Git** : commit `f04c1d0` (plateforme multi-services + charte Drivery). **Push bloqué** : la clé SSH `~/.ssh/Sylvio-github` est protégée par une phrase de passe et aucun agent SSH ne tourne dans la session de Claude. À pousser depuis un terminal : `git push origin sylvio-frontend`.
- **Backend créé (`backend/`)** : Fastify + TypeScript, **PGlite** en local (PostgreSQL embarqué, rien à installer) et **PostgreSQL** en production via `DATABASE_URL` (même SQL, migrations versionnées).
  - **Collecte réelle toutes les 15 min** : 34 flux RSS vérifiés (OpenAI, Google AI, DeepMind, Hugging Face, The Verge, TechCrunch, Ars Technica, Wired, Engadget, 9to5Mac, MacRumors, Apple Newsroom, 9to5Google, Android Authority, SamMobile, Samsung Newsroom, Frandroid, Numerama, 01net, Korben, GitHub Blog, Cloudflare, TechCabal…), **34 chaînes YouTube** (identifiants résolus en direct : Fireship, Theo, ThePrimeTime, MKBHD, Anthropic, OpenAI, Grafikart, Micode, Underscore_…), Hacker News, DEV Community, dépôts GitHub de la semaine, **radar des versions** de 24 projets (React, Next.js, Node, Vite, Flutter, Claude Code, Codex…). Première collecte : 72/72 sources, ~900 éléments en 20 s.
  - Nettoyage : dédoublonnage par lien et par sujet, « bons plans » commerciaux écartés, purge à 45 jours.
  - **Proxy d’images** : redimensionnement WebP + cache disque (18 Ko au lieu de 240 Ko), anti-SSRF ; réponses compressées (accueil 95 Ko → 27 Ko).
  - **OAuth réel GitHub, GitLab, Google** : `state` à usage unique, échange côté serveur, comptes et sessions en base, cookie HttpOnly. **À activer** en créant les applications OAuth (voir `backend/.env.example`).
  - Déploiement : `backend/Dockerfile`, `docker-compose.yml` (PostgreSQL + API + Caddy HTTPS), `deploy/Caddyfile`, `backend/README.md`.
- **Front branché sur l’API** (proxy Vite `/api`) :
  - **Accueil rempli** : à la une (5 histoires, sources variées), indicateurs personnels, **Actualités** par rubrique (IA, Tech, Apple, Google, Samsung, Mobile, Dev, Cloud, Afrique) et par langue (FR/EN), pagination, **vidéos du moment**, **top Hacker News**, **dépôts GitHub de la semaine**, **nouvelles versions**, **articles DEV**, puis la communauté DevHub.
  - **Vidéos** : vraies vidéos YouTube filtrables, **lecture intégrée** (youtube-nocookie, chargée au clic) ; les vidéos de démo restent dans « Créateurs DevHub ».
  - **Page Sources** (transparence) ; **Ctrl+K cherche aussi dans l’actu réelle** ; lecture hors ligne de la dernière actu (cache appareil + service worker).
  - **Connexion refaite** (charte Drivery) : GitHub / GitLab / Google, retour OAuth géré, repli honnête (import du profil public) tant que les clés ne sont pas posées ; panneau noir avec les vrais titres du moment.
  - **Accueil public refait** : accroche, chiffres réels, vraie actu à la une, vidéos, les 9 services, appel final ; en-tête et pied de page publics alignés.
  - **Question** : bandeau « résolue » et réponses alignés sur la charte. **Salle de projet** : déjà conforme.
- **Vérifié** : builds front et back, captures, parcours de bout en bout (accueil public, connexion, actualités, filtre Apple, lecture vidéo, recherche Ctrl+K, sources) : tout passe, aucune erreur JS.

### 06/10/2026 (nuit) — Charte « Drivery » sur toute la plateforme

- **Demande de Sylvio** — d'abord : « juste des couleurs et une grosse police, trop vibe codé » (skills apple-design et apple-design-hig) ; puis, avec une capture du design « Drivery » : « polices, design, textes, tailles, formes, couleurs : copie exactement ceci, mes pages avec leur contenu mais avec ce design ».
- **Étape 1 (skills Apple)** : police **Inter** avec tailles optiques ; graisses limitées ; **logos officiels** (Simple Icons) pour les technos, éditeurs de certifications, outils IA (Claude, Cursor, Google/Antigravity ; icône terminal pour Codex) ; badges de certification dessinés ; vignettes vidéo en vraie capture d'éditeur avec le code du sujet ; tendances et événements dans le fil ; profil refait façon GitHub.
- **Étape 2 (charte Drivery, copiée)** :
  - **Thème clair par défaut** : fond blanc, cartes gris clair `#f3f3f5` sans bordure, coins de 20 px ; le sombre reste disponible dans le menu du compte.
  - **Barre latérale noire flottante** (coins de 28 px) : logo, recherche + bouton « + Créer », entrées en pilules anthracite, **entrée active lavande `#8d6cf0`**, **badges rouges** ; en bas : Notifications, Paramètres, Se déconnecter.
  - **Titres de page géants** (42 px, gras, approche serrée) avec actions en pilules à droite ; boutons en pilules (principal noir, secondaire blanc bordé) ; onglets en pilules noir / gris.
  - **Cartes d'indicateurs** : la première noire avec une courbe blanche, les autres grises avec un **cube 3D coloré** (orange, violet, vert), libellés en minuscules, chiffre gras, note verte. Calculées sur les vraies données du compte (Proof XP de la semaine, questions, candidatures, badges).
  - **Rangées de liste façon « Drivers »** (chevron, avatar, nom gras, chiffre gras + mot gris, menu « … ») : appliquées au **Classement**.
  - Appliqué à : Accueil, Classement, Profil (indicateurs + onglets), toutes les pages de services, Découvrir, Entraide, Projets (en-têtes, champs, filtres) ; barre d'onglets mobile noire flottante.
- **Vérifié** : typecheck, build, captures 1600 / 390 px, parcours de bout en bout (publier, postuler, certification, indicateurs mis à jour, guide, menu du compte) : tout passe, aucune erreur JS.

### 06/10/2026 (soir) — Pivot : plateforme écosystème multi-services

- **Décision de Sylvio** — « Oublie le cahier des charges. Fais exactement la plateforme que je décris. Je ne veux pas un Discord, mais une vraie plateforme écosystème avec multi services. Inspire-toi de Reddit, YouTube et GitHub. » Le CDC v3 n'est plus le périmètre de référence du front (voir `docs/decisions.md` §11). **À signaler à l'équipe, surtout au rôle 2 (back-end)** : les nouveaux services n'ont pas encore d'API.
- **Shell refait (YouTube / GitHub)** : barre du haut avec logo, grande recherche centrale (Ctrl+K), bouton « Créer » (post, je suis bloqué, offre d'emploi, projet, guide IA), notifications, profil ; menu latéral par services (Accueil, Entraide, Communautés · Services · Réseau · Mes communautés · Plateforme), mini-menu replié, tiroir et onglets sur mobile. Le rail façon Discord est supprimé.
- **Nouveaux services (12 écrans)**, avec données de démonstration marquées « démo » et état personnel gardé sur l'appareil (`src/platform/`) :
  - **Accueil = fil façon Reddit** : actu IA & tech (rédaction), lancements, open source, discussions, emplois ; votes, tri populaire/récent, enregistrement, partage ; colonne « services DevHub », offres pour toi, communautés, vidéos.
  - **Post** avec fil de commentaires imbriqués ; **Publier** (type, communauté, lien, dépôt GitHub, étiquettes).
  - **Communautés** : annuaire et page de communauté (bannière, fil, règles, rejoindre).
  - **Emplois** : recherche poste + lieu, filtres, liste et détail côte à côte, « compétences prouvées » comparées au score du profil, candidature avec le profil ; **Publier une offre** (espace entreprise, compétences à prouver).
  - **Certifications** : gratuites DevHub avec examen en ligne, correction et badge ; payantes (éditeurs, prix indicatifs) ; **base de données** filtrable ; mes badges.
  - **Skills & plugins IA** : skills, plugins, serveurs MCP, règles et prompts pour Claude Code, Codex, Antigravity, Cursor ; filtres, fiche avec fichiers et commande d'installation par outil.
  - **Vidéos façon YouTube** : grille, catégories, abonnements, page de lecture (chapitres, j'aime, à suivre). Vignettes composées en CSS ; lecteur en aperçu (aucune vidéo hébergée).
  - **Apprendre** : 6 parcours, page de parcours avec progression, leçons (cours, code, quiz), lien vers la certification.
  - **Créer une app avec l'IA** : guide complet en 11 étapes, choix du type de projet (web, site, mobile, agent IA), pour chaque étape : objectif, actions, **points d'attention classés critique / important / conseil**, prompts à copier, checklist de sortie, ressources ; progression sauvegardée.
  - **Templates** : 10 bases de projets avec maquette, stack, commande de démarrage, lien vers le guide.
- Palette Ctrl+K étendue (posts, offres, skills, vidéos, parcours, certifications) ; textes de la visite guidée mis à jour ; ancien QG supprimé (remplacé par le fil).
- **Vérifié** : typecheck, build de production, captures 1600 / 375 px en sombre et clair, parcours de bout en bout (publier + commenter, postuler, réussir une certification, valider une étape du guide et la retrouver après rechargement, quiz de leçon) : tout passe, aucune erreur JS.
- **Limites connues** : nouveaux écrans en français seulement (pas encore d'anglais) ; données de démo locales en attendant l'API ; les écrans existants (entraide, projets, profil) n'ont pas encore été redessinés dans le nouveau style.

### 06/10/2026

- **Design (refonte 2, étape 1 sur 2)** — Retour de Sylvio, avec des captures de Discord à côté des nôtres : « ce que tu as fait est plat et ultra basique », « ai slop ». Diagnostic : la police Inter était déclarée mais jamais chargée, donc l'app s'affichait en police système (Segoe UI) ; des cartes dans des cartes, des pastilles d'icônes colorées, une bannière 3D en dégradé, des ombres et de l'aurore là où Discord n'utilise que des paliers de gris. La « matière » ajoutée le matin même allait dans le mauvais sens. Fait :
  - Police **Figtree** auto-hébergée (20 Ko, proche de gg sans de Discord).
  - Nouveaux tokens : gris neutres en paliers (rail, colonne, contenu, surfaces), plus d'aurore, de grain, de dégradés ni de liserés lumineux ; rayons resserrés (6 / 10 / 14 px) ; boutons en aplat ; onglets façon Discord ; badge rouge à texte blanc ; étiquette « DÉMO » façon tag « BOT » de Discord.
  - Shell : rail à icônes de 48 px avec indicateur blanc et badges découpés ; colonne de salons à bannière pleine largeur, catégories repliables, salons en lignes sobres avec marque « non lu » ; panneau utilisateur flottant à cheval sur le rail et la colonne (il ouvre le menu du compte) ; en-tête de salon (icône, nom, sujet, réseau, notifications, recherche Ctrl+K, « Je suis bloqué »).
  - SOS Dev en salon forum : questions en posts (auteur, titre, extrait d'erreur en bloc liseré, étiquettes, réponses).
  - QG : barre de saisie « Bloqué sur un bug ? » à la place de la bannière 3D ; colonne de droite façon Discord avec carte de profil (Proof XP, rang, compétence) puis la liste des membres.
  - Vérifié en captures (375, 1440, 1600 px, sombre et clair). Typecheck OK.
  - **Étape 2 (à faire après validation de Sylvio)** : appliquer le même langage aux 15 autres écrans (salle, Passport, Découvrir, question, projets, classement, réglages, accueil public, connexion, onboarding…).

- **Fix** — Interface en anglais chez Sylvio : son navigateur annonçait l'anglais. Le **français est désormais la langue par défaut** ; l'anglais reste disponible dans le menu, Ctrl+K et les réglages.
- **Design (refonte, en cours)** — Retour de Sylvio : « design plat ». Skills utilisés : ui-ux-pro-max, emil-design-eng, apple-design ; inspiration 21st.dev. Fait :
  - 20 avatars 3D illustrés (un par compte démo) + avatar de Djeli pour l'admin, 6 bannières de salles et 1 bannière de communauté (Higgsfield), en WebP dans `public/` (mis en cache à la première vue, jamais préchargés).
  - Colonne façon Discord : bannière d'espace (communauté ou salle), icônes colorées par section, « Mes stacks » en salons `#`, membres de la salle, panneau utilisateur en bas (statut, thème, réglages, « Je suis bloqué »).
  - Rail : les salles s'affichent avec leur bannière.
  - QG : liste des membres par disponibilité en 4e colonne (≥ 1440 px), visages des devs disponibles dans la bannière ; page publique : mur de la communauté.
  - Matière : lumière d'ambiance (aurore) + grain, cartes en relief avec liseré lumineux, survol en relief (souris seulement), verre dépoli, courbes d'animation fortes, curseur main sur tous les éléments cliquables.
  - Salle : grande bannière de couverture avec icône qui la chevauche ; Passport : bandeau de profil avec avatar de 112 px (comme un profil Discord).
  - Palette Ctrl+K sans animation d'ouverture (action fréquente, au clavier) ; sonner chargé à la demande.
  - Liste des membres du QG affichée à partir de 1600 px (elle comprimait le contenu à 1440).
  - Vérifié en captures (375, 1440, 1920 px, sombre et clair) ; parcours de démo de bout en bout : 13/13 étapes OK, aucune erreur.
  - Poids de l'accueil : 312 Ko en mode local, dont 26 Ko de serveur local de démo qui disparaîtront avec la vraie API (≈ 290 Ko attendus).
- **Git** — Premier commit sur `sylvio-frontend` (front complet, docs, CDC, images d'inspiration) et push vers `origin` avec la clé `~/.ssh/Sylvio-github`.
- **Setup** — Fichiers Windows `*:Zone.Identifier` supprimés ; `.gitignore` racine ajouté pour les ignorer à l'avenir.
- **Dev** — Plateforme lancée en local : `npm run dev` dans `frontend/` → http://localhost:5173
- **Docs** — `frontend/README.md` : lancement, bascule vers la vraie API (`VITE_API_URL`), architecture, règles d'équipe, raccourcis.
- **Qualité** — `tsc` OK, build OK, oxlint : 0 erreur, 26 avertissements React notés en dette technique.
- **Design** — Thème clair : vert, orangé et rouge de statut foncés pour passer AA (≥ 4,8:1 sur toutes les surfaces).
- **Design** — Mobile : le bouton du panneau contextuel devient une pastille flottante au-dessus des onglets (il écrasait l'en-tête des salles) ; identité du Passport empilée sur mobile ; visuel 3D ajouté au panneau de marque de la connexion.
- **Fix** — Une action déjà reçue par le serveur mais encore en file (page quittée pendant l'envoi) s'affichait deux fois jusqu'à la synchro : masquée désormais par comparaison du `client_id`.
- **Test** — Parcours de démo automatisé (Playwright) : connexion démo → question avec trace d'erreur (étiquettes détectées, jeton GitHub masqué) → piste → 3 devs sollicités avec raisons → bascule sur Moussa → « Je m'en occupe » → réponse → coupure réseau → réponse en file → rechargement (toujours là) → « Rétablir » → synchronisée sans doublon → retour Awa → « M'a débloqué » → +10 XP dans le Passport de Moussa → création de salle avec vérification réelle du dépôt `vitejs/vite` sur GitHub. Aucune erreur JS.
- **Perf** — Accueil mesuré à 443 Ko, puis ramené à **295 Ko** : shells, dialogues et serveur local en chargement différé, anglais à la demande, Motion chargé au premier composant animé, images de Djeli en lazy, visuel hero en 2 tailles (17 / 34 Ko), polices système.
- **Front** — Historique de démo enrichi (22 questions résolues sur 6 mois) pour donner du relief aux Passports, heatmaps et au classement ; dates d'inscription des comptes démo corrigées (le garde-fou « compte < 24 h » bloquait les votes anciens).
- **Front** — Visite guidée lancée automatiquement à la première arrivée sur le QG (y compris après rechargement), relançable depuis le menu, Ctrl+K et Réglages.
- **Front** — 17 écrans livrés et vérifiés en captures (375 et 1440 px, sombre et clair) : la page publique « en direct » (T1) avec essai sans compte (T2) ; la connexion GitHub, qui lit le vrai profil public et calcule les compétences selon la règle X3 ; l'onboarding en 5 étapes (PR1, T3, PR10, M3) ; le QG, dont les blocs se réordonnent selon l'intention ; SOS Dev ; la question, avec piste, devs sollicités et leurs raisons, « Je m'en occupe », pair programming, validation et célébration ; la salle, avec Kanban, PR vérifiée sur GitHub, discussion, point du jour relié à SOS et demandes ; le Passport, avec barre G+P, preuves, heatmap et badge README ; Découvrir, Classement, Systalink (mesures réelles), Impact, Règles, Modération, Réglages et 404.
- **Front** — Shell façon Discord et signature de l'image 04 : coins inversés qui fusionnent l'item actif avec le panneau, en sombre comme en clair.
- **Fix** — Codes d'erreur à point (`vote.self`) mal lus par i18next : clés normalisées (`vote_self`) et conversion centralisée (`errorKey`).
- **Fix** — Vite 8 (rolldown) refusait `manualChunks` : option retirée, le découpage automatique suffit.
- **Fix** — L'icône GitHub n'existe plus dans lucide-react 1.x : icône SVG maison (`src/components/icons.tsx`).
- **Front** — Couche hors ligne : `src/offline/network.ts` (état réseau réel + simulateur O5 `?net=offline|2g`, file IndexedDB avec UUID, rejeu ordonné, reprise progressive, masquage des secrets O9 avant mise en file).
- **Front** — Textes FR/EN complets (`src/i18n/fr.ts`, `en.ts`), typés : une clé manquante en anglais casse la compilation (I1).
- **Front** — Couche de données : contrat `src/services/api.ts` calqué sur l'API du CDC §8, implémentation `local` (IndexedDB) et `http` (vraie API avec `Idempotency-Key`, activée par `VITE_API_URL`). Cache « stale-while-revalidate » maison (`src/lib/query.ts`).
- **Front** — Moteur du serveur local (`src/services/local/engine.ts`) : barème Proof XP, plafond de 60 XP/jour, votes, validations par paire, matching pondéré + démarrage à froid (X4), escalade à 15 min, « Je m'en occupe », tâches, PR, modération avec annulation append-only. Il sert aussi de spécification exécutable pour le rôle 2.
- **Front** — Données de démo (`seed.ts`) : 20 devs de 14 pays, 16 vraies questions techniques (nginx/Docker, Kkiapay, Prisma/Wave, Firestore…), 6 salles de projet. Tout est marqué « Démo » et les XP sont recalculés par le moteur.
- **Front** — Vraies intégrations GitHub (API publique) : import du profil + compétences depuis les dépôts (règle X3), vérification du dépôt d'une salle (R1), vérification qu'une PR est fusionnée par le bon auteur (R9).
- **Front** — Détection locale (`src/lib/detect.ts`) : étiquettes depuis l'erreur (S9), masquage des secrets (O9), jauge de qualité (S8), piste automatique par motifs d'erreurs connues, toujours étiquetée comme telle.
- **Design** — Tokens CSS sombre + clair (`src/styles/globals.css`) avec les corrections de contraste AA ; police Inter variable auto-hébergée (48 Ko).
- **Design** — Assets optimisés : 4 poses de Djeli en WebP (13-18 Ko), visuel hero (34 Ko), icônes PWA, favicon.
- **Design** — Mascotte Djeli générée avec Higgsfield (`gpt_image_2_5`, fond transparent) : 4 poses validées + visuel 3D du hero (réseau de formes violettes et bleues). ~12 crédits utilisés.
- **Setup** — `frontend/` créé avec Vite (React + TS) ; installés : react-router 8, zustand, motion, lucide-react, sonner, cmdk, i18next, idb, prism-react-renderer, react-markdown, rehype-sanitize, zod, react-hook-form, Radix, Tailwind v4, vite-plugin-pwa, Playwright.
- **Décision** — Kotlin Multiplatform étudié à la demande de Sylvio, puis écarté (voir `docs/decisions.md` §2).
- **Décision** — Rédaction de `docs/decisions.md` : ambition « plateforme incontournable », périmètre v3.1, mascotte, règles de navigation, architecture.
- **Échange** — Sylvio confirme : rôle 3 (front + hors ligne), page publique sans compte, mascotte 3D pour la visite, navigation très fluide. Il délègue toutes les décisions.
- **Analyse** — Phase 0 terminée : `docs/phase0-analyse.md` (écarts prompt/CDC, 21 P0 ordonnées selon le chemin critique, P1, P2, propositions v3.1, 16 écrans reliés aux fonctionnalités, 5 parcours, stack, contrastes, 4 questions bloquantes). Aucun code écrit.
- **Analyse** — 10 écarts relevés entre le prompt de design et le CDC (Discord, localStorage, mocks vs données réelles, Ctrl+K, poids/polices, i18n, hors ligne, thème, bento « Upgrade »/Gantt, contrastes). Le CDC l'emporte.
- **Design** — Contrastes vérifiés : 4 échecs AA (`--text-subtle` sur les surfaces, texte blanc sur pilule `--accent`, `--accent` en texte sur surface-2/3, texte blanc sur pastille corail). Corrections proposées.
- **Docs** — Le prompt de design cité plus bas n'existait pas sur le disque : enregistré dans `docs/prompts/prompt-frontend-design.md`.
- **Design** — Ajout de `docs/design/inspirations/04b-sidebar-coins-inverses.png` (6e image envoyée, détail des coins inversés de la sidebar).
- **Setup** — Lecture des PDF : texte extrait avec PyMuPDF (poppler absent de la machine).
- **Design** — Rédaction du prompt de design/UX pour Claude : `docs/prompts/prompt-frontend-design.md` (structure Discord, palette bleu nuit violacé, responsive, skills et MCP à utiliser, phases avec points de validation).
- **Design** — Ajout de 5 images d'inspiration dans `docs/design/inspirations/` (dashboard Unity, bento Sapphire, navigation segmentée, sidebar repliable, fil d'activité).
- **Setup** — Branche `sylvio-frontend` créée depuis `main`. Le dépôt était vide (aucun commit).
- **Setup** — Création de `SUIVI.md` (ce fichier) pour tracer toutes les actions du projet.
- **Note** — L'accès au dépôt distant `origin` échoue (`Permission denied (publickey)`) : la clé SSH GitHub n'est pas configurée sur cette machine. À régler avant de pousser.
