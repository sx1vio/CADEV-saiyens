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
| Démo / pitch                                                                    | ⏳ Pas commencé                                                                                                                                                                                                      |

---

## Reste à faire

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
