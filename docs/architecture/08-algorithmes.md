# 08 · Algorithmes : matching, Proof XP, scores

Ces règles sont le **cœur de la crédibilité** du produit. Elles sont implémentées comme **fonctions pures** dans `packages/core/src/scoring/`, testées à 100 % des branches, et affichées telles quelles sur la page publique `/regles` (X5). Le cahier des charges v3 (§6.2, §6.3) fait foi ; les correctifs v3.1 X3 et X4 sont intégrés et signalés.

> Les poids et barèmes sont des **valeurs de départ** (§6.2). Ils vivent dans `packages/core/src/scoring/config.ts`, pas en dur dans les fonctions, pour pouvoir les ajuster après les premiers tests.

## 1. Matching SOS Dev (§6.2, X4, S10, PR10)

### Éligibilité

Un dev est éligible pour une question si **toutes** ces conditions sont vraies :

| Condition                                                                                                                   | Source     |
| --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Actif : `last_seen_at` de moins de 30 jours                                                                                 | §6.2       |
| Différent de l'auteur                                                                                                       | §6.2       |
| Au moins une étiquette commune entre la question et ses compétences (`user_skills.score > 0`) ou sa liste « Je peux aider » | §6.2, PR10 |
| Mode « ne pas déranger » désactivé                                                                                          | §6.2       |
| Moins de 5 sollicitations dans les 24 dernières heures                                                                      | §6.2       |
| Pas déjà sollicité pour cette question (vague précédente)                                                                   | Escalade   |
| Compte non supprimé, non démo (sauf si l'auteur est lui-même un compte démo)                                                | §6.6       |

La présélection se fait en SQL (index sur `user_skills (tag_id, score)` et `match_events (helper_id, notified_at)`). Le score se calcule ensuite en mémoire sur au plus 200 candidats.

### Score

```text
Score = 100 × (wE·E' + wS·S + wF·F + wD·D + wR·R + wL·L) + bonus_aide
```

| Terme          | Critère                             | Calcul                                                                                                                                                                   |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **E**          | Expérience réelle du problème       | `min(n, 10) / 10`, avec `n` = somme, pour chaque réponse validée du dev, de `(étiquettes communes / étiquettes de la question)`                                          |
| **E'**         | E corrigé au démarrage à froid (X4) | Régime « démarrage à froid » : `max(E, 0,5 × G_tag / 40)`, où `G_tag` est le meilleur signal GitHub du dev parmi les étiquettes de la question. Régime normal : `E' = E` |
| **S**          | Stack commune                       | Part des étiquettes de la question présentes dans les compétences du dev                                                                                                 |
| **F**          | Fuseau horaire                      | 1 si l'écart est ≤ 1 h ; 0,7 si ≤ 3 h ; 0,3 au-delà                                                                                                                      |
| **D**          | Disponibilité                       | 1 si disponible maintenant ou dans un créneau déclaré en cours ; 0,5 si disponible plus tard dans la journée ; 0 sinon                                                   |
| **R**          | Réputation                          | `min(Proof XP total, 500) / 500`                                                                                                                                         |
| **L**          | Langue (S10)                        | 1 si la langue de la question est parmi celles du dev ; 0,5 si la traduction automatique est disponible ; 0 sinon                                                        |
| **bonus_aide** | « Je peux aider » (PR10)            | +5 points si une étiquette de la question figure dans la liste « Je peux aider » du dev                                                                                  |

### Poids selon le régime (X4)

| Régime                | Condition                                             | wE   | wS   | wF   | wD   | wR   | wL   |
| --------------------- | ----------------------------------------------------- | ---- | ---- | ---- | ---- | ---- | ---- |
| **Démarrage à froid** | Moins de 50 réponses validées sur toute la plateforme | 0,10 | 0,40 | 0,15 | 0,15 | 0,10 | 0,10 |
| **Normal** (v3)       | 50 réponses validées ou plus                          | 0,35 | 0,25 | 0,15 | 0,10 | 0,10 | 0,05 |

Pourquoi : au lancement, personne n'a de réponse validée, E vaut 0 pour tous, et 35 % du score ne sert à rien pendant toute la période de démo. Le régime est enregistré dans `match_events.regime` pour l'analyse.

### Sélection

1. Trier par score décroissant ; à égalité, le dev **le moins sollicité récemment** passe devant.
2. Retenir les **3 premiers**.
3. Moins de 3 éligibles : la question est ouverte à toute la stack (elle apparaît dans le flux de chaque étiquette et dans « Personne n'a encore répondu »).
4. Écrire une ligne `match_events` par aidant (score, rang, régime, raisons), puis les notifier (application, et e-mail ou Telegram s'ils ne sont pas connectés).

### Raisons affichées

Jamais un pourcentage de compatibilité sans méthode (§6.2). On affiche **au plus deux raisons**, choisies dans cet ordre de priorité :

| Code             | Condition                 | Texte (FR)                                        |
| ---------------- | ------------------------- | ------------------------------------------------- |
| `solved_similar` | E ≥ 0,1                   | « A déjà résolu {count} problèmes liés à {tags} » |
| `github_repos`   | Régime froid et G_tag > 0 | « A {count} dépôts {tag} actifs »                 |
| `can_help`       | Bonus « Je peux aider »   | « Se propose pour aider en {tag} »                |
| `same_timezone`  | F = 1                     | « Même fuseau horaire »                           |
| `available_now`  | D = 1                     | « Disponible maintenant »                         |
| `translated`     | L = 0,5                   | « Recevra ta question traduite en {lang} »        |

### Implémentation

| Élément                                                                                        | Où                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Éligibilité en mémoire, score, régime, raisons, sélection                                      | `packages/core/src/scoring/matching.ts` (`MATCHING`, `scoreHelper`, `pickHelpers`), couvert à 100 %                           |
| Fuseau (`timezoneOffsetMinutes`) et disponibilité (`availabilityAt`, terme D)                  | même fichier ; créneaux lus dans le fuseau du dev                                                                             |
| Présélection SQL (200 candidats), écriture des `match_events` et notifications `match.request` | `apps/api/src/modules/matching/infrastructure/prisma-matching.store.ts`                                                       |
| Vague 1, escalade, « Je m'en occupe »                                                          | `apps/api/src/modules/matching/application/run-wave.ts`, jobs `matching.run` (envoyé par S1) et `matching.escalate` (+15 min) |

Une vague déjà envoyée n'est jamais rejouée (nouvel essai d'un job) : `wavesDone`. Les raisons enregistrées portent le libellé des étiquettes (`{ code: "github_repos", params: { count: 6, tag: "Kubernetes" } }`). La langue vaut 0,5 seulement quand la traduction (S10) sera active ; elle vaut 0 en attendant.

### Escalade à 15 minutes

Le job `matching.escalate` s'exécute 15 minutes après la première vague. Il ne fait rien si la question a une réponse, si elle est résolue, ou si un « Je m'en occupe » est actif (le statut expire après 20 minutes sans réponse, S11). Sinon, il relance la sélection en excluant les aidants déjà sollicités (vague 2) et marque `questions.escalated_at`.

## 2. Proof XP (§6.3)

### Barème

| Action                                                | `kind`                | Points | Bénéficiaire | Étiquettes créditées  | Remarque                                               |
| ----------------------------------------------------- | --------------------- | ------ | ------------ | --------------------- | ------------------------------------------------------ |
| Réponse validée par l'auteur                          | `answer_accepted`     | +10    | Répondant    | Celles de la question |                                                        |
| Bonus de vitesse : validée < 15 min après la question | `answer_fast_bonus`   | +3     | Répondant    | Celles de la question | **Hors plafond quotidien**                             |
| Réponse jugée utile par un pair                       | `answer_helpful_vote` | +2     | Répondant    | Celles de la question | 5 votes comptés au maximum par réponse                 |
| Contribution acceptée dans une salle                  | `task_completed`      | +15    | Contributeur | Stack de la salle     | Source affichée : vérifiée par GitHub ou déclarée (R9) |
| Revue de code donnée                                  | `code_review_given`   | +8     | Relecteur    | Stack de la salle     | Confirmée par le demandeur                             |
| Projet partagé avec démo en ligne                     | `project_demo_shared` | +5     | Créateur     | Stack de la salle     | Une fois par projet                                    |
| Question résolue (auteur)                             | `question_resolved`   | +1     | Auteur       | Aucune                | Encourage la clôture                                   |

Quand une action crédite plusieurs étiquettes, **un événement est écrit par étiquette**, avec les points divisés en entiers (reste attribué à la première étiquette) : 10 points sur 3 étiquettes donnent 4 + 3 + 3. Le total de l'utilisateur ne dépend donc pas du nombre d'étiquettes. **Implémenté le 8 octobre** (`splitPoints` dans `@devhub/core`, `planGain` dans `reputation`). Les parts nulles (2 points sur 3 étiquettes) ne créent pas d'événement. Le cahier des charges dit seulement « attribués aux étiquettes de la question » : si l'équipe préfère créditer les points sur **chaque** étiquette pour le score de compétence tout en ne les comptant qu'une fois dans le total, il faudra distinguer « XP total » et « XP par étiquette » dans le journal. Décision prise : répartition, voir l'[ADR-0014](../adr/0014-repartition-des-xp-entre-etiquettes.md).

### Garde-fous (X2)

| Garde-fou                                                           | Implémentation                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plafond de **60 XP par jour** (UTC), hors bonus de vitesse          | Avant l'insertion : somme des points du jour ; on n'attribue que ce qui reste sous le plafond (événement partiel), et le résultat signale `daily_cap`. Un verrou consultatif par utilisateur (`pg_advisory_xact_lock`) rend le calcul exact en concurrence |
| Voter pour soi interdit                                             | Refus dans le cas d'usage (`403 xp.self_vote`)                                                                                                                                                                                                             |
| Au plus **2 validations par paire auteur-répondant et par semaine** | Au-delà, la validation est acceptée (la question est résolue) mais **sans XP** (`pair_weekly_limit`) ; l'interface l'explique. Comptage par `xp_events.counterpart_id` sur 7 jours glissants                                                               |
| Compte de moins de 24 h exclu des votes                             | Le vote est enregistré par `sos` mais ne rapporte pas d'XP (`voter_too_new`)                                                                                                                                                                               |
| Au plus **5 votes rémunérés** par réponse, un par votant            | Au-delà : `vote_cap` ; un même votant : `already_awarded`                                                                                                                                                                                                  |
| Double gain impossible                                              | Vérification dans le cas d'usage, et contrainte unique `xp_events_unique_gain` sur `(user_id, kind, source_type, source_id, tag_id, counterpart_id)`                                                                                                       |
| Abus confirmé                                                       | Événement `revert` à points négatifs, lié par `reverts_id`, et action journalisée dans `admin_actions`                                                                                                                                                     |
| Limitation du débit et signalement                                  | Voir [10 · Sécurité](10-securite.md)                                                                                                                                                                                                                       |

### Vérification de cohérence

Une requête de contrôle, exécutée en CI sur les données de test et disponible pour l'administrateur, vérifie que pour chaque utilisateur et chaque étiquette :

```text
user_skills.xp_tag = SUM(xp_events.points) WHERE user_id = … AND tag_id = …
```

## 3. Score de compétence (§6.3, X3)

```text
score(tag) = min(100, G + P)
G = min(40, 5 × n_qualifiés)
P = min(60, xp_tag)
```

**Dépôt qualifié** (correctif X3, contre les dépôts vides) : non forké, taille non nulle, mis à jour depuis moins de 24 mois, et la technologie représente **au moins 20 %** du code d'après l'API `languages` de GitHub.

| Score    | Niveau   |
| -------- | -------- |
| 0 à 29   | Débutant |
| 30 à 59  | Confirmé |
| 60 à 79  | Avancé   |
| 80 à 100 | Expert   |

Correspondance langages GitHub ↔ étiquettes : par le champ `tags.aliases` (par exemple, l'étiquette `typescript` a l'alias GitHub `TypeScript`). Les frameworks (React, NestJS…) ne sont pas détectables par l'API `languages` : leur G se calcule à partir des **topics** du dépôt et de la présence de dépendances connues dans `package.json` (lecture facultative, P1). À défaut, G = 0 et seul P compte.

Le Passport affiche **toujours** la décomposition G + P (barre bicolore, PR7) et les liens vers les preuves de chaque partie.

## 4. Statistiques du Passport et de l'impact

Toutes les statistiques sont calculées par des requêtes sur les tables. Aucune n'est saisie à la main.

| Statistique                                 | Définition précise (Y9)                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Temps avant la **première réponse humaine** | Délai entre `questions.created_at` et la première `answers.created_at` dont l'auteur n'est pas l'auteur de la question. La piste IA n'est **pas** une réponse. Questions de comptes démo exclues |
| Temps médian de première réponse            | Médiane (`percentile_cont(0.5)`) de la valeur ci-dessus sur les questions qui ont au moins une réponse humaine                                                                                   |
| Temps de résolution                         | Délai entre `created_at` et `resolved_at`                                                                                                                                                        |
| Questions résolues                          | `status = 'resolved'`, hors comptes démo                                                                                                                                                         |
| Devs inscrits                               | `users` non démo, non supprimés                                                                                                                                                                  |
| Échanges entre langues                      | Réponses validées où la langue de la question n'est pas parmi les langues du répondant                                                                                                           |
| Devs débloqués (Passport)                   | Nombre de réponses validées dont le dev est l'auteur                                                                                                                                             |

## 5. Classement par pays (D2)

- Score d'un pays = somme des Proof XP nets (`xp_events`) des devs de ce pays, sur la période (total ou saison mensuelle, D7).
- Exclusions : comptes démo, comptes non listés (PR14), devs sans pays déclaré.
- Le calcul est expliqué sous le classement, et chaque pays renvoie à la liste de ses devs et à leurs journaux.

## Tests attendus (`packages/core`)

| Fonction        | Cas de test indispensables                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `isEligible`    | Chaque condition isolément ; frontière exacte de 30 jours et de 5 sollicitations                                   |
| `matchScore`    | Valeurs de chaque terme ; bascule de régime à 49 → 50 réponses ; bonus « Je peux aider » ; L = 0,5 avec traduction |
| `pickHelpers`   | Égalités (le moins sollicité gagne) ; moins de 3 éligibles ; exclusion de la vague précédente                      |
| `skillScore`    | Plafonds de G et de P ; dépôt forké, vide, ancien ou sous 20 % ignoré ; niveaux aux frontières 29/30, 59/60, 79/80 |
| `applyDailyCap` | Plafond exact ; bonus de vitesse hors plafond ; attribution partielle                                              |
| `splitPoints`   | 10 sur 1, 2, 3, 4 étiquettes ; total toujours conservé                                                             |
| `reasonsFor`    | Ordre de priorité ; au plus deux raisons                                                                           |
