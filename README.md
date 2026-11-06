# DevHub Africa

> **La plateforme des développeurs basée sur la preuve.** Aider → Construire → Prouver. Hors ligne d'abord. Construit, hébergé et pensé pour les développeurs africains.
>
> Projet de l'équipe **CADEV-saiyens** pour le Systalink Challenge, Coupe d'Afrique des Développeurs 2026. « DevHub Africa » est un nom de travail.

GitHub montre ce que tu as construit. DevHub Africa montre ce que tu sais faire, parce que tu l'as **prouvé** en aidant d'autres développeurs et en construisant avec eux, même avec une connexion instable.

| Pilier                            | Ce que fait le développeur                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **SOS Dev** (aider)               | Il est bloqué : piste IA en quelques secondes, puis l'aide d'un pair qui a déjà résolu des problèmes similaires                   |
| **Salles de projet** (construire) | Il ouvre une salle liée à son dépôt GitHub, publie des tâches, d'autres contribuent ; les contributions sont vérifiées par GitHub |
| **Developer Passport** (prouver)  | Chaque action utile alimente une page publique où chaque score renvoie à ses preuves                                              |

## État du projet

🚧 **Fonctionnalités terminées (6 novembre 2026), reste le déploiement.** Date limite officielle : **15 novembre 2026, 17:00 GMT** ; vote des pairs obligatoire du 15/11 18:00 au 16/11 23:59. Il reste à créer l'application OAuth GitHub de production et à déployer sur Systalink ; la liste est dans le [dossier de soumission](docs/soumission.md).

