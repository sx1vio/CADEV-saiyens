# Décisions d'architecture (ADR)

Un ADR (_Architecture Decision Record_) garde la trace d'une décision technique importante : le **contexte**, les **options envisagées**, la **décision** et ses **conséquences**. Le but : qu'un membre de l'équipe, un juge ou nous-mêmes dans trois semaines comprenions _pourquoi_ le projet est construit ainsi.

## Index

| ADR                                                      | Titre                                                               | Statut                                     | Date       | Décideurs           |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | ---------- | ------------------- |
| [0001](0001-monorepo-pnpm-turborepo.md)                  | Monorepo TypeScript avec pnpm et Turborepo                          | Accepté                                    | 2026-10-09 | Équipe              |
| [0002](0002-backend-nestjs.md)                           | NestJS pour le back-end (plutôt que FastAPI)                        | Accepté                                    | 2026-10-09 | Rôle 2 (back-end)   |
| [0003](0003-frontend-react-vite-pwa.md)                  | PWA React + Vite + Workbox + Dexie                                  | Accepté                                    | 2026-10-09 | Rôle 3 (front-end)  |
| [0004](0004-monolithe-modulaire-hexagonal.md)            | Monolithe modulaire, architecture hexagonale allégée                | Accepté                                    | 2026-10-09 | Back-end            |
| [0005](0005-postgresql-prisma.md)                        | PostgreSQL et Prisma                                                | Accepté                                    | 2026-10-09 | Back-end, DevOps    |
| [0006](0006-file-taches-pg-boss.md)                      | File de tâches dans PostgreSQL avec pg-boss                         | Accepté                                    | 2026-10-09 | Back-end            |
| [0007](0007-temps-reel-sse-listen-notify.md)             | Temps réel par SSE et LISTEN/NOTIFY                                 | Accepté                                    | 2026-10-09 | Back-end, front-end |
| [0008](0008-synchronisation-file-actions-idempotence.md) | Hors ligne : file d'actions unique et idempotence                   | Accepté                                    | 2026-10-09 | Back-end, front-end |
| [0009](0009-sessions-cookie-serveur.md)                  | Sessions serveur par cookie plutôt que JWT                          | Accepté                                    | 2026-10-09 | Back-end, sécurité  |
| [0010](0010-contrat-api-rest-zod-openapi.md)             | Contrat d'API : REST, schémas zod partagés, OpenAPI généré          | Accepté                                    | 2026-10-09 | Back-end, front-end |
| [0011](0011-deploiement-docker-compose-caddy.md)         | Déploiement Docker Compose + Caddy sur le VPS Systalink             | Accepté                                    | 2026-10-09 | DevOps              |
| [0012](0012-apercus-partage-route-serveur.md)            | Aperçus de partage par injection serveur dans `index.html`          | Accepté                                    | 2026-10-09 | Front-end, back-end |
| [0013](0013-workflow-git-trunk-squash.md)                | Branches courtes, squash merge, Conventional Commits                | Accepté                                    | 2026-10-09 | Équipe              |
| [0014](0014-repartition-des-xp-entre-etiquettes.md)      | Répartition des Proof XP entre les étiquettes                       | Accepté                                    | 2026-10-09 | Caleb (rôle 1)      |
| [0015](0015-base-de-donnees-systalink.md)                | Base Systalink managée, ou PostgreSQL sur le VPS                    | Accepté                                    | 2026-10-09 | Caleb, Emmanuel     |
| [0016](0016-perimetre-du-mvp.md)                         | Périmètre du MVP, services « écosystème », données de démonstration | Accepté (points 1 et 3 remplacés par 0020) | 2026-10-09 | Caleb (rôle 1)      |
| [0017](0017-tri-des-propositions-v3-1.md)                | Tri des propositions du CDC v3.1                                    | Accepté                                    | 2026-10-09 | Caleb (rôle 1)      |
| [0018](0018-pile-front-reelle.md)                        | Pile front réellement retenue (amende 0003)                         | Accepté                                    | 2026-10-09 | Sylvio, Caleb       |
| [0019](0019-gouvernance-du-depot.md)                     | Gouvernance du dépôt sans protection de branche                     | Accepté                                    | 2026-10-09 | Caleb, Emmanuel     |
| [0020](0020-services-ecosysteme-conserves.md)            | Services « écosystème » conservés, signalés comme aperçus           | Accepté (validation du rôle 1 à confirmer) | 2026-10-16 | Équipe, Joachim     |

Les ADR 0001 à 0013 ont été **acceptés le 9 octobre 2026** par le rôle 1, après vérification de leur conformité au code fusionné ; ceux qui ne sont pas encore implémentés le signalent dans leur statut. Les ADR 0014 à 0019 tranchent les décisions restées ouvertes.

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

| ADR nécessaire                                                      | Pas d'ADR                                   |
| ------------------------------------------------------------------- | ------------------------------------------- |
| Choix d'un framework, d'une bibliothèque structurante, d'un service | Mise à jour mineure de dépendance           |
| Changement du modèle de données qui touche plusieurs modules        | Ajout d'une colonne dans un module          |
| Format d'API, protocole de synchronisation, sécurité                | Correction de bug                           |
| Abandon ou remplacement d'une décision précédente                   | Détail d'implémentation interne à un module |

## Créer un ADR

1. Copier [`template.md`](template.md) en `NNNN-titre-court.md` (numéro suivant).
2. Remplir le contexte, les options (au moins deux, avec de vrais inconvénients) et la décision.
3. Ouvrir une PR `docs(adr): NNNN titre`. Relecteurs : les propriétaires des modules concernés.
4. Ajouter la ligne dans l'index ci-dessus dans la même PR.
