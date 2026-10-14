# ADR-0015 : Base de données Systalink managée, ou PostgreSQL sur le VPS

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1). Règle de décision ; l'application concrète revient à Emmanuel (#9).
- **Date** : 2026-10-09
- **Décideurs** : Caleb (rôle 1), Emmanuel (rôle 4) pour l'exécution
- **Exigences concernées** : §7, §8, critère Systalink (40 %), issue #9 ; complète l'[ADR-0005](0005-postgresql-prisma.md)

## Contexte

L'issue #9 devait trancher avant le 7 octobre : base de données managée par Systalink, ou PostgreSQL dans Docker sur le VPS Systalink. Personne n'a encore la liste des produits acceptés ni les caractéristiques de la base managée (#2). L'API dépend pourtant de fonctions précises de PostgreSQL :

| Besoin                                   | Utilisé par                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| PostgreSQL 15 ou plus                    | Index uniques `NULLS NOT DISTINCT` (`xp_events_unique_gain`)   |
| Extensions `citext` et `pgcrypto`        | Pseudos et e-mails insensibles à la casse, `gen_random_uuid()` |
| `LISTEN/NOTIFY`, connexions persistantes | pg-boss, temps réel SSE (ADR-0006, ADR-0007)                   |
| Déclencheurs PL/pgSQL                    | Journaux append-only `xp_events` et `admin_actions`            |
| Droit de créer un schéma                 | Schéma `pgboss` de la file de tâches                           |

## Décision

**La base managée Systalink est le premier choix**, car elle compte comme produit Systalink utilisé (40 % de la note). On la retient **si et seulement si** elle passe la vérification ci-dessous. Sinon, **PostgreSQL 16 dans Docker sur le VPS Systalink**, avec la sauvegarde cloud Systalink : le VPS et la sauvegarde restent des produits Systalink.

Vérification, à exécuter avec le rôle applicatif de la base managée (moins de 15 minutes) :

```sql
SHOW server_version;                         -- doit être >= 15
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS pgboss_check; DROP SCHEMA pgboss_check;
LISTEN devhub_check; NOTIFY devhub_check, 'ok'; -- la notification doit arriver
```

Puis, sur une base vide : `pnpm --filter @devhub/api exec prisma migrate deploy` doit réussir (déclencheurs compris), et `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` doit afficher une migration vide.

Si la base managée passe par un pooler en mode « transaction » (PgBouncer), `LISTEN/NOTIFY` ne fonctionne pas à travers lui. pg-boss et le SSE utilisent alors l'adresse directe de la base ; à défaut, on retient l'option Docker.

## Conséquences

### Positives

- Décision prise sans attendre Systalink ; le critère est vérifiable en un quart d'heure.
- Dans les deux cas, trois produits Systalink au moins restent utilisés : VPS, base ou sauvegarde, messagerie.

### Négatives

- Option Docker : sauvegarde et restauration sont à notre charge (`infra/scripts/backup.sh`, `restore.sh`), et le VPS porte aussi la base.

## Mise en œuvre

- Emmanuel exécute la vérification dès l'accès à la base managée et consigne le résultat dans #9.
- Si l'option Docker est retenue, décommenter le service `postgres` de `infra/docker-compose.yml`.
