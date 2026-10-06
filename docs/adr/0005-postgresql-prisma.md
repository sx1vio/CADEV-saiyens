# ADR-0005 : PostgreSQL et Prisma

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Décideurs** : back-end, DevOps
- **Exigences concernées** : §7, §8, S6, D1, X1

## Contexte

Le cahier des charges demande la base de données Systalink, **PostgreSQL de préférence**, avec recherche plein texte (GIN), clés UUID et un journal append-only. Il faut aussi choisir un ORM pour NestJS.

## Critères de décision

- Transactions ACID (XP attribués dans la même transaction que la validation).
- Recherche plein texte intégrée (objectif : moins de 1 s), sans service de plus.
- File de tâches et notifications dans la même base (ADR-0006, ADR-0007).
- Migrations versionnées et lisibles ; types TypeScript générés.

## Options envisagées (ORM)

### Prisma
- **Pour** : schéma déclaratif lisible (sert aussi de documentation), types générés, migrations SQL relisibles, équipe débutante productive vite.
- **Contre** : index GIN et colonnes générées à écrire en SQL brut dans les migrations ; transactions interactives un peu plus lentes.

### Drizzle
- **Pour** : proche du SQL, très léger, bon support de PostgreSQL.
- **Contre** : moins connu de l'équipe ; écosystème de migrations plus jeune.

### TypeORM
- **Pour** : intégration NestJS historique.
- **Contre** : maintenance irrégulière, types moins sûrs, pièges connus avec les relations.

## Décision

**PostgreSQL** (Systalink) avec **Prisma 7** (configuration dans `prisma.config.ts`, client avec l'adaptateur `@prisma/adapter-pg`). Les éléments que Prisma n'exprime pas (index GIN, `tsvector` générés, index partiels, déclencheur append-only) sont ajoutés en SQL dans les migrations. Le schéma v1 est dans [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma).

## Conséquences

### Positives
- Une seule base pour les données, la file, le temps réel et la recherche : une seule chose à sauvegarder.
- Le schéma Prisma sert de documentation vivante.

### Négatives
- Dépendance aux fonctions spécifiques de PostgreSQL (`LISTEN/NOTIFY`, `tsvector`, `citext`, `NULLS NOT DISTINCT` en version 15 ou plus).

### Risques et parades
- Risque : la base Systalink n'est pas PostgreSQL, ou elle est trop ancienne, ou elle bloque les extensions → Parade : PostgreSQL dans Docker sur le VPS, avec la sauvegarde cloud Systalink. Décision au plus tard le 7 octobre.
- Risque : plein texte « simple » moins pertinent en français → Parade : acceptable pour le MVP ; la recherche sémantique (D3, P2) passera par `pgvector` dans la même base.
