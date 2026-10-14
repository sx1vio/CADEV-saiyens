# @devhub/api : API et worker NestJS

Propriétaires : **Caleb KPOSSOU, AMAMION Florent, Joachim GOEH-AKUE** (rôle 2, back-end), chacun sur ses modules ([organisation](../../docs/equipe/organisation.md)).

Monolithe modulaire, architecture hexagonale allégée. Architecture : [docs/architecture/02-backend.md](../../docs/architecture/02-backend.md). Modèle de données : [05-modele-donnees.md](../../docs/architecture/05-modele-donnees.md). Contrat : [06-api.md](../../docs/architecture/06-api.md).

## Pile

NestJS 11.2 (Express), Prisma 7.10 avec `@prisma/adapter-pg`, pg-boss 12, nestjs-zod, nestjs-pino, Vitest + SWC. TypeScript 6.0, `module: nodenext` (sortie CommonJS).

## Démarrer

Depuis la racine du dépôt :

```bash
cp .env.example .env                                   # puis compléter
docker compose -f infra/docker-compose.dev.yml up -d   # PostgreSQL + Mailpit
pnpm install
pnpm --filter @devhub/api exec prisma migrate deploy   # applique les migrations
pnpm --filter @devhub/api exec prisma db seed          # 52 étiquettes de référence
pnpm --filter @devhub/api dev                          # API sur http://localhost:3000
pnpm --filter @devhub/api dev:worker                   # worker pg-boss (import du profil GitHub, actualités…)
pnpm --filter @devhub/api news:ingest                  # collecte des actualités à la main (le worker le fait toutes les 15 min)
```

| URL                               | Rôle                                                      |
| --------------------------------- | --------------------------------------------------------- |
| `GET /api/v1/healthz`             | Le process répond                                         |
| `GET /readyz`                     | La base répond (Docker, déploiement)                      |
| `GET /api/docs`                   | Documentation OpenAPI (hors production)                   |
| `GET /api/v1/auth/github`         | Connexion GitHub (redirection OAuth, `?returnTo=/chemin`) |
| `GET /api/v1/me`                  | Mon profil (session requise)                              |
| `POST /api/v1/auth/logout`        | Déconnexion (en-têtes `Origin` et `X-DevHub-Client: web`) |
| `POST /api/v1/me/code-of-conduct` | Acceptation du code de conduite (M3)                      |
| `GET /api/v1/me/skills`           | Compétences proposées depuis GitHub (PR1, X3)             |
| `POST /api/v1/me/github/refresh`  | Réimport du profil GitHub (une fois par heure)            |
| `GET /api/v1/news/home`           | Accueil : à la une, rubriques, vidéos, HN, DEV, GitHub    |
| `GET /api/v1/news`                | Actualités filtrées (`category`, `kind`, `lang`, `q`…)    |
| `GET /api/v1/videos`              | Vidéos YouTube des chaînes suivies                        |
| `GET /api/v1/news/sources`        | Sources suivies, volume et fraîcheur                      |
| `GET /api/v1/img`                 | Image d'article redimensionnée en WebP (anti-SSRF)        |

> **Connexion sans application GitHub** : avec `AUTH_FAKE_PROVIDER=true` (interdit en production), `GET /api/v1/auth/github?login=awa-dev` connecte directement un faux compte `awa-dev`. Pratique en local et utilisé par les tests de bout en bout.

> **WSL** : sous WSL, `pnpm install` échoue souvent avec `EACCES ... rename` si le dépôt est sur le disque Windows (`/mnt/c/...`), et il est très lent. Cloner le dépôt dans le système de fichiers Linux (par exemple `~/dev/CADEV-saiyens`) règle les deux problèmes.

## Structure

```text
src/
├── main.ts                      # point d'entrée HTTP
├── worker.ts                    # point d'entrée worker (jobs pg-boss)
├── app.module.ts                # modules métier à importer ici
├── infrastructure/
│   ├── config/                  # variables d'environnement validées par zod (seul accès à process.env)
│   ├── prisma/                  # PrismaService (adaptateur pg)
│   ├── http/                    # santé, erreurs RFC 9457 (problem+json)
│   └── jobs/                    # client pg-boss
├── generated/prisma/            # client Prisma généré (non commité)
└── modules/                     # à venir : identity, sos, rooms… (domain, application, infrastructure, http)
prisma/
├── schema.prisma                # source de vérité du modèle
├── migrations/                  # migrations SQL relues (la première contient du SQL manuel)
└── seed.ts                      # données de référence idempotentes
```

## Scripts

| Script       | Rôle                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `dev`        | API en mode surveillance                                                |
| `dev:worker` | Worker en mode surveillance                                             |
| `ai:try`     | Essai de la piste IA contre la vraie API Claude (`LLM_API_KEY` requise) |
| `build`      | `prisma generate` puis compilation                                      |
| `typecheck`  | Vérification des types                                                  |
| `test`       | Tests Vitest (unitaires et HTTP)                                        |

## Règles pour les migrations

- Créer une migration : `pnpm --filter @devhub/api exec prisma migrate dev --name <nom>`, la relire, la commiter.
- Ne jamais modifier une migration déjà fusionnée sur `main`.
- Après une migration, `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` doit afficher une migration vide (aucune dérive).