| Partie                 | État                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API et worker (NestJS) | 167 routes. Connexion GitHub et e-mail, profil et compétences, Proof XP et garde-fous, entraide (questions, réponses, matching), salles et PR vérifiées, fil communautaire, emplois et espace entreprise, messagerie, pré-vol (Lighthouse, test de charge, MCP), **Banc d'essai**, **certifications corrigées par le serveur**, admin, temps réel |
| Front PWA (`apps/web`) | Refonte v3 (Poppins, tons Discord, fil façon LinkedIn) ; tout parle à l'API réelle, sans contenu de démonstration ; site vitrine au même design                                                                                                                                                                                                   |
| Administration         | `apps/admin` séparée, double facteur, modération des contenus (dont le Banc d'essai), tableau de bord Systalink                                                                                                                                                                                                                                   |
| Tests                  | API 615, front 66 unitaires et 20 parcours Playwright, tous verts le 6 novembre                                                                                                                                                                                                                                                                   |
| Hors ligne             | File d'actions IndexedDB, rejeu sans doublon, centre de synchronisation. Test sur téléphone réel encore à faire                                                                                                                                                                                                                                   |
| Déploiement Systalink  | Images Docker, Compose, Caddy, scripts de déploiement et de sauvegarde prêts ; VPS, secrets et OAuth GitHub de production à brancher                                                                                                                                                                                                              |

Détail : [`context.md`](context.md), [suivi du cahier des charges](docs/suivi/suivi-cahier-des-charges.md), [registre des anomalies](docs/suivi/anomalies.md) et [avancement par personne](docs/equipe/organisation.md#réaffectations-et-avancement).

## Documentation

Tout est dans [`docs/`](docs/README.md) :

- [`context.md`](context.md) : la source de vérité partagée, à lire en premier
- [Guide de démarrage](docs/guides/demarrage.md)
- [Vue d'ensemble de l'architecture](docs/architecture/00-vue-ensemble.md)
- [Décisions d'architecture (ADR)](docs/adr/README.md)
- [Organisation de l'équipe](docs/equipe/organisation.md) et [workflow Git](docs/equipe/workflow-git.md)
- Cahiers des charges : [v3](docs/Cahier_des_charges_v3_DevHub_Africa.pdf) et [propositions v3.1](docs/CDC_v3.1_DevHub_Africa_Propositions.pdf)

## Stack

| Couche            | Technologies                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Front-end         | PWA React + Vite (`vite-plugin-pwa`, Workbox), React Router, IndexedDB (`idb`), Zustand, Radix UI, i18next (FR/EN), Tailwind (ADR-0018) |
| Back-end          | NestJS (API + worker), Prisma, pg-boss, Server-Sent Events                                                                              |
| Données           | PostgreSQL 16 : base managée Systalink ou PostgreSQL sur le VPS, à décider (ADR-0015, #9)                                               |
| Partagé           | `@devhub/contracts` (schémas zod), `@devhub/core` (règles pures : scores, secrets, étiquettes)                                          |
| Infrastructure    | VPS Systalink, Docker Compose, Caddy, GitHub Actions                                                                                    |
| Services externes | OAuth et API GitHub, API Claude côté serveur (`LLM_API_KEY` vide : faux modèle déterministe)                                            |

## Produits Systalink utilisés

| Produit          | Usage                                                           | État au 20 octobre                                                      |
| ---------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| VPS              | Héberge l'application, l'API et les tâches de fond              | Images Docker, Compose et Caddy prêts ; pas encore en ligne (#6)        |
| Base de données  | Profils, questions, salles, Proof XP, file de tâches            | Base managée ou PostgreSQL sur le VPS : à décider (#9)                  |
| Sauvegarde cloud | Sauvegarde quotidienne, date affichée sur l'écran d'état        | Scripts `backup.sh` et `restore.sh` prêts ; restauration à tester (#11) |
| Messagerie pro   | E-mails de notification (SMTP)                                  | Code fusionné (Y3) ; identifiants SMTP de production à saisir (#2)      |
| Stockage objet   | Avatars et captures, si le produit est accepté par le règlement | Non codé (Y4, P2)                                                       |

## Démarrer en local

Prérequis : **Node.js 24**, **pnpm 10** (`corepack enable` ; sans droits pour l'activer, préfixer chaque commande par `corepack`, par exemple `corepack pnpm install`), **Docker**.

```bash
git clone git@github.com:sx1vio/CADEV-saiyens.git
cd CADEV-saiyens
cp .env.example .env            # puis SESSION_SECRET, TOKEN_ENCRYPTION_KEY, AUTH_FAKE_PROVIDER=true
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d   # PostgreSQL et Mailpit
pnpm --filter @devhub/api exec prisma migrate deploy
pnpm db:seed
pnpm --filter @devhub/api dev                          # API
pnpm --filter @devhub/api dev:worker                   # worker (autre terminal)
pnpm --filter @devhub/web dev                          # front (autre terminal)
```

- API : http://localhost:3000/api/v1, documentation OpenAPI sur `/api/docs`
- Connexion sans application GitHub : http://localhost:3000/api/v1/auth/github?login=awa-dev
- Front : http://localhost:5173 (Vite renvoie `/api` vers l'API). Pour parler à l'API réelle plutôt qu'au serveur simulé du navigateur, lancer avec `VITE_API_MODE=http`

Chaque étape est détaillée, avec les problèmes fréquents, dans le [guide de démarrage](docs/guides/demarrage.md).

## Contribuer

Lire [`CONTRIBUTING.md`](CONTRIBUTING.md). En bref : une branche courte par fonctionnalité, des commits au format Conventional Commits, une PR relue par une autre personne, puis un squash merge.

## Équipe

| Membre            | Rôle                          |
| ----------------- | ----------------------------- |
| Caleb KPOSSOU     | Back-end · Produit et pitch   |
| AMAMION Florent   | Back-end                      |
| Joachim GOEH-AKUE | Back-end · IA et intégrations |
| Sylvio CHALLA     | Front-end et hors ligne       |
| Emmanuel OKORIE   | DevOps et sécurité            |

_Construit en Afrique. Hébergé en Afrique. Pour les développeurs africains._
