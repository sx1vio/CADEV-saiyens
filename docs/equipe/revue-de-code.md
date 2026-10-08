# Revue de code

Le cahier des charges impose qu'**aucune PR ne soit fusionnée sans relecture par un autre membre** (§9, §10). La revue sert aussi à respecter la règle « aucune connaissance détenue par une seule personne » : chaque relecture fait circuler le savoir. Ce guide s'appuie sur le skill `code-review-excellence`.

## Ce que la revue doit attraper (et ce qu'elle laisse aux outils)

| La revue humaine                                                         | Les outils (CI)                                |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| Le code fait-il ce que dit la user story et ses critères d'acceptation ? | Formatage (Prettier)                           |
| Cas limites, erreurs, comportement hors ligne                            | Lint, imports interdits entre couches (ESLint) |
| Sécurité : autorisations, validation, secrets, injection                 | Types (TypeScript)                             |
| Respect de l'architecture (couches, frontières de modules)               | Secrets commités (gitleaks)                    |
| Lisibilité, nommage, tests pertinents                                    | Vulnérabilités (pnpm audit), budget de taille  |

**On ne discute pas en revue de ce qu'un outil peut vérifier.** Si une règle de style revient souvent, on l'ajoute à ESLint.

## Déroulé d'une revue (20 à 30 minutes)

1. **Contexte (3 min)** : lire la description, la user story liée et ses critères d'acceptation. Vérifier que la CI est verte. PR de plus de 400 lignes : demander un découpage avant de relire.
2. **Vue d'ensemble (5 à 10 min)** : la solution est-elle au bon endroit (bon module, bonne couche) ? Y a-t-il plus simple ? Les tests couvrent-ils le comportement attendu ?
3. **Lecture détaillée (10 à 20 min)** : logique, cas limites, sécurité, performance, lisibilité, avec les checklists ci-dessous.
4. **Décision (2 min)** : résumer, puis **Approuver**, **Commenter** ou **Demander des modifications**. Pour un sujet complexe, proposer un appel de 10 minutes plutôt qu'un long fil de commentaires.

## Étiquettes de sévérité

Chaque commentaire commence par une étiquette, pour que l'auteur sache ce qui bloque :

| Étiquette         | Sens                                                                     | L'auteur doit…                     |
| ----------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| 🔴 `[bloquant]`   | Bug, faille, perte de données, règle du cahier des charges non respectée | Corriger avant fusion              |
| 🟡 `[important]`  | Problème réel mais discutable                                            | Corriger ou expliquer pourquoi non |
| 🟢 `[détail]`     | Amélioration mineure                                                     | Libre de l'ignorer                 |
| 💡 `[suggestion]` | Autre approche possible                                                  | Libre                              |
| ❓ `[question]`   | Le relecteur veut comprendre                                             | Répondre                           |
| 🎉 `[bravo]`      | Quelque chose de bien fait                                               | Rien, apprécier                    |

## Bien formuler

| Éviter                               | Préférer                                                                                                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « C'est faux. »                      | « 🔴 [bloquant] Si deux onglets envoient la même action en même temps, on crée deux réponses : l'insertion de la clé d'idempotence n'est pas dans la transaction. Peux-tu la déplacer dans `uow.run` ? » |
| « Pourquoi tu n'as pas utilisé X ? » | « 💡 [suggestion] Un port `Clock` rendrait le bonus de 15 minutes testable sans attendre. Exemple dans `sos/application/accept-answer.spec.ts`. »                                                        |
| « Renomme ça. »                      | « 🟢 [détail] `helperIds` serait plus parlant que `ids`. Pas bloquant. »                                                                                                                                 |
| « Il manque la gestion d'erreur. »   | « ❓ [question] Que voit l'utilisateur si GitHub répond 503 ici ? »                                                                                                                                      |

On commente **le code, pas la personne**. On souligne aussi ce qui est bien fait.

## Checklists

### Toutes les PR

