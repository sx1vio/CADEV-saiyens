# ADR-0004 : Monolithe modulaire, architecture hexagonale allégée

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1), conforme au code fusionné sur `main`.
- **Date** : 2026-10-06
- **Décideurs** : back-end
- **Exigences concernées** : §8, §9 (tests du matching et des XP), §10 (aucune connaissance détenue par une seule personne)

## Contexte

Trois développeurs back-end en parallèle, 13 contextes métier, une logique sensible (matching, XP, idempotence) qui doit être testée sans base, et un seul VPS pour tout héberger.

## Options envisagées

### Option A : microservices

- **Pour** : isolation forte, déploiements indépendants.
- **Contre** : réseau, transactions distribuées, observabilité, plusieurs déploiements… Impossible à tenir en 17 jours ; l'attribution d'XP doit être dans la **même transaction** que la validation.

### Option B : monolithe « en couches » classique (contrôleurs → services → Prisma)

- **Pour** : le plus rapide à démarrer.
- **Contre** : la logique métier se mélange avec Prisma et HTTP ; tests lents (base obligatoire) ; à trois, conflits permanents dans des services partagés.

### Option C : monolithe modulaire, hexagonal allégé

- **Pour** : un seul déployable ; modules par contexte métier (DDD) ; cœur métier testable sans base (ports et adaptateurs) ; frontières claires entre développeurs. Approche recommandée par le skill `architecture-patterns`.
- **Contre** : un peu plus de fichiers (ports, mappers) ; discipline sur les imports.

## Décision

**Option C**, avec un **niveau d'abstraction proportionné** :

- hexagonal complet pour `sos`, `matching`, `reputation`, `sync`, `rooms` ;
- un port et un adaptateur pour `github`, `ai`, `notifications` ;
- services de lecture directs pour `discovery`, `platform` et la lecture du Passport ;
- service + Prisma pour le CRUD simple (`moderation`, réglages).

Deux mécanismes de communication entre modules, et seulement deux : **appel par port dans la même transaction**, ou **événement métier vers un job pg-boss** (boîte d'envoi transactionnelle).

## Conséquences

### Positives

- Les règles du cahier des charges (§6) sont testées unitairement, rapidement.
- Un module peut être extrait plus tard (l'IA, par exemple) sans réécrire le domaine.

### Négatives

- Il faut écrire des mappers entre les lignes Prisma et les entités.

### Risques et parades

- Risque : un module lit les tables d'un autre « pour aller vite » → Parade : règle ESLint `no-restricted-paths` + point de revue. Exception documentée : les lectures de `discovery` et `platform`.
- Risque : sur-ingénierie → Parade : le tableau des niveaux ci-dessus ; en cas de doute, on choisit le niveau le plus simple.

## Mise en œuvre

[02 · Back-end](../architecture/02-backend.md). Le module `sos` sert de référence et est écrit en premier.
