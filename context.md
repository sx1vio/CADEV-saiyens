# Contexte du projet DevHub Africa

> **Source de vérité partagée** de tous les intervenants (humains et agents IA). À lire au début de chaque session de travail, à mettre à jour avant de clôturer une action (nouvelle fonctionnalité, décision, pivot, correction majeure).
>
> Dernière mise à jour : **14 octobre 2026** (jour du Jalon 2), par Joachim GOEH-AKUE.

## Sommaire

1. [Objectif](#1-objectif)
2. [Périmètre](#2-périmètre)
3. [État actuel](#3-état-actuel)
4. [Décisions techniques et fonctionnelles](#4-décisions-techniques-et-fonctionnelles)
5. [Contraintes](#5-contraintes)
6. [Intervenants et responsabilités](#6-intervenants-et-responsabilités)
7. [Points d'attention et risques ouverts](#7-points-dattention-et-risques-ouverts)
8. [Carte de la documentation](#8-carte-de-la-documentation)
9. [Historique](#9-historique)

## 1. Objectif

**DevHub Africa** (nom de travail) est la plateforme des développeurs fondée sur la preuve, construite par l'équipe **CADEV-saiyens** pour le **Systalink Challenge, Coupe d'Afrique des Développeurs 2026**.

> GitHub montre ce que tu as construit. DevHub Africa montre ce que tu sais faire, parce que tu l'as **prouvé** en aidant d'autres développeurs et en construisant avec eux, même avec une connexion instable.

| Pilier                            | Ce que fait le développeur                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **SOS Dev** (aider)               | Pose une question, reçoit une piste IA en moins de 10 s, puis l'aide d'un pair       |
| **Salles de projet** (construire) | Ouvre une salle liée à son dépôt GitHub, publie des tâches, d'autres contribuent     |
| **Developer Passport** (prouver)  | Chaque action utile alimente une page publique où chaque score renvoie à ses preuves |

Différenciateurs : **hors ligne d'abord** (on coupe le Wi-Fi pendant la démo) et **hébergement Systalink visible** (40 % de la note finale).

## 2. Périmètre

Référence : [cahier des charges v3](docs/Cahier_des_charges_v3_DevHub_Africa.pdf) (§3 et §5). Les ajouts proposés dans la [v3.1](docs/CDC_v3.1_DevHub_Africa_Propositions.pdf) sont **à trier en équipe** (revues du périmètre des 9 et 15 octobre, gel des P2 le 15).

| Inclus dans le MVP                                                        | Exclu (roadmap, à présenter sans coder)                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Connexion GitHub (P0), GitLab et Google (P1)                              | Offres d'emploi, recrutement par preuves                   |
| Profil rempli depuis GitHub, Developer Passport public                    | Challenges « Verified Skill », certifications              |
| SOS Dev : question, piste IA, matching, réponses, validation              | Fil d'actualité « Dev Pulse »                              |
| Salles de projet : tâches, membres, dépôt lié, invitation riche           | Stack Spaces et chat temps réel, Dev Media                 |
| Proof XP, scores par compétence, « Voir les preuves »                     | Parcours d'apprentissage, assistant de création d'app      |
| Découverte de devs et de projets, classement par pays                     | Hub de skills pour agents IA, application mobile native    |
| Hors ligne avec synchronisation ; écrans Systalink et impact ; modération | Recherche sémantique (P2, seulement si le temps le permet) |

**Règle d'arbitrage** : on réduit une fonctionnalité avant d'en ajouter une autre. Le rôle 1 (Caleb) a le dernier mot sur le périmètre.

## 3. État actuel

Détail exigence par exigence : [suivi du cahier des charges](docs/suivi/suivi-cahier-des-charges.md). Bugs et écarts : [registre des anomalies](docs/suivi/anomalies.md).

### Fait (fusionné sur `main`)

| Élément                                                                                                                       | Référence          |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Monorepo pnpm + Turborepo, commitlint, Prettier, Husky                                                                        | ADR-0001           |
| Architecture complète documentée, 13 ADR proposés, guides d'équipe                                                            | `docs/`            |
| CI GitHub Actions (format, typecheck, tests, build, sécurité), Docker Compose, Caddy, scripts de déploiement et de sauvegarde | ADR-0011, `infra/` |
| API NestJS 11 + worker pg-boss, Prisma 7, migration initiale, 52 étiquettes de référence                                      | PR #94, issue #3   |
| **A1** Connexion GitHub, sessions par cookie, `GET /me`, chiffrement du jeton GitHub                                          | PR #95, issue #14  |
| **PR11, M3** Signaux de confiance, acceptation du code de conduite                                                            | PR #98             |
| **PR1, X3** Import du profil GitHub, compétences proposées, score G résistant aux dépôts vides (BUG-010 corrigé)              | PR #99             |
| **#5** Paquets `@devhub/core` (scores, barème XP, `maskSecrets`) et `@devhub/contracts`                                       | PR #101            |
| **X1, X2** Proof XP : `AwardXp`, garde-fous, journal public `GET /u/:handle/proofs`, barème `GET /rules/xp`                   | PR #102            |
| **S2, M2** Module `ai` : piste IA, quota, cache, protection contre l'injection                                                | PR #104            |
| Outillage : ESLint actif avec frontières d'architecture, hooks Git, Node 24 imposé ### En cours (PR ouvertes)                 |

| PR   | Contenu                                                                                                                              | Auteur  | Exigences                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------- |
| #105 | ADR 0001 à 0013 acceptés, ADR 0014 à 0019 (XP, base, périmètre du MVP, tri v3.1, pile front, gouvernance)                            | Caleb   | #1                                    |
| (S1) | Module `sos` : `POST /questions` idempotent, liste et fiche publiques, recherche plein texte ; service d'idempotence partagé         | Joachim | S1, S2 (déclenchement), O2 (côté API) |
| #97  | `apps/web` (PWA de Sylvio) : à retravailler selon l'ADR-0016 (navigation du MVP, pas de `news`, mode local réservé au développement) | Sylvio  | I1, O1-O3                             |

### Plan jusqu'au gel du 22 octobre

Mandat du 14 octobre : Joachim avance **toutes** les tâches restantes (les siennes et celles de l'équipe), une PR par fonctionnalité, dans l'ordre du parcours de démo.

| Ordre | Lot                                                               | Exigences          | Statut                  |
| ----- | ----------------------------------------------------------------- | ------------------ | ----------------------- |
| 1     | Poser une question, idempotence                                   | S1, O2 (API)       | PR #106                 |
| 2     | Répondre, voter, valider (+ XP), notifications dans l'application | S4                 | PR #107                 |
| 3     | Matching et notifications dans l'application                      | S3, X4             | PR #108                 |
| 3b    | Temps réel SSE (notifications et pages de question)               | Y8                 | PR #109                 |
| 4     | Synchronisation hors ligne `POST /sync`                           | O2                 | PR #110                 |
| 5     | Salles de projet : créer, rejoindre, tâches, PR vérifiée          | R1, R2, R3, R8, R9 | PR #111, #112           |
| 6     | Passport public et preuves                                        | PR2, PR3           | PR #113                 |
| 7     | Découverte et classement                                          | D1, D2             | En cours                |
| 8     | Écrans Systalink et impact, modération                            | Y1, Y2, M1         | À faire                 |
| 9     | Front : intégration des écrans du MVP sur l'API réelle            | I1, O1-O4          | À faire (dépend de #97) |

Bloquants hors code, qui demandent une personne de l'équipe : URL de production et VPS (#6, Emmanuel), application OAuth GitHub et clé IA (#7), base Systalink (#9, ADR-0015), invitations (#10, Caleb).

; l'URL de production dépend de #6, #7 et #9.

- **Jalon 2 (14 oct.)** : parcours SOS Dev de bout en bout (S1 à S4), piste IA (S2, rôle 5 : fusionnée dans #104), 30+ devs invités. S1 (Florent) doit déclencher le job `ai.hint`.
- `packages/core` et `packages/contracts` : en place depuis #101 (Caleb).

## 4. Décisions techniques et fonctionnelles

Les décisions structurantes sont des ADR : [index des ADR](docs/adr/README.md). Les ADR 0001 à 0013 sont **acceptés** depuis le 9 octobre (rôle 1, issue #1) ; les ADR 0014 à 0019 ont tranché les décisions restées ouvertes.

| Décision                                                                                  | ADR  | Justification courte                                                 |
| ----------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| Monorepo pnpm + Turborepo                                                                 | 0001 | Contrat partagé front/API, une seule CI                              |
| Back-end NestJS (et non FastAPI)                                                          | 0002 | TypeScript de bout en bout, modules, OpenAPI généré                  |
| Front React + Vite en PWA                                                                 | 0003 | Léger, installable, hors ligne                                       |
| Monolithe modulaire, architecture hexagonale allégée                                      | 0004 | Une seule unité à déployer, frontières claires entre modules         |
| PostgreSQL + Prisma                                                                       | 0005 | Produit Systalink, migrations relues                                 |
| File de tâches pg-boss dans PostgreSQL                                                    | 0006 | Aucun service supplémentaire à héberger                              |
| Temps réel par SSE + LISTEN/NOTIFY                                                        | 0007 | Plus simple que WebSocket, compatible proxy                          |
| File d'actions hors ligne + clés d'idempotence                                            | 0008 | Rejouer sans doublon au retour du réseau                             |
| Sessions par cookie serveur                                                               | 0009 | Révocables, pas de jeton côté client                                 |
| Contrat REST validé par zod, OpenAPI généré                                               | 0010 | Une seule source pour les types du front et de l'API                 |
| Docker Compose + Caddy sur le VPS Systalink                                               | 0011 | Déploiement reproductible, TLS automatique                           |
| Aperçus de partage par route serveur                                                      | 0012 | Open Graph lisible par WhatsApp et LinkedIn                          |
| Trunk-based, squash merge                                                                 | 0013 | Historique lisible, `main` toujours déployable                       |
| Proof XP répartis entre les étiquettes (4, 3, 3)                                          | 0014 | Le total ne dépend pas du nombre d'étiquettes                        |
| Base Systalink managée si elle passe la vérification, sinon PostgreSQL sur le VPS         | 0015 | Produit Systalink en priorité, sans bloquer sur #2                   |
| MVP = CDC v3 ; services « écosystème » en roadmap ; pas de données simulées en production | 0016 | Produit lisible, dates tenables, honnêteté (§6.6)                    |
| Tri des 43 propositions v3.1 : 32 retenues, 9 en P2, 2 écartées                           | 0017 | Preuve, démo, coût                                                   |
| Pile front réelle (`idb`, Zustand, Radix) acceptée, avec ses invariants                   | 0018 | Équivalente ; contrat hors ligne et `@devhub/contracts` obligatoires |
| Gouvernance sans protection de branche : squash seul, relecture obligatoire               | 0019 | Dépôt privé gratuit : protection indisponible                        |

Décisions prises hors ADR, constatées dans le code :

- Messages de commit **en anglais**, documentation, PR et issues **en français** ([workflow Git](docs/equipe/workflow-git.md)).
- Fournisseur OAuth factice (`AUTH_FAKE_PROVIDER=true`) pour le développement local et les tests ; interdit en production.
- Scopes OAuth GitHub : `read:user` et `user:email` (issue #51, close).
- Rôles complémentaires confirmés le 9 octobre : **Caleb** rôle 1 (produit et pitch), **Joachim** rôle 5 (IA et intégrations).
- Badge « Membre fondateur » : inscrits avant le 22 octobre 2026 à 00:00 UTC, jamais les comptes démo.

## 5. Contraintes

| Type      | Contrainte                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| Délais    | Gel du code **jeudi 22 oct.**, soumission **samedi 24 oct. avant midi**, date limite 25 oct.                    |
| Jalons    | 8 oct. (connexion), 14 oct. (SOS Dev), 16 oct. (hors ligne sur téléphone), 18 oct. (salles), 22 oct. (gel)      |
| Notation  | Usage d'un produit Systalink obligatoire, **40 % de la note** ; barème des 60 % restants à confirmer (#2)       |
| Technique | Node.js **24**, pnpm 10, TypeScript 6, PostgreSQL 16 ; page d'accueil < 300 Ko ; Lighthouse PWA ≥ 90            |
| Sécurité  | Aucun secret dans le dépôt ni dans le front ; secrets masqués avant tout envoi à l'IA ; GitHub en lecture seule |
| Produit   | Aucune donnée inventée présentée comme réelle ; comptes de démonstration marqués « démo » ; FR et EN partout    |
| Équipe    | Toute PR relue par une autre personne ; aucune connaissance détenue par une seule personne                      |

## 6. Intervenants et responsabilités

Détail et suppléants : [organisation de l'équipe](docs/equipe/organisation.md).

| Membre            | GitHub                                | Rôle                                   | Modules possédés                                  |
| ----------------- | ------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| Caleb KPOSSOU     | `Caleb20072` (commits : `Neme6X-dev`) | Back-end · Produit et pitch (rôle 1)   | `identity`, `passport`, `reputation`, `discovery` |
| AMAMION Florent   | à confirmer                           | Back-end temps réel et synchronisation | `sos`, `matching`, `notifications`, `sync`        |
| Joachim GOEH-AKUE | `chim31`                              | Back-end · IA et intégrations (rôle 5) | `ai`, `github`, `rooms`                           |
| Sylvio CHALLA     | `sx1vio`                              | Front-end et hors ligne (rôle 3)       | `apps/web`, design, moteur hors ligne             |
| Emmanuel OKORIE   | à confirmer                           | DevOps et sécurité (rôle 4)            | `moderation`, `platform`, `infra/`                |

Le collaborateur GitHub `Sacem270` n'est rattaché à aucun membre connu : à identifier.

**Agents IA** : Claude Code est utilisé par plusieurs membres, avec les skills partagés de [`.claude/skills/`](.claude/skills/). Un agent suit les mêmes règles qu'un humain : lire ce fichier, une branche par sujet, PR relue par un humain de l'équipe.

## 7. Points d'attention et risques ouverts

| #   | Sujet                                                                                                                                                 | Impact                                                  | Qui                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| 1   | **`main` n'est pas protégée** : le dépôt est privé sur un compte gratuit, GitHub refuse la protection de branche ([BUG-003](docs/suivi/anomalies.md)) | Fusions sans relecture possibles                        | Emmanuel, Sylvio (propriétaire) |
| 2   | **#97 sort du périmètre** (pivot « écosystème » décidé côté front) : tranché par l'[ADR-0016](docs/adr/0016-perimetre-du-mvp.md), #97 à retravailler  | Fusion du front retardée tant que #97 n'est pas réduite | Sylvio, Caleb                   |
| 3   | **#96 et #97 font +39 000 lignes** chacune, contre 400 au maximum dans le workflow ; #97 contient #96                                                 | Relecture impossible en l'état                          | Sylvio                          |
| 4   | **Jalon 1** : aucune URL Systalink en ligne constatée ; OAuth réel (#7) et choix de la base (#9) ouverts                                              | Jalon 1 manqué                                          | Emmanuel, Joachim               |
| 5   | L'étape `lint` de la CI n'exécutait aucune vérification : **corrigé dans #103**, à fusionner                                                          | Fausse impression de qualité                            | Emmanuel (relecture)            |
| 7   | Aucune réponse de Systalink consignée (#2) : barème, produits acceptés, base managée (règle de choix : ADR-0015)                                      | Critère Systalink à 40 %                                | Caleb                           |
| 9   | Aucune clé d'IA n'existe encore (#7) : S2 n'a été essayé qu'avec le faux modèle                                                                       | Démo de S2                                              | Joachim, Emmanuel               |

## 8. Carte de la documentation

La documentation existante est déjà riche ; elle est réutilisée telle quelle. Correspondance avec la structure documentaire de référence :

| Besoin                                        | Document                                                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Index général                                 | [docs/README.md](docs/README.md)                                                                                                             |
| **Démarrage pas à pas**                       | [docs/guides/demarrage.md](docs/guides/demarrage.md)                                                                                         |
| Architecture globale                          | [docs/architecture/00-vue-ensemble.md](docs/architecture/00-vue-ensemble.md)                                                                 |
| Stack technique et justifications             | [README.md § Stack](README.md#stack) et [ADR](docs/adr/README.md)                                                                            |
| Base de données                               | [docs/architecture/05-modele-donnees.md](docs/architecture/05-modele-donnees.md), `apps/api/prisma/schema.prisma`                            |
| API                                           | [docs/architecture/06-api.md](docs/architecture/06-api.md), OpenAPI sur `/api/docs`                                                          |
| Back-end                                      | [docs/architecture/02-backend.md](docs/architecture/02-backend.md), [apps/api/README.md](apps/api/README.md)                                 |
| Interface (front)                             | [docs/architecture/03-frontend.md](docs/architecture/03-frontend.md), [04-hors-ligne-sync.md](docs/architecture/04-hors-ligne-sync.md)       |
| Socle transversal (sécurité, config, erreurs) | [docs/architecture/10-securite.md](docs/architecture/10-securite.md), [02-backend.md](docs/architecture/02-backend.md)                       |
| Infrastructure                                | [docs/architecture/11-infrastructure-deploiement.md](docs/architecture/11-infrastructure-deploiement.md), [infra/README.md](infra/README.md) |
| **Suivi du cahier des charges**               | [docs/suivi/suivi-cahier-des-charges.md](docs/suivi/suivi-cahier-des-charges.md)                                                             |
| **Registre des anomalies**                    | [docs/suivi/anomalies.md](docs/suivi/anomalies.md)                                                                                           |
| Équipe, Git, revue, « terminé »               | [docs/equipe/](docs/equipe/)                                                                                                                 |

Non créés volontairement : une fiche par écran front et par module back-end. Ils seront ajoutés au fil des modules, dans `docs/architecture/` ou dans le README du paquet concerné, quand le code existera.

## 9. Historique

| Date       | Évolution                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-05 | Cahier des charges v3 ; propositions v3.1 ; monorepo pnpm + Turborepo                                                            |
| 2026-10-06 | Architecture complète, ADR 0001 à 0013 proposés, guides d'équipe, CI, Docker Compose, Caddy                                      |
| 2026-10-07 | API NestJS + Prisma 7 + migration initiale (#94) ; connexion GitHub, sessions, `GET /me` (#95)                                   |
| 2026-10-08 | PR ouvertes : front `apps/web` (#96, #97), confiance et code de conduite (#98), import GitHub (#99)                              |
| 2026-10-08 | Création de `context.md`, du suivi du cahier des charges, du registre des anomalies et du guide de démarrage                     |
| 2026-10-08 | Relecture de #99 : BUG-010 (requête GitHub refusée en 422) ; #101 et #102 (Caleb) ; outillage réparé (#103) ; piste IA S2 (#104) |
| 2026-10-08 | Fusion de #98, #99 (BUG-010 corrigé), #101, #102 et #104 ; BUG-011 et BUG-012 consignés                                          |
| 2026-10-09 | Fusion de #100 et #103 ; ADR 0001 à 0013 acceptés ; ADR 0014 à 0019 (XP, base, périmètre, tri v3.1, front, dépôt)                |
| 2026-10-14 | Reprise : Joachim mandaté pour finir toutes les tâches ; S1 (`sos`) et service d'idempotence partagé                             |
