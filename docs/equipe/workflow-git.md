# Workflow Git

Décision : [ADR-0013](../adr/0013-workflow-git-trunk-squash.md). Ce document est le mode d'emploi au quotidien. Il s'appuie sur les skills `git-collaboration` et `git-commits` installés dans `.claude/skills/`.

## En résumé

1. `main` est toujours déployable : chaque fusion part en production.
2. On travaille sur une **branche courte** (moins de 2 jours), créée depuis `main` à jour.
3. Une PR = une fonctionnalité ou une correction, **relue par une autre personne**.
4. CI verte + 1 approbation → **squash merge**.
5. On supprime la branche après la fusion.

## Branches

### Nommage

```text
<type>/<module>-<sujet-court>
```

| Exemple | Usage |
|---|---|
| `feat/sos-ask-question` | Nouvelle fonctionnalité |
| `fix/sync-duplicate-answer` | Correction de bug |
| `refactor/matching-extract-score` | Refonte sans changement de comportement |
| `test/rooms-take-task` | Tests uniquement |
| `docs/adr-0014-search` | Documentation, ADR |
| `chore/deps-update-prisma` | Outillage, dépendances, configuration |
| `ci/add-lighthouse` | CI/CD |

Le type reprend les types de Conventional Commits ; le module, le nom du module back-end ou de la fonctionnalité front (`sos`, `rooms`, `passport`, `offline`, `infra`…).

### Cycle de vie d'une branche

```bash
# 1. Partir de main à jour
git switch main
git pull

# 2. Créer la branche
git switch -c feat/sos-ask-question

# 3. Travailler par petits commits atomiques
git add apps/api/src/modules/sos/application/ask-question.ts
git commit -m "feat(sos): add AskQuestion use case"

# 4. Se remettre à jour avec main au moins une fois par jour
git fetch origin
git rebase origin/main
git push --force-with-lease          # seulement sur SA branche, jamais sur main

# 5. Ouvrir la PR
git push -u origin feat/sos-ask-question
gh pr create --fill

# 6. Après la fusion
git switch main && git pull
git branch -d feat/sos-ask-question
```

### Règles

