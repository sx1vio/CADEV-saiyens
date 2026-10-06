# @devhub/api : API et worker NestJS

Propriétaires : **Caleb KPOSSOU, AMAMION Florent, Joachim GOEH-AKUE** (rôle 2, back-end), chacun sur ses modules ([organisation](../../docs/equipe/organisation.md)).

Monolithe modulaire, architecture hexagonale allégée. Architecture : [docs/architecture/02-backend.md](../../docs/architecture/02-backend.md). Modèle de données : [05-modele-donnees.md](../../docs/architecture/05-modele-donnees.md). Contrat : [06-api.md](../../docs/architecture/06-api.md).

## Déjà présent

- `prisma/schema.prisma` : schéma v1 (30 tables), validé avec Prisma 7.10
- `prisma.config.ts` : configuration Prisma 7 (URL de connexion, migrations, seed)

## À initialiser (6-7 octobre)

```bash
pnpm dlx @nestjs/cli new apps/api --package-manager pnpm --skip-git
pnpm --filter @devhub/api add @prisma/client@7.10 @prisma/adapter-pg pg pg-boss nestjs-zod zod pino nestjs-pino @nestjs/throttler dotenv
pnpm --filter @devhub/api add -D prisma@7.10 tsx vitest supertest
```

Puis : nommer le paquet `@devhub/api`, créer `src/main.ts` (HTTP) et `src/worker.ts` (jobs), `src/infrastructure/` et `src/modules/<module>/{domain,application,infrastructure,http}`.

Première migration : `pnpm db:migrate --name init`, puis ajouter à la main le SQL de la section « Index » et le déclencheur append-only de `xp_events` (voir 05-modele-donnees.md).

## Scripts attendus

`dev`, `dev:worker`, `build`, `lint`, `typecheck`, `test`.
