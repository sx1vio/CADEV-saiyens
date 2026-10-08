# ADR-0013 : Branches courtes, squash merge, Conventional Commits

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Décideurs** : toute l'équipe
- **Exigences concernées** : §10 (« branches courtes, une PR par fonctionnalité, relue par une autre personne, fusion vers main seulement si le déploiement de test passe ») ; §15 (« historique de commits régulier »)

## Contexte

Cinq personnes, un seul `main` déployé automatiquement en production, et un historique de commits qui sera regardé par le jury. Les skills `git-collaboration` et `git-commits` décrivent les pratiques retenues.

## Options envisagées

| Option                                                                             | Pour                                                                               | Contre                                                                            |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Développement « trunk-based » avec branches courtes (< 2 jours) + squash merge** | Peu de conflits, `main` toujours déployable, historique lisible (un commit par PR) | Il faut découper le travail finement                                              |
| Git Flow (`develop`, `release/*`)                                                  | Structure connue                                                                   | Lourd pour 20 jours et un seul environnement ; fusions tardives et conflictuelles |
| Merge commits                                                                      | Garde tout l'historique des branches                                               | Historique de `main` illisible                                                    |
| Rebase merge                                                                       | Historique linéaire, commits conservés                                             | Exige des commits parfaits dans chaque PR                                         |

## Décision

- Branches courtes depuis `main`, nommées `type/module-sujet` (par exemple `feat/sos-ask-question`).
- **Conventional Commits** (`feat(sos): …`), vérifiés par commitlint.
- **Squash merge** uniquement ; le titre de la PR devient le message du commit sur `main`, au format Conventional Commits.
- `main` protégée : PR obligatoire, **1 approbation** d'une autre personne, CI verte, branche à jour, historique linéaire, pas de force-push.
- Gel du 22 octobre : seules les PR `fix` approuvées par le rôle 4 passent.

## Conséquences

### Positives

- `main` reste déployable à tout moment ; l'historique raconte le projet (une ligne par fonctionnalité).

### Négatives

- Les grosses fonctionnalités doivent être découpées (drapeaux de fonctionnalité si besoin).

## Mise en œuvre

[Workflow Git](../equipe/workflow-git.md), [`.github/pull_request_template.md`](../../.github/pull_request_template.md), [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