- [ ] La PR correspond à une user story (identifiant dans le titre ou la description) et respecte ses critères d'acceptation.
- [ ] Les tests couvrent le comportement nouveau ou corrigé (un bug corrigé arrive avec le test qui l'aurait détecté).
- [ ] Pas de code mort, de `console.log`, de `TODO` sans issue.
- [ ] La documentation est à jour (contrat d'API, modèle de données, ADR si décision structurante).
- [ ] Aucun texte affiché en dur côté front (tout passe par i18n, FR **et** EN).

### Back-end

- [ ] Le domaine n'importe ni NestJS, ni Prisma, ni HTTP.
- [ ] Le contrôleur se contente de valider, appeler le cas d'usage et mettre en forme la réponse.
- [ ] Pas d'accès aux tables d'un autre module (sauf lecture documentée dans `discovery` ou `platform`).
- [ ] Les écritures passent par l'intercepteur d'idempotence.
- [ ] Les effets qui doivent être cohérents sont dans **la même transaction** (XP + validation, clé d'idempotence + effet).
- [ ] Les jobs créés sont idempotents et ont un délai maximal.
- [ ] Erreurs métier typées avec un `code` stable, pas de message destiné à l'utilisateur.
- [ ] Requêtes : pas de N+1, index existants pour les filtres et les tris, pagination par curseur.
- [ ] Migration : relue, compatible avec la version précédente du code.

### Front-end

- [ ] Les écritures passent par la file (`enqueue`), jamais par `fetch` direct.
- [ ] L'écran fonctionne hors ligne (lecture depuis le cache, actions en attente visibles) ou explique pourquoi il ne peut pas.
- [ ] États de chargement, d'erreur et de liste vide gérés.
- [ ] Les sorties de l'IA passent par `AiContent` (mention « généré par IA, à vérifier ») ; les comptes de démo portent `DemoBadge`.
- [ ] Accessibilité : éléments natifs, labels, focus visible, cibles de 44 px, contraste.
- [ ] Pas de nouvelle dépendance lourde (poids vérifié) ; route chargée paresseusement.

### Sécurité (obligatoire sur `identity`, `sync`, `moderation`, `ai`, `infra`)

- [ ] Authentification et autorisation vérifiées **côté serveur** pour chaque action (propriétaire de la question, membre de la salle, administrateur…).
- [ ] Entrées validées par le schéma zod ; longueurs maximales.
- [ ] Aucun secret en dur ; aucune variable sensible exposée au front.
- [ ] Contenu utilisateur rendu de façon assainie ; pas de `dangerouslySetInnerHTML` hors du composant prévu.
- [ ] Contenu envoyé à l'IA : secrets masqués, encadré comme donnée, sortie validée par schéma (M2).
- [ ] Champs privés (PR14) filtrés côté API.
- [ ] Limitation du débit sur les nouveaux endpoints publics ou coûteux.

### Algorithmes (matching, XP, scores)

- [ ] La formule correspond exactement à [08 · Algorithmes](../architecture/08-algorithmes.md) (ou le document est mis à jour dans la même PR).
- [ ] Les poids viennent de `scoring/config.ts`, pas de constantes en dur.
- [ ] Les cas aux frontières sont testés (plafonds, changement de régime, égalités).
- [ ] Le journal `xp_events` n'est jamais modifié ni supprimé (uniquement des insertions et des annulations).

## Modèle de commentaire de synthèse

```markdown
## Synthèse

Ce que j'ai relu, et le résultat global.

## Points forts

- …

## À corriger avant fusion

🔴 …

## Suggestions

💡 …

## Questions

❓ …

## Verdict

✅ Approuvé une fois les points bloquants corrigés
```

## Pour l'auteur d'une PR

- Relire **sa propre PR** dans l'interface GitHub avant de demander une revue : on y voit des choses qu'on ne voit pas dans l'éditeur.
- Remplir le modèle de PR, avec comment tester et des captures pour le front.
- Répondre à chaque commentaire (corrigé, ou pourquoi non) ; c'est le relecteur qui résout la conversation.
- Un désaccord qui dure plus de deux échanges : appel de 10 minutes, puis on consigne la décision dans la PR.
