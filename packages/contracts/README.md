# @devhub/contracts : contrat entre le front et l'API

Schémas **zod** et types TypeScript des requêtes et réponses de l'API, et codes d'erreur. Construit en ESM (front) et CommonJS (API) avec `tsup`.

- L'API enveloppe ces schémas avec `createZodDto` (`nestjs-zod`) : validation et documentation OpenAPI.
- Le front type son client HTTP avec les mêmes schémas, et peut valider ses formulaires avec eux.
- **Dépendances autorisées** : `zod` et `@devhub/core`, rien d'autre.

| Fichier         | Contenu                                                         |
| --------------- | --------------------------------------------------------------- |
| `src/errors.ts` | `ERROR_CODES`, `ErrorCode`                                      |
| `src/me.ts`     | `MeResponse` (dont `trust`, PR11), `CodeOfConductResponse` (M3) |
| `src/skills.ts` | `MySkillsResponse` (PR1, X3)                                    |

Règles de modification : [docs/architecture/06-api.md](../../docs/architecture/06-api.md#règles-pour-faire-évoluer-le-contrat). Les changements incompatibles exigent 2 approbations (étiquette `contrat`).
