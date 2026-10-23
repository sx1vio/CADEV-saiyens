# Contexte du projet DevHub Africa

> **Source de vérité partagée** de tous les intervenants (humains et agents IA). À lire au début de chaque session de travail, à mettre à jour avant de clôturer une action (nouvelle fonctionnalité, décision, pivot, correction majeure).
>
> Dernière mise à jour : **20 octobre 2026, soir** (J-2 avant le gel), par Joachim GOEH-AKUE (session Claude « bd », documentation).

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

Différenciateurs : **hors ligne d'abord** (on coupe le Wi-Fi pendant la démo) et **hébergement Systalink visible** (un produit Datacloud est une condition de recevabilité, pas une part de la note).

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

**En résumé au 23 octobre** : les dernières PR (#172 à #179 : S5, S14, X5, T1, PR5, D4) sont fusionnées ; aucune PR n'est ouverte. Les 21 exigences P0 et 13 des 14 P1 sont terminées : 34 exigences v3 sur 37 (92 %). Restent A2 (P1), D3 et Y4 (P2). `sharp` (libvips sous LGPL-3.0) est remplacé par `@napi-rs/canvas` (MIT) : plus aucun composant interdit par le règlement. Le [dossier de soumission](docs/soumission.md) rassemble les déclarations exigées (licences, IA, propriété). Ce qui manque n'est plus du code : l'achat Datacloud, la mise en ligne, l'OAuth GitHub de production, les déclarations signées et le vote des pairs.

### Fait (fusionné sur `main`)

| Lot                                                                                                      | Exigences                     | PR                                                   |
| -------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Socle : monorepo, CI, Docker, Caddy, API NestJS + worker, Prisma, ADR 0001 à 0020                        | —                             | #94, #100, #103, #105                                |
| Connexion GitHub, profil importé, signaux de confiance, code de conduite, suppression du compte          | A1, A3, PR1, PR11, M3         | #95, #98, #99, #138, #151                            |
| Proof XP, barème public, scores par compétence                                                           | X1, X2                        | #101, #102                                           |
| SOS Dev : question, piste IA, matching, réponses, validation, questions similaires, « sans réponse »     | S1 à S4, S6, S7, S16, X4, S11 | #104, #106 à #108, #160, #165, #171                  |
| Temps réel SSE, synchronisation hors ligne, écran de conflit, masquage des secrets                       | Y8, O1 à O4, O8, O9           | #109, #110, #118, #119, #135, #157                   |
| Salles : création, dépôt lié, tâches, discussion, PR vérifiée, invitation riche, Kanban                  | R1 à R4, R7 à R9, R11         | #111 à #113, #116, #122                              |
| Passport public et preuves ; découverte et classement                                                    | PR2, PR3, PR10, D1, D2        | #113, #114                                           |
| Systalink et impact : état des services, impact, e-mails, historique de disponibilité, intégration A/B/C | Y1, Y2, Y3, Y5, Y6            | #115, #131, #140, #141, #155, #156, `feat/systalink` |
| Modération et journal d'audit                                                                            | M1, M4                        | #115, #129, #145                                     |
| Front branché sur l'API réelle, FR/EN, thème sombre                                                      | I1, T4                        | #116 à #154                                          |
| Salles : IA qui propose des tâches, demande de revue de code ; onglets sur ordinateur (BUG-041)          | R5, R6                        | #158, #162, #164, #170                               |
| Passport : disponible pour une mission, Contacter ; confidentialité par champ dans les réglages          | PR4, PR14                     | #163, #168                                           |
| Pont bilingue FR ↔ EN ; étiquettes détectées limitées au référentiel (BUG-042)                           | S10, S9                       | #159, #166                                           |

### En cours (20 octobre, soir)

Mandat du 14 octobre, renouvelé le 19 : Joachim avance **toutes** les tâches restantes avec plusieurs sessions Claude Code. Le 20 octobre, la session superviseure (5f) n'est plus active. La coordination et les fusions passent par la session 3b, à la demande de Joachim ; les autres sessions ouvrent leurs PR sans les fusionner.

Aucune PR n'est ouverte (`gh pr list`, 20 octobre au soir). Travail annoncé par la session 3b, pas encore vérifiable avec `gh` faute de branche poussée :

| Exigence                       | Qui                                              |
| ------------------------------ | ------------------------------------------------ |
| S14 Lien de reproduction       | Session 63, à partir du travail de la session 3c |
| S5 Créneau de pair programming | Session 90                                       |
| Relecture des PR               | Session 78                                       |
| Documentation                  | Session bd                                       |

Restent hors périmètre du gel, sauf temps libre : A2 (GitLab, Google), D3 et Y4 (P2), PR5, PR6, D4, Y9 ; X5, T1 et T2 sont partiels.

### Bloquants hors code (équipe)

| Sujet                                                                                                      | Issue         | Qui               |
| ---------------------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| URL de production sur le VPS Systalink, base retenue                                                       | #6, #9        | Emmanuel, Sylvio  |
| Application OAuth GitHub réelle et clé IA plafonnée (S2, R5 et S10 ne sont essayés qu'avec le faux modèle) | #7            | Joachim, Emmanuel |
| Identifiants SMTP Systalink, plages IP (`SYSTALINK_IP_RANGES`)                                             | #2            | Caleb             |
| 30+ devs invités, test externe, deck et vidéo                                                              | #10, #12, #13 | Caleb             |

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

| Type      | Contrainte                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Délais    | Gel du code **jeudi 22 oct.**, soumission interne 24 oct., **date limite officielle samedi 25 oct. 17:00 GMT** ; vote des pairs obligatoire pour chaque membre (25 oct. 18:00 → 26 oct. 23:59)                                                                      |
| Jalons    | 8 oct. (connexion), 14 oct. (SOS Dev), 16 oct. (hors ligne sur téléphone), 18 oct. (salles), 22 oct. (gel)                                                                                                                                                          |
| Notation  | Produit Datacloud acheté et démo en ligne : **condition de recevabilité**. Barème : pertinence 25 %, qualité technique 30 %, UX 20 %, innovation 15 %, vote du public ≤ 10 % ; composants GPL, AGPL ou LGPL interdits ([dossier de soumission](docs/soumission.md)) |
| Technique | Node.js **24**, pnpm 10, TypeScript 6, PostgreSQL 16 ; page d'accueil < 300 Ko ; Lighthouse PWA ≥ 90                                                                                                                                                                |
| Sécurité  | Aucun secret dans le dépôt ni dans le front ; secrets masqués avant tout envoi à l'IA ; GitHub en lecture seule                                                                                                                                                     |
| Produit   | Aucune donnée inventée présentée comme réelle ; comptes de démonstration marqués « démo » ; FR et EN partout                                                                                                                                                        |
| Équipe    | Toute PR relue par une autre personne ; aucune connaissance détenue par une seule personne                                                                                                                                                                          |

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

| #   | Sujet                                                                                                                                                 | Impact                            | Qui                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------- |
| 1   | **`main` n'est pas protégée** : le dépôt est privé sur un compte gratuit, GitHub refuse la protection de branche ([BUG-003](docs/suivi/anomalies.md)) | Fusions sans relecture possibles  | Emmanuel, Sylvio (propriétaire) |
| 4   | **Jalon 1** : aucune URL Systalink en ligne constatée ; OAuth réel (#7) et choix de la base (#9) ouverts                                              | Jalon 1 manqué                    | Emmanuel, Joachim               |
| 7   | Aucune réponse de Systalink consignée (#2) : barème, produits acceptés, base managée (règle de choix : ADR-0015)                                      | Recevabilité (Datacloud)          | Caleb                           |
| 9   | Aucune clé d'IA n'existe encore (#7) : S2, R5 et S10 n'ont été essayés qu'avec le faux modèle                                                         | Démo de l'IA                      | Joachim, Emmanuel               |
| 10  | **Gel du code jeudi 22 oct.** : S14 et S5 doivent être ouvertes, relues et fusionnées avant ; ensuite, seuls les `fix` critiques                      | Exigences P1 perdues pour la démo | Sessions 63, 90, 78 (relecture) |

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

| Date       | Évolution                                                                                                                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-05 | Cahier des charges v3 ; propositions v3.1 ; monorepo pnpm + Turborepo                                                                                                                                                                  |
| 2026-10-06 | Architecture complète, ADR 0001 à 0013 proposés, guides d'équipe, CI, Docker Compose, Caddy                                                                                                                                            |
| 2026-10-07 | API NestJS + Prisma 7 + migration initiale (#94) ; connexion GitHub, sessions, `GET /me` (#95)                                                                                                                                         |
| 2026-10-08 | PR ouvertes : front `apps/web` (#96, #97), confiance et code de conduite (#98), import GitHub (#99)                                                                                                                                    |
| 2026-10-08 | Création de `context.md`, du suivi du cahier des charges, du registre des anomalies et du guide de démarrage                                                                                                                           |
| 2026-10-08 | Relecture de #99 : BUG-010 (requête GitHub refusée en 422) ; #101 et #102 (Caleb) ; outillage réparé (#103) ; piste IA S2 (#104)                                                                                                       |
| 2026-10-08 | Fusion de #98, #99 (BUG-010 corrigé), #101, #102 et #104 ; BUG-011 et BUG-012 consignés                                                                                                                                                |
| 2026-10-09 | Fusion de #100 et #103 ; ADR 0001 à 0013 acceptés ; ADR 0014 à 0019 (XP, base, périmètre, tri v3.1, front, dépôt)                                                                                                                      |
| 2026-10-14 | Reprise : Joachim mandaté pour finir toutes les tâches ; S1 (`sos`) et service d'idempotence partagé                                                                                                                                   |
| 2026-10-14 | Fusion de #106 à #116 : SOS Dev de bout en bout, temps réel, synchronisation, salles, Passport, découverte, impact, front intégré                                                                                                      |
| 2026-10-16 | A3, Y5, journal d'audit, Systalink A/B/C, simulateur de réseau retiré ; BUG-033 à BUG-039                                                                                                                                              |
| 2026-10-18 | #151 à #154 : suppression du compte côté web, image Docker de production, écrans traduits                                                                                                                                              |
| 2026-10-19 | Vérification complète de `main` (tout vert) ; suivi remis à l'état réel (P0 100 %) ; quatre sessions Claude supervisées ; fusion de #155 à #157 et #160 ; R5 (#158), S10 (#159) ; BUG-040 corrigé                                      |
| 2026-10-20 | R6 en PR (#162) ; quota IA réservé de façon atomique dans #158 et #159 ; PR4 (#163), S6 (#165), BUG-041 (#164) et BUG-042 (#166) en PR ; fin de la session superviseure, coordination par 3b ; risques soldés (#96, #97, #103) retirés |
| 2026-10-20 | Soir : fusion par la session 3b de #158, #159 et #162 à #171 (R5, R6, S6, S9, S10, S16, PR4, PR14, BUG-041, BUG-042) et des docs #161, #167 (BUG-043), #169 ; P1 à 12/14 ; S14 (session 63) et S5 (session 90) annoncés                |
