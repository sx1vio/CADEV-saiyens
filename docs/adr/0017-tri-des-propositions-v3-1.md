# ADR-0017 : Tri des propositions du CDC v3.1

- **Statut** : **Accepté le 2026-10-09** (Caleb, rôle 1), en remplacement de la revue du périmètre prévue le 9 octobre
- **Date** : 2026-10-09
- **Décideurs** : Caleb (rôle 1)
- **Exigences concernées** : propositions v3.1 (issues #51 à #93) ; gel des P2 le 15 octobre

## Contexte

Le CDC v3.1 propose 59 ajouts, à garder, passer en P2 ou écarter en équipe (§17 de la v3.1). Six correctifs et trois MVP+ sont déjà faits ou en cours. Il en reste 37 à trancher, et les correctifs et MVP+ déjà engagés sont confirmés ici. Les P2 gèlent le 15 octobre et le code le 22 : sans décision, chacun choisit seul (le front avait déjà retenu sa propre liste).

## Critères

1. **Preuve** : ce qui rend « basé sur la preuve » vrai jusqu'au bout est prioritaire.
2. **Démo et vote** : ce qui se voit dans les 4 minutes de démo ou qui fait partager (vote du public).
3. **Coût** : effort XS ou S, et un responsable qui a de la capacité après ses P0.
4. **Pas de nouvelle dépendance externe** pendant le challenge (coût, panne, sécurité).

Statuts : **Retenu** (dans le MVP, avec un jalon) · **P2** (seulement si les jalons précédents sont tenus, gelé le 15 octobre) · **Écarté** (roadmap, présenté au jury, pas codé).

## Décisions

### Correctifs (tous retenus)

| ID    | Issue | Décision              | Jalon | Responsable | Remarque                                                      |
| ----- | ----- | --------------------- | ----- | ----------- | ------------------------------------------------------------- |
| OAUTH | #51   | Fait                  | J1    | Caleb       | #95                                                           |
| X3    | #52   | Fait                  | J1    | Caleb       | #99                                                           |
| X4    | #53   | Retenu                | J2    | Florent     | Démarrage à froid du matching : indispensable pendant la démo |
| Y8    | #54   | Retenu                | J2    | Florent     | SSE : condition de « notification en moins d'une minute »     |
| M2    | #55   | Fait pour la piste IA | J2    | Joachim     | #104 ; à appliquer à chaque nouvel usage de l'IA              |
| O9    | #56   | Retenu                | J3    | Sylvio      | `maskSecrets` est prêt dans `@devhub/core` (#101)             |

### MVP+

| ID   | Issue | Décision             | Jalon | Responsable      | Raison                                                                                       |
| ---- | ----- | -------------------- | ----- | ---------------- | -------------------------------------------------------------------------------------------- |
| PR5  | #57   | Retenu               | J5    | Caleb            | Proof Card : levier de partage, donc de vote                                                 |
| PR6  | #58   | Retenu               | J5    | Caleb            | Badge README : XS, illustre la preuve                                                        |
| PR7  | #59   | Retenu               | J5    | Sylvio           | Barre G + P : données déjà exposées par `/me/skills`                                         |
| PR11 | #60   | Fait                 | J1    | Caleb            | #98                                                                                          |
| S8   | #61   | Retenu, réduit       | J2    | Sylvio           | Gabarit guidé et jauge locale seulement ; la suggestion par l'IA est écartée (coût, latence) |
| S9   | #62   | Retenu               | J2    | Joachim          | Dictionnaire de motifs dans `@devhub/core`, utilisable hors ligne                            |
| S10  | #63   | Retenu, conditionnel | J5    | Joachim          | Pont FR ↔ EN : seulement si S1 à S4 sont fusionnés au Jalon 2 ; sinon P2                     |
| S11  | #64   | Retenu               | J2    | Florent          | « Je m'en occupe » : XS, sert la métrique phare                                              |
| O5   | #65   | Retenu               | J3    | Sylvio           | Simulateur de réseau : plan B de la démo, déjà fait côté front                               |
| R9   | #66   | Retenu               | J4    | Joachim          | Contribution vérifiée par GitHub : l'argument le plus fort de la preuve                      |
| X5   | #67   | Retenu               | J5    | Sylvio           | Page `/regles` : l'API `GET /rules/xp` existe (#102)                                         |
| Y6   | #68   | Retenu               | J5    | Sylvio           | Systalink visible : critère à 40 %                                                           |
| M3   | #69   | Fait                 | J1    | Caleb            | #98                                                                                          |
| T1   | #70   | Retenu               | J5    | Sylvio           | Accueil public « en direct » : le premier écran d'un votant                                  |
| T2   | #71   | Retenu               | J5    | Sylvio, Emmanuel | Essai sans compte sur un compte démo, bac à sable remis à zéro chaque nuit                   |

### P1 proposés par la v3.1

| ID   | Issue | Décision       | Jalon | Responsable | Raison                                                                                        |
| ---- | ----- | -------------- | ----- | ----------- | --------------------------------------------------------------------------------------------- |
| PR8  | #72   | P2             | —     | Sylvio      | Joli mais secondaire ; à faire si l'agrégation par jour est prête                             |
| PR9  | #73   | Écarté         | —     | —           | Recommandations : faible valeur en démo, règles d'éligibilité à écrire                        |
| PR10 | #74   | Retenu         | J5    | Caleb       | « Je peux aider » / « Je veux apprendre » : XS, améliore le matching                          |
| PR14 | #75   | Retenu, réduit | J5    | Caleb       | Mode « non listé » et masquage du pays et des disponibilités seulement (données personnelles) |
| S12  | #76   | P2             | —     | Joachim     | Fiche de résolution IA : utile, mais après S1 à S4                                            |
| S14  | #77   | Retenu         | J2    | Florent     | Lien de reproduction : un champ validé par liste blanche                                      |
| S16  | #78   | Retenu         | J2    | Florent     | « Personne n'a encore répondu » : une requête indexée                                         |
| O6   | #79   | P2             | —     | Sylvio      | Économie de données : après le hors ligne de base                                             |
| O8   | #80   | Retenu         | J3    | Sylvio      | Centre de synchronisation : déjà fait côté front                                              |
| R10  | #81   | P2             | —     | Joachim     | Rôles recherchés : après le Jalon 4                                                           |
| R11  | #82   | Retenu         | J4    | Sylvio      | Kanban : front seul, statuts déjà définis                                                     |
| R12  | #83   | P2             | —     | Joachim     | Salle depuis le README : dépend de l'IA et de R1                                              |
| R14  | #84   | Écarté         | —     | —           | Stand-up asynchrone : roadmap                                                                 |
| D4   | #85   | Retenu         | J5    | Sylvio      | Carte de l'Afrique : SVG statique, fort pour le pitch et le classement par pays               |
| D5   | #86   | P2             | —     | Caleb       | Classements par école : après D2                                                              |
| D6   | #87   | P2             | —     | Caleb       | « Devs à rencontrer » : après le matching                                                     |
| Y5   | #88   | Retenu         | J5    | Emmanuel    | Historique de disponibilité : prouve la fiabilité Systalink                                   |
| Y7   | #89   | P2             | —     | Joachim     | Telegram et Web Push : nouvelle dépendance externe                                            |
| Y9   | #90   | Retenu         | J5    | Caleb       | Impact enrichi : définitions précises, chiffres défendables                                   |
| M4   | #91   | Retenu         | J5    | Emmanuel    | Journal d'audit : la table `admin_actions` existe déjà                                        |
| T3   | #92   | P2             | —     | Sylvio      | Accueil personnalisé : confort, pas démo                                                      |
| T4   | #93   | Retenu         | J5    | Sylvio      | Thème sombre : déjà fait côté front                                                           |

## Conséquences

- **Retenus** : 32 (dont 5 déjà faits). **P2** : 9. **Écartés** : 2. Total : 43 propositions. Les P2 de la v3.1 absents du tableau (PR12, PR13, S13, S15, O7, O10, R13, R15, T5, T6, T7, X6 à X8, M5, D7, Y10) restent hors MVP.
- Les issues sont mises à jour en conséquence : priorité, jalon, responsable et étiquette `à-trier` retirée ; les écartées sont fermées comme « non planifiées ».
- Toute remise en cause passe par une PR qui modifie cet ADR.
