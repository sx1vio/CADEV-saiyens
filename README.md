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

🚧 **En développement (8 octobre 2026, Jalon 1).** API NestJS en place : connexion GitHub, sessions, profil importé depuis GitHub, compétences, Proof XP et leurs garde-fous, piste IA (S2). Le front PWA est en revue. Pas encore déployé sur Systalink. État détaillé : [`context.md`](context.md), [suivi du cahier des charges](docs/suivi/suivi-cahier-des-charges.md) et [avancement par personne](docs/equipe/organisation.md#réaffectations-et-avancement). Gel du code le 22 octobre, soumission le 24 octobre.

## Documentation

Tout est dans [`docs/`](docs/README.md) :

- [`context.md`](context.md) : la source de vérité partagée, à lire en premier
- [Guide de démarrage](docs/guides/demarrage.md)
- [Vue d'ensemble de l'architecture](docs/architecture/00-vue-ensemble.md)
- [Décisions d'architecture (ADR)](docs/adr/README.md)
- [Organisation de l'équipe](docs/equipe/organisation.md) et [workflow Git](docs/equipe/workflow-git.md)
- Cahiers des charges : [v3](docs/Cahier_des_charges_v3_DevHub_Africa.pdf) et [propositions v3.1](docs/CDC_v3.1_DevHub_Africa_Propositions.pdf)

## Stack

| Couche            | Technologies                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Front-end         | PWA React + Vite, Workbox, IndexedDB (Dexie), TanStack Query, i18next (FR/EN), Tailwind        |
| Back-end          | NestJS (API + worker), Prisma, pg-boss, Server-Sent Events                                     |
| Données           | PostgreSQL (Systalink)                                                                         |
| Partagé           | `@devhub/contracts` (schémas zod), `@devhub/core` (règles pures : scores, secrets, étiquettes) |
| Infrastructure    | VPS Systalink, Docker Compose, Caddy, GitHub Actions                                           |
| Services externes | OAuth et API GitHub, API Claude (côté serveur)                                                 |

## Produits Systalink utilisés

| Produit          | Usage                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| VPS              | Héberge l'application, l'API et les tâches de fond                            |
| Base de données  | Profils, questions, salles, Proof XP, file de tâches                          |
| Sauvegarde cloud | Sauvegarde quotidienne, restauration testée, date affichée dans l'application |
| Messagerie pro   | E-mails de notification (SMTP)                                                |
| Stockage objet   | Avatars et captures, si le produit est accepté par le règlement               |

## Démarrer en local

Prérequis : **Node.js 24**, **pnpm 10** (`corepack enable`), **Docker**.

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
```

- API : http://localhost:3000/api/v1, documentation OpenAPI sur `/api/docs`
- Connexion sans application GitHub : http://localhost:3000/api/v1/auth/github?login=awa-dev
- Front : http://localhost:5173, une fois `apps/web` fusionné (PR #97)

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
