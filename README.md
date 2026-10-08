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

🚧 **Phase de démarrage (6 octobre 2026).** L'architecture et la documentation sont posées ; le code applicatif commence. Gel du code le 22 octobre, soumission le 24 octobre.

## Documentation

Tout est dans [`docs/`](docs/README.md) :

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
cp .env.example .env            # puis remplir les valeurs de développement
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d   # PostgreSQL local
pnpm db:migrate
pnpm db:seed
pnpm dev                         # API, worker et front
```

- Front : http://localhost:5173
- API : http://localhost:3000/api/v1, documentation OpenAPI sur `/api/docs`

> Les commandes `pnpm dev`, `db:migrate` et `db:seed` fonctionneront dès que les applications seront initialisées (6 et 7 octobre).

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
