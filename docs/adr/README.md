# Décisions d'architecture (ADR)

Un ADR (*Architecture Decision Record*) garde la trace d'une décision technique importante : le **contexte**, les **options envisagées**, la **décision** et ses **conséquences**. Le but : qu'un membre de l'équipe, un juge ou nous-mêmes dans trois semaines comprenions *pourquoi* le projet est construit ainsi.

## Index

| ADR | Titre | Statut | Date | Décideurs |
|---|---|---|---|---|
| [0001](0001-monorepo-pnpm-turborepo.md) | Monorepo TypeScript avec pnpm et Turborepo | Proposé | 2026-10-06 | Équipe |
| [0002](0002-backend-nestjs.md) | NestJS pour le back-end (plutôt que FastAPI) | **Proposé, à confirmer en urgence** | 2026-10-06 | Rôle 2 (back-end) |
| [0003](0003-frontend-react-vite-pwa.md) | PWA React + Vite + Workbox + Dexie | Proposé | 2026-10-06 | Rôle 3 (front-end) |
| [0004](0004-monolithe-modulaire-hexagonal.md) | Monolithe modulaire, architecture hexagonale allégée | Proposé | 2026-10-06 | Back-end |
| [0005](0005-postgresql-prisma.md) | PostgreSQL et Prisma | Proposé | 2026-10-06 | Back-end, DevOps |
| [0006](0006-file-taches-pg-boss.md) | File de tâches dans PostgreSQL avec pg-boss | Proposé | 2026-10-06 | Back-end |
| [0007](0007-temps-reel-sse-listen-notify.md) | Temps réel par SSE et LISTEN/NOTIFY | Proposé | 2026-10-06 | Back-end, front-end |
| [0008](0008-synchronisation-file-actions-idempotence.md) | Hors ligne : file d'actions unique et idempotence | Proposé | 2026-10-06 | Back-end, front-end |
| [0009](0009-sessions-cookie-serveur.md) | Sessions serveur par cookie plutôt que JWT | Proposé | 2026-10-06 | Back-end, sécurité |
| [0010](0010-contrat-api-rest-zod-openapi.md) | Contrat d'API : REST, schémas zod partagés, OpenAPI généré | Proposé | 2026-10-06 | Back-end, front-end |
| [0011](0011-deploiement-docker-compose-caddy.md) | Déploiement Docker Compose + Caddy sur le VPS Systalink | Proposé | 2026-10-06 | DevOps |
| [0012](0012-apercus-partage-route-serveur.md) | Aperçus de partage par injection serveur dans `index.html` | Proposé | 2026-10-06 | Front-end, back-end |
| [0013](0013-workflow-git-trunk-squash.md) | Branches courtes, squash merge, Conventional Commits | Proposé | 2026-10-06 | Équipe |

Tous les ADR sont au statut **Proposé** : ils doivent être relus et acceptés en équipe (point du 6 ou du 7 octobre). Une fois acceptés, on change le statut dans l'ADR et dans cet index, dans une PR `docs(adr)`.

## Cycle de vie

```text
Proposé → Accepté → Déprécié → Remplacé
    ↓
  Rejeté
```

- **Proposé** : en discussion, sous forme de PR.
- **Accepté** : décidé, on implémente.
- **Rejeté** : envisagé puis écarté (on le garde : savoir ce qu'on n'a pas fait est utile).
- **Déprécié** ou **Remplacé** : n'est plus valable ; l'ADR qui le remplace est indiqué.

**On ne réécrit jamais un ADR accepté.** On en écrit un nouveau qui le remplace et on met à jour le statut de l'ancien.

## Quand écrire un ADR

| ADR nécessaire | Pas d'ADR |
|---|---|
| Choix d'un framework, d'une bibliothèque structurante, d'un service | Mise à jour mineure de dépendance |
| Changement du modèle de données qui touche plusieurs modules | Ajout d'une colonne dans un module |
| Format d'API, protocole de synchronisation, sécurité | Correction de bug |
| Abandon ou remplacement d'une décision précédente | Détail d'implémentation interne à un module |

## Créer un ADR

1. Copier [`template.md`](template.md) en `NNNN-titre-court.md` (numéro suivant).
2. Remplir le contexte, les options (au moins deux, avec de vrais inconvénients) et la décision.
3. Ouvrir une PR `docs(adr): NNNN titre`. Relecteurs : les propriétaires des modules concernés.
4. Ajouter la ligne dans l'index ci-dessus dans la même PR.
