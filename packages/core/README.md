# @devhub/core : logique pure partagée

Fonctions **pures**, sans dépendance d'exécution, qui doivent donner exactement le même résultat dans le navigateur et sur le serveur. Construit en ESM (front) et CommonJS (API) avec `tsup`.

| Dossier        | Contenu                                                                                                | Exigences     |
| -------------- | ------------------------------------------------------------------------------------------------------ | ------------- |
| `src/scoring/` | `skillScore()`, `skillLevel()`, `githubSignal()`, `computeGithubSignals()` et les constantes `SCORING` | §6.3, PR1, X3 |
| `src/xp/`      | Barème `XP_POINTS`, garde-fous `XP_LIMITS`, `applyDailyCap()`, `splitPoints()`                         | §6.3, X1, X2  |
| `src/secrets/` | `maskSecrets()` : clés, jetons, chaînes de connexion, clés privées                                     | O9, §6.1, §9  |

À venir : `src/tags/` (détection d'étiquettes, S9), `src/quality/` (jauge de qualité, S8), formules du matching (§6.2, X4).

Objectif de couverture : **100 %** (branches, fonctions, lignes), bloquant en CI (`pnpm --filter @devhub/core test`). Spécification : [docs/architecture/08-algorithmes.md](../../docs/architecture/08-algorithmes.md).
