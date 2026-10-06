# @devhub/contracts : contrat entre le front et l'API

Schémas **zod** et types TypeScript de toutes les requêtes et réponses de l'API, ainsi que les codes d'erreur.

- L'API valide chaque requête avec ces schémas et en génère l'OpenAPI.
- Le front type son client HTTP et valide ses formulaires avec eux.
- **Dépendances autorisées** : `zod` et `@devhub/core`, rien d'autre.

Règles de modification : [docs/architecture/06-api.md](../../docs/architecture/06-api.md#règles-pour-faire-évoluer-le-contrat). Les changements incompatibles exigent 2 approbations (étiquette `contrat`).
