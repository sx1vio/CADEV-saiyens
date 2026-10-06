# @devhub/core : logique pure partagée

Fonctions **pures**, sans dépendance d'exécution, qui doivent donner exactement le même résultat dans le navigateur et sur le serveur :

| Dossier        | Contenu                                                                                                              | Exigences          |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `src/secrets/` | `maskSecrets()` : détection et masquage des clés, jetons, chaînes de connexion                                       | O9, §6.1, §9       |
| `src/tags/`    | `detectTags()` : dictionnaire « motif d'erreur → étiquettes »                                                        | S9                 |
| `src/quality/` | `questionQuality()` : jauge de complétude d'une question                                                             | S8                 |
| `src/scoring/` | `matchScore()`, `pickHelpers()`, `skillScore()`, `applyDailyCap()`, `splitPoints()` + `config.ts` (poids et barèmes) | §6.2, §6.3, X3, X4 |

Objectif de couverture : **100 % des branches** (bloquant en CI). Spécification : [docs/architecture/08-algorithmes.md](../../docs/architecture/08-algorithmes.md).
