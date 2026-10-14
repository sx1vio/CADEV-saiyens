# ADR-0019 : Gouvernance du dépôt sans protection de branche

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1) ; réglages à appliquer par Sylvio, seul administrateur du dépôt
- **Date** : 2026-10-09
- **Décideurs** : Caleb (rôle 1) ; Emmanuel (rôle 4) pour la production
- **Exigences concernées** : §10 (« une PR relue par une autre personne ») ; BUG-003, BUG-011 ; complète l'[ADR-0013](0013-workflow-git-trunk-squash.md)

## Contexte

Le dépôt est **privé sur un compte GitHub gratuit** : GitHub y refuse la protection de branche et les rulesets (BUG-003). Rien n'empêche donc techniquement une fusion sans relecture, une fusion autre que squash, ni une poussée directe sur `main`, qui part en production à chaque fusion. Le 8 octobre, #94 et #95 ont été fusionnées avec des commits de fusion et sans relecture enregistrée. Par ailleurs, supprimer la branche d'une PR fusionnée a fermé des PR empilées (BUG-011).

## Options envisagées

| Option                            | Pour                                           | Contre                                |
| --------------------------------- | ---------------------------------------------- | ------------------------------------- |
| Rendre le dépôt public            | Protection gratuite, transparence pour le jury | Dépend du règlement du challenge (#2) |
| GitHub Pro ou Team                | Protection immédiate                           | Payant                                |
| Réglages disponibles + discipline | Gratuit, immédiat                              | Repose sur l'équipe                   |

## Décision

1. **Tout de suite** (Sylvio, _Settings → General → Pull Requests_) : n'autoriser **que** « Allow squash merging » (titre de la PR par défaut) ; décocher « Allow merge commits » et « Allow rebase merging » ; **ne pas** cocher « Automatically delete head branches » (BUG-011).
2. **Règles d'équipe** :
   - aucune poussée directe sur `main` ;
   - une PR n'est fusionnée qu'avec la CI verte et **une approbation d'une autre personne** ;
   - si le relecteur ne répond pas, le rôle 1 peut relire et fusionner, et le note dans la PR ;
   - PR empilées : suivre la procédure du [workflow Git](../equipe/workflow-git.md#pr-empilées).
3. **Dès que le règlement le permet** (réponse à #2), rendre le dépôt public et activer la protection de `main` décrite dans le workflow Git.

## Conséquences

- Les écarts restent possibles techniquement ; ils sont visibles dans l'historique et se signalent dans le registre des anomalies.
- Le 8 et le 9 octobre, plusieurs PR ont été fusionnées par Caleb sans approbation d'une autre personne, pour débloquer les jalons. Les relectures existantes (Joachim sur #99, Caleb sur #104) ont été traitées avant chaque fusion.
