# ADR-0010 : Contrat d'API : REST, schémas zod partagés, OpenAPI généré

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Décideurs** : back-end, front-end
- **Exigences concernées** : §8 (« API REST documentée, OpenAPI »), §9 (« validation de schéma sur chaque endpoint »)

## Contexte

L'API doit être documentée en OpenAPI, chaque endpoint doit valider ses entrées, et le front doit rester synchrone avec l'API pendant 17 jours de changements rapides.

## Options envisagées

| Option                                                                                                     | Pour                                                                                                   | Contre                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Schémas zod dans `@devhub/contracts` → validation NestJS (`nestjs-zod`) + OpenAPI généré + types front** | Une seule source ; compile-time des deux côtés ; validation et documentation alignées par construction | Dépendance à l'intégration zod/NestJS                                                           |
| OpenAPI écrit à la main, types générés                                                                     | Standard                                                                                               | Spécification qui dérive du code                                                                |
| Classes DTO NestJS (`class-validator`) + Swagger                                                           | Idiomatique NestJS                                                                                     | Types non partagés avec le front (décorateurs côté serveur) ; double travail                    |
| tRPC                                                                                                       | Types de bout en bout sans effort                                                                      | Pas REST, pas OpenAPI (contraire au cahier des charges), URL moins adaptées au cache hors ligne |
| GraphQL                                                                                                    | Requêtes flexibles                                                                                     | Pas demandé ; cache hors ligne et idempotence plus complexes                                    |

## Décision

**REST** avec les conventions de [06 · Contrat d'API](../architecture/06-api.md) (problem+json, pagination par curseur, `Idempotency-Key`), et des **schémas zod partagés** dans `@devhub/contracts`, qui servent à la validation côté API, à la génération OpenAPI (`/api/docs`) et au typage du client front.

## Conséquences

### Positives

- Un champ renommé casse la compilation des deux côtés dans la même PR.
- La documentation OpenAPI est toujours exacte.

### Négatives

- Il faut accepter quelques URL d'action (`/answers/:id/accept`), justifiées dans le document d'API.