- **Jamais** de commit direct sur `main` (la protection l'interdit de toute façon).
- **Jamais** de `git push --force` sans `--with-lease`, et jamais sur une branche partagée avec quelqu'un d'autre.
- Pendant la revue, on corrige par **nouveaux commits** (le relecteur voit ce qui a changé). Pas d'`amend` ni de réécriture une fois la revue commencée : le squash fera le ménage.
- Une branche qui vit plus de 2 jours est probablement trop grosse : on la découpe (voir plus bas).

## Commits : Conventional Commits

```text
<type>(<portée>): <sujet à l'impératif, en anglais, < 72 caractères>

<corps facultatif : pourquoi, et pas seulement quoi>

<pied : Refs #12, Closes #34, BREAKING CHANGE: …>
```

| Type | Quand |
|---|---|
| `feat` | Fonctionnalité visible par l'utilisateur |
| `fix` | Correction de bug |
| `refactor` | Changement de code sans changement de comportement |
| `perf` | Amélioration de performance |
| `test` | Ajout ou modification de tests |
| `docs` | Documentation |
| `style` | Formatage seul (rare : Prettier s'en charge) |
| `chore` | Outillage, dépendances, configuration |
| `ci` | Pipeline CI/CD |

**Portées** autorisées : `api`, `web`, `core`, `contracts`, `infra`, `docs`, `adr`, et les modules `identity`, `passport`, `reputation`, `sync`, `sos`, `matching`, `notifications`, `discovery`, `rooms`, `github`, `ai`, `moderation`, `platform`, `offline`, `i18n`, `ui`. Elles sont vérifiées par commitlint.

Exemples :

```text
feat(sos): add AI hint job with 10s timeout
fix(sync): return stored response on replayed idempotency key
refactor(matching): extract eligibility filter into core
test(reputation): cover daily XP cap with fast bonus
docs(adr): propose 0014 semantic search with pgvector
```

**Pourquoi des messages en anglais ?** C'est la convention de l'écosystème (outils, changelogs). La documentation, les PR et les issues restent en **français**. Si l'équipe préfère des messages en français, on le décide une fois pour toutes et on adapte cette page.

**Commits atomiques** : un commit = un changement logique, qu'on peut décrire en une phrase. On sépare la refonte du changement de comportement. On ne commite pas de code de débogage (`console.log`, `debugger`).

## Pull requests

### Taille

| Taille | Lignes modifiées (hors fichiers générés et migrations) | Conseil |
|---|---|---|
| Idéale | 50 à 300 | Relue en 15 minutes |
| Acceptable | 300 à 400 | Prévenir le relecteur |
| Trop grosse | Plus de 400 | **Découper** : d'abord le contrat et le domaine, puis l'API, puis le front |

Pour livrer une grosse fonctionnalité par morceaux sans casser `main` : drapeau de fonctionnalité (`FEATURE_ROOMS_AI=false`) ou route non encore liée dans le menu.

### Titre et description

- **Titre** au format Conventional Commits : il devient le message du commit sur `main` après le squash. Exemple : `feat(sos): ask a question with offline queue support`.
- **Description** : le [modèle de PR](../../.github/pull_request_template.md) se remplit automatiquement. On y met l'identifiant de user story (`S1`), comment tester, des captures pour le front, et les points d'attention pour le relecteur.

### Qui relit

- **Au moins 1 approbation** d'une personne qui n'a pas écrit le code (§10).
- Les **CODEOWNERS** ajoutent automatiquement le propriétaire du module concerné.
- Étiquette `contrat` (API, `/sync`, idempotence, SSE) : **2 approbations**, celle d'un back-end et celle de Sylvio.
- Fichiers `infra/`, `.github/workflows/`, modules `identity`, `sync` et `moderation` : Emmanuel en relecteur obligatoire.
- Délai de relecture visé : **4 heures ouvrées**. Pendant le challenge, une PR qui attend bloque quelqu'un. Les relectures passent avant le nouveau code.

### Fusion

- **Squash merge uniquement** (les autres modes sont désactivés dans les réglages du dépôt).
- Conditions (protection de `main`) : CI verte, 1 approbation, conversations résolues, branche à jour avec `main`.
- C'est l'**auteur** qui fusionne, une fois approuvé, et qui vérifie ensuite le déploiement en production (smoke test vert, fonctionnalité visible sur l'URL).

## Protection de `main` (réglages GitHub)

À configurer par Emmanuel, dans *Settings → Branches → Branch protection rules* (ou *Rulesets*) :

| Réglage | Valeur |
|---|---|
| Require a pull request before merging | Oui, **1** approbation |
| Dismiss stale approvals when new commits are pushed | Oui |
| Require review from Code Owners | Oui |
| Require status checks to pass | Oui : `lint`, `typecheck`, `test`, `build`, `e2e`, `security` |
| Require branches to be up to date before merging | Oui |
| Require conversation resolution | Oui |
| Require linear history | Oui |
| Allow force pushes / deletions | Non |
| Do not allow bypassing the above settings | Oui (y compris pour les administrateurs) |
| Merge button : allow squash merging only | Oui ; « Default to PR title for squash merge commits » |
| Automatically delete head branches | Oui |

## Conflits

- **Prévention** : on se remet à jour avec `main` tous les jours, on garde les PR petites, et chacun travaille surtout dans ses modules.
- Fichiers à conflits fréquents : `schema.prisma`, fichiers de traduction, `app.module.ts`, `router.tsx`. On y ajoute ses lignes **à la fin de la section concernée**, et on fusionne vite.
- **Migrations Prisma** : deux personnes qui créent une migration en même temps entrent en conflit. On annonce au point quotidien qu'on va toucher le schéma. En cas de conflit, celui qui fusionne en second **régénère** sa migration après rebase (`prisma migrate dev`), au lieu de fusionner les fichiers SQL à la main.
- **Résolution** pendant un rebase : on corrige le fichier, `git add`, `git rebase --continue`. En cas de doute : `git rebase --abort` et on demande de l'aide.

## Jalons et étiquettes de version

À chaque jalon tenu, Emmanuel pose une étiquette sur `main` :

| Étiquette | Date | Jalon |
|---|---|---|
| `v0.1.0` | 8 oct. | Connexion, profil, base, URL Systalink |
| `v0.2.0` | 14 oct. | Parcours SOS Dev de bout en bout |
| `v0.3.0` | 16 oct. | Hors ligne sur vrai téléphone |
| `v0.4.0` | 18 oct. | Salles de projet |
| `v1.0.0-rc` | 22 oct. | Gel du code |
| `v1.0.0` | 24 oct. | Version soumise |

```bash
git tag -a v0.2.0 -m "Jalon 2 : parcours SOS Dev de bout en bout"
git push origin v0.2.0
```

## Gel du code

À partir du **jeudi 22 octobre** :

- Seules les PR de type `fix` sont fusionnées, et seulement pour des bugs **critiques ou visibles en démo**.
- Chaque PR de gel exige l'approbation d'**Emmanuel** (rôle 4) en plus de la relecture normale.
- Pas de nouvelle dépendance, pas de migration, sauf correction critique validée par toute l'équipe.
- Le 25 octobre : **aucun changement de code**.

## Correctif urgent en production

```bash
git switch main && git pull
git switch -c fix/<module>-<sujet>
# correction + test qui reproduit le bug
git commit -m "fix(<module>): <ce qui est corrigé>"
git push -u origin fix/<module>-<sujet>
gh pr create --label "fix,démo" --fill
```

La relecture est prioritaire sur tout le reste. Si le correctif n'est pas prêt rapidement, on revient à l'image précédente (`infra/scripts/deploy.sh <sha précédent>`) plutôt que de corriger dans la précipitation.
