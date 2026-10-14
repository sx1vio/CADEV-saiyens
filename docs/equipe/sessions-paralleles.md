# Travail en sessions parallèles (Claude Code)

Plusieurs sessions Claude Code avancent en même temps sur DevHub Africa, chacune sur ses modules, sans se marcher dessus. Ces règles s'ajoutent à [context.md](../../context.md), au [workflow Git](workflow-git.md) et à la [définition de terminé](definition-of-done.md).

## Rôles

| Session                         | Périmètre                                                                                                           | Ne touche pas sans prévenir                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **A** (back-end et intégration) | `apps/api`, `packages/contracts`, `packages/core`, `infra`, docs de suivi (`docs/suivi`, `context.md`, `06-api.md`) | `apps/web/src/pages`, `apps/web/src/components` |
| **B** (front et tests)          | `apps/web` (écrans, file hors ligne, PWA, budget), tests Playwright (`apps/web/e2e`), `03-frontend.md`              | `apps/api`, migrations Prisma                   |
| **C** (option : vérification)   | Revue des PR des autres sessions, essais réels, registre d'anomalies                                                | Code des branches en cours des autres           |

Un besoin hors de son périmètre (un endpoint pour B, un écran pour A) passe par un message à la session concernée, et une ligne dans le tableau.

## Où se synchroniser

- **Tableau partagé** : `/home/Joachim/WORKSPACE/CADEV/coordination/TABLEAU.md` (hors dépôt). On le relit avant de prendre une tâche, on y passe la ligne à « En cours » avec sa branche, puis « En revue » avec le numéro de PR, puis « Fusionnée ». Une ligne par tâche, une tâche à la fois par session.
- **Messages** : `ListAgents` puis `SendMessage` vers le nom de la session (colonne « Nom » du tableau). On prévient à chaque PR ouverte ou fusionnée, à chaque changement de contrat partagé, et quand on est bloqué.
- **Git** : `main` est la seule vérité. Avant de commencer une branche et avant d'ouvrir la PR : `git fetch` et rebase sur `origin/main`.

## Isolation obligatoire

- Chaque session a **son propre dossier** : A travaille dans le dépôt principal, B et C dans un worktree (`git worktree add ../CADEV-saiyens-b -b <branche> origin/main`). Deux sessions dans le même dossier se volent leurs fichiers et leur index Git.
- Chaque session a **sa base de test** (`devhub_test_b`, `devhub_ci_b`…) et **ses ports** (API 3001, web 5174 pour B), pour que les tests e2e ne se mélangent pas.
- `pnpm install` seulement après un changement de `package.json` ou du lockfile, et on prévient l'autre session (le lockfile est partagé par la PR).

## Contrats partagés

`packages/contracts` est le point de rencontre entre l'API et le front. Seule la session A le modifie ; B demande le champ ou l'endpoint dont il a besoin. A ouvre la PR de contrat en premier, la fusionne, puis prévient B, qui rebase avant de l'utiliser.

## Ordre des fusions

1. Une PR par tâche, petite, CI verte (répétition complète sur sa propre base avant de pousser).
2. Fusion sur `main` dès que la CI est verte (mandat du 14 octobre) ; la session prévient les autres.
3. Les autres sessions rebasent leur branche en cours sur `origin/main` avant leur prochaine PR.
4. Conflit sur un fichier partagé (suivi, `context.md`, `pnpm-lock.yaml`) : la session qui fusionne en second le résout, en gardant les deux changements.

## Règles communes

- Pas de co-auteur ni de signature d'outil dans les commits et les PR (règle 2.2 de context.md).
- Toute anomalie trouvée va au [registre](../suivi/anomalies.md) avec le numéro suivant ; on annonce le numéro pris dans le tableau pour éviter les doublons (BUG-025, BUG-026…).
- Le suivi des exigences et le [cahier de livraison](https://claude.ai/artifact/6aWU3KSVDkfH8qdDF8zpj3) sont mis à jour par la session A ; B lui envoie ce qui a changé.
