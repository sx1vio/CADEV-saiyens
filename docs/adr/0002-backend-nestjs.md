# ADR-0002 : NestJS pour le back-end (plutôt que FastAPI)

- **Statut** : **Proposé, à confirmer en urgence.** Le cahier des charges laissait le choix au rôle 2, à figer le 5 octobre au soir (§16). Si l'équipe back-end a déjà choisi FastAPI, cet ADR passe en « Rejeté » et les ADR 0001, 0004, 0006 et 0010 sont à revoir (voir la dernière section).
- **Date** : 2026-10-06
- **Décideurs** : rôle 2 (Caleb, Florent, Joachim)
- **Exigences concernées** : §8, §10

## Contexte

Le cahier des charges propose **Node.js (NestJS) ou Python (FastAPI)**, avec une API REST documentée par OpenAPI. Le front est imposé en React (TypeScript). Trois développeurs back-end vont travailler en parallèle sur des modules distincts pendant 17 jours.

## Critères de décision

- Partager du code avec le front (schémas, masquage des secrets, détection d'étiquettes, formules) : demandé explicitement par la v3.1 (S9 : « dictionnaire partagé entre front et back » ; O9 : « motifs partagés front et back »).
- Une structure modulaire imposée, pour que trois personnes travaillent sans se marcher dessus.
- OpenAPI généré automatiquement.
- Bibliothèques disponibles pour : pg-boss, SSE, OAuth, génération d'images (Proof Card), SMTP.

## Options envisagées

### Option A : NestJS (TypeScript)

- **Pour** : même langage que le front, donc `@devhub/contracts` et `@devhub/core` sont partagés sans duplication ; modules et injection de dépendances natifs, adaptés au monolithe modulaire et à l'hexagonal ; SSE natif (`@Sse()`) ; OpenAPI via `@nestjs/swagger` ou `nestjs-zod` ; pg-boss, `satori` + `resvg` (Proof Card, solution citée par la v3.1) et nodemailer disponibles.
- **Contre** : un framework assez verbeux (décorateurs) ; une petite courbe d'apprentissage pour qui ne connaît qu'Express.

### Option B : FastAPI (Python)

- **Pour** : très productif, OpenAPI natif, Pydantic excellent ; agréable si l'équipe est plus à l'aise en Python.
- **Contre** : **aucun partage de code avec le front**. Il faudrait réécrire en Python les motifs de secrets, le dictionnaire d'étiquettes et les formules, puis garder les deux versions identiques à la main. Structure modulaire à construire soi-même. File de tâches PostgreSQL moins mature (procrastinate). Deux chaînes d'outillage dans le monorepo.

## Décision

Nous proposons **NestJS**, principalement pour le **partage de code** front/back, que la v3.1 rend nécessaire, et pour la **structure modulaire native** adaptée à trois développeurs back-end.

## Version retenue

**NestJS 11.2**, et non la 12 : au 6 octobre 2026, `nestjs-zod` (validation par les schémas partagés, ADR-0010) n'accepte que NestJS 10 et 11. On passera à la 12 quand `nestjs-zod` la supportera.

## Conséquences

### Positives

- Un seul langage, une seule CI, des types de bout en bout.
- Les modules NestJS correspondent un pour un aux contextes métier ([02 · Back-end](../architecture/02-backend.md)).
- Le même code sert l'API et le worker (deux points d'entrée).

### Négatives

- Les décorateurs NestJS ne doivent pas « fuir » dans le domaine : discipline nécessaire, vérifiée par ESLint.

### Risques et parades

- Risque : un membre de l'équipe back-end ne connaît pas NestJS → Parade : module d'exemple complet (`sos`) écrit en premier comme référence, binôme sur la première PR de chacun.

## Si l'équipe choisit FastAPI

Ce qui change :

- `apps/api` en Python (FastAPI + SQLAlchemy 2 ou SQLModel + Alembic), file `procrastinate` ou `pgqueuer`.
- `@devhub/contracts` devient un fichier OpenAPI généré par FastAPI, à partir duquel on génère les types du front (`openapi-typescript`).
- `@devhub/core` reste en TypeScript côté front ; on écrit un équivalent Python côté API pour les secrets et les étiquettes, avec un **jeu de fixtures commun** (fichiers JSON d'entrées et de sorties attendues) testé des deux côtés pour garantir l'identité.
- L'architecture modulaire, l'API, le modèle de données, le hors ligne et le déploiement décrits dans cette documentation **restent valables**.
