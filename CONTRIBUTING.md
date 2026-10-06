# Contribuer à DevHub Africa

Merci de lire ce guide avant votre première PR. Les détails sont dans [`docs/equipe/`](docs/equipe/).

## Les 10 règles

1. **`main` est toujours déployable.** Chaque fusion part en production sur l'URL de démo.
2. **Une branche courte par fonctionnalité** (moins de 2 jours), créée depuis `main` à jour : `feat/sos-ask-question`.
3. **Commits atomiques au format Conventional Commits** : `feat(sos): add AI hint job`.
4. **Une PR = une user story** (identifiant du cahier des charges dans la description), 400 lignes au maximum.
5. **Relue par une autre personne** avant fusion ; 2 approbations si l'étiquette `contrat` est posée.
6. **Squash merge** uniquement ; le titre de la PR (au format Conventional Commits) devient le commit sur `main`.
7. **La documentation suit le code** : contrat d'API, modèle de données ou ADR mis à jour dans la même PR.
8. **Aucun secret dans le dépôt**, aucun texte en dur dans l'interface (FR et EN), aucune donnée inventée présentée comme réelle.
9. **Respecter l'architecture** : couches du back-end, frontières entre modules, toutes les écritures passent par la file côté front.
10. **« Terminé » veut dire « fonctionne sur la production, testé par quelqu'un d'autre »** : voir la [définition de « terminé »](docs/equipe/definition-of-done.md).

## Guides

| Sujet | Document |
|---|---|
| Branches, commits, PR, gel du code | [Workflow Git](docs/equipe/workflow-git.md) |
| Relire une PR | [Revue de code](docs/equipe/revue-de-code.md) |
| Critères de fin | [Définition de « terminé »](docs/equipe/definition-of-done.md) |
| Qui fait quoi | [Organisation](docs/equipe/organisation.md) |
| Vocabulaire | [Glossaire](docs/equipe/glossaire.md) |
| Architecture | [Documentation technique](docs/README.md) |

## Skills Claude Code

Le dossier [`.claude/skills/`](.claude/skills/) contient des skills partagés (architecture, conception d'API, ADR, monorepo, Git, revue de code). Claude Code les charge automatiquement dans ce dépôt. Ils viennent de [wshobson/agents](https://github.com/wshobson/agents) et [daleseo/git-skills](https://github.com/daleseo/git-skills), sous licence MIT.

## Signaler un problème

Ouvrir une issue avec le modèle adapté (bug ou user story). Pour une faille de sécurité, prévenir directement Emmanuel (rôle sécurité) au lieu d'ouvrir une issue publique.
