# ADR-0001 : Monorepo TypeScript avec pnpm et Turborepo

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Décideurs** : toute l'équipe
- **Exigences concernées** : §8 (stack), §10 (une PR par fonctionnalité), O9 et S9 (règles partagées front/back)

## Contexte

Cinq personnes livrent en 17 jours un front PWA et une API qui partagent beaucoup de règles : schémas de requêtes, masquage des secrets (côté client avant la mise en file, côté serveur avant l'IA), détection d'étiquettes, formules de score affichées sur `/regles`. Une fonctionnalité typique (par exemple S1, poser une question) touche le contrat, l'API et le front.

## Critères de décision

- Changer le contrat et ses deux implémentations dans **une seule PR**.
- Écrire une seule fois les règles qui doivent être identiques des deux côtés.
- Une CI simple, rapide, qui ne reteste pas ce qui n'a pas changé.

## Options envisagées

### Option A : deux dépôts (front, back)

- **Pour** : séparation nette, droits d'accès distincts.
- **Contre** : contrat dupliqué ou publié comme paquet, PR coordonnées, désynchronisations découvertes tard.

### Option B : monorepo pnpm + Turborepo

- **Pour** : paquets partagés locaux (`workspace:*`), une PR atomique, cache de build, filtres « paquets touchés » en CI. Recommandé par le skill `monorepo-management`.
- **Contre** : configuration initiale (une demi-journée), un outil de plus à comprendre.

### Option C : monorepo Nx

- **Pour** : très complet (générateurs, graphe, règles de dépendance intégrées).
- **Contre** : courbe d'apprentissage plus forte, plus de configuration ; surdimensionné pour deux applications et trois paquets.

## Décision

**Option B : monorepo pnpm workspaces + Turborepo**, avec `apps/web`, `apps/api`, `packages/contracts`, `packages/core` et `packages/config`.

## Conséquences

### Positives

- Un changement de schéma casse la compilation du front et de l'API en même temps : on ne découvre pas l'incompatibilité en démo.
- `@devhub/core` garantit le même masquage des secrets et les mêmes formules partout.
- Un seul jeu de règles ESLint, Prettier et TypeScript.

### Négatives

- Tout le monde doit utiliser pnpm (Corepack) et Node 24.
- Le front et l'API partagent une CI : une CI cassée bloque tout le monde.

### Risques et parades

- Risque : CI lente → Parade : cache Turborepo, `--filter=...[origin/main]`, jobs en parallèle.
- Risque : `packages/core` attire du code qui n'a rien à y faire → Parade : règle « zéro dépendance, fonctions pures », vérifiée en revue.

## Mise en œuvre

Squelette créé : `pnpm-workspace.yaml`, `turbo.json`, `package.json` racine. Les paquets sont initialisés le 6 octobre (rôle 4 avec un back-end). Voir [01 · Structure du monorepo](../architecture/01-structure-monorepo.md).
