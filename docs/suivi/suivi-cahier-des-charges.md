# Suivi du cahier des charges

Ce document suit l'avancement de chaque exigence du [cahier des charges v3](../Cahier_des_charges_v3_DevHub_Africa.pdf) (§5) et des [propositions v3.1](../CDC_v3.1_DevHub_Africa_Propositions.pdf) qui ont une issue. Il complète le tableau GitHub Projects : chaque ligne renvoie à son issue.

> **Mise à jour** : à chaque PR ouverte ou fusionnée qui fait avancer une exigence, dans la même PR. Dernière mise à jour : **8 octobre 2026, soir** (fusion de #98, #99, #101, #102 et #104).

## Sommaire

1. [Légende](#légende)
2. [Tableau de bord](#tableau-de-bord)
3. [Jalons](#jalons)
4. [Mise en place (setup)](#mise-en-place-setup)
5. [Exigences du cahier des charges v3](#exigences-du-cahier-des-charges-v3)
6. [Propositions v3.1](#propositions-v31)
7. [Travail réalisé hors cahier des charges](#travail-réalisé-hors-cahier-des-charges)

## Légende

| Statut     | Sens                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Terminé`  | Fusionné sur `main`, critère d'acceptation tenu (au moins en local et CI)                                                                       |
| `En cours` | Code en cours ou PR ouverte                                                                                                                     |
| `À faire`  | Rien de commencé                                                                                                                                |
| `Bloqué`   | Attend une décision ou une autre tâche                                                                                                          |
| `P2`       | Proposition v3.1 gardée en bonus : seulement si les jalons sont tenus ; gelée le 15 oct. ([ADR-0017](../adr/0017-tri-des-propositions-v3-1.md)) |
| `Écarté`   | Proposition v3.1 laissée en roadmap : présentée au jury, pas codée ([ADR-0017](../adr/0017-tri-des-propositions-v3-1.md))                       |

Priorités : **P0** indispensable à la démo · **P1** fortement souhaité · **P2** bonus · **MVP+** ajout v3.1 proposé au MVP · **Correctif** correction v3.1 d'une règle du v3.

> « Terminé » ici veut dire fusionné. La [définition de « terminé »](../equipe/definition-of-done.md) de l'équipe exige en plus que ce soit visible sur l'URL de production et essayé par une autre personne : aucune exigence ne remplit encore ce critère, faute d'URL de production.

## Tableau de bord

### Exigences v3 (37)

| Priorité  | Total  | Terminé | En cours | À faire | Terminé (%) | Engagé (%) |
| --------- | ------ | ------- | -------- | ------- | ----------- | ---------- |
| P0        | 21     | 19      | 2        | 0       | 90 %        | 100 %      |
| P1        | 14     | 3       | 4        | 7       | 21 %        | 50 %       |
| P2        | 2      | 0       | 0        | 2       | 0 %         | 0 %        |
| **Total** | **37** | **22**  | **6**    | **9**   | **59 %**    | **76 %**   |

« Engagé » = terminé + en cours.

### Par module

| Module                  | Exigences | Terminé | En cours | Avancement                                        |
| ----------------------- | --------- | ------- | -------- | ------------------------------------------------- |
| Auth (A)                | 3         | 1       | 1        | `█████░░░░░` A1 fait; A3 en cours                 |
| Profil et Passport (PR) | 4         | 3       | 0        | `████████░░` PR1, PR2, PR3 fait                   |
| SOS Dev (S)             | 7         | 3       | 1        | `█████░░░░░` S1, S2, S4 fait; S3 en cours         |
| Salles de projet (R)    | 8         | 5       | 1        | `███████░░░` R1, R2, R3, R7, R8 fait; R4 en cours |
| Découverte (D)          | 3         | 2       | 0        | `███████░░░` D1, D2 fait                          |
| Réputation (X)          | 2         | 2       | 0        | `██████████` X1, X2 fait                          |
| Hors ligne (O)          | 4         | 3       | 1        | `█████████░` O1, O2, O3 fait; O4 en cours         |
| Systalink et impact (Y) | 4         | 2       | 1        | `██████░░░░` Y1, Y2 fait; Y3 en cours             |
| Modération (M)          | 1         | 1       | 0        | `██████████` M1 fait                              |
| Langues (I)             | 1         | 0       | 1        | `█████░░░░░` I1 en cours                          |

### Par personne (exigences v3 et setup ouverts)

| Personne | En cours                                                     | Prochaine échéance du planning                                   |
| -------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Caleb    | — (#98, #99, #101, #102 fusionnées le 8 oct.)                | Passport public et « Voir les preuves » (PR2, PR3)               |
| Florent  | —                                                            | Tables questions et réponses, `POST /questions` (S1)             |
| Joachim  | S2, M2 (#104 fusionnée, en attente de S1) ; outillage (#103) | Salles : modèle (12 oct.), création et lien GitHub (R1, 15 oct.) |
| Sylvio   | `apps/web`, O1-O3, I1 (#97)                                  | Connexion et Passport v0 (écran) : 8 oct.                        |
| Emmanuel | —                                                            | URL Systalink en ligne, revue de sécurité : 8 oct.               |

## Jalons

| Jalon | Date    | Critère de sortie                                                                | Statut au 15 octobre                                                                                                                                                                                   |
| ----- | ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | 8 oct.  | Connexion GitHub, profil, base de données et URL Systalink en ligne              | **Manqué** : code fusionné (A1 #95, PR1 #99) ; pas d'URL de production, en attente de #6, #7 et #9                                                                                                     |
| 2     | 14 oct. | Question → piste IA → réponse d'un autre dev, de bout en bout ; 30+ devs invités | **Code prêt et validé en réel en local** (S1, S4, Y8, M2 le 14 oct. ; IA avec le faux modèle) ; restent la vraie clé IA (#7), l'URL de production et les invitations (#10)                             |
| 3     | 16 oct. | Poser, lire, répondre sans réseau puis synchroniser, sur un vrai téléphone       | **Partiel** : lecture hors ligne (O1, #119) et synchronisation (O2, #118, e2e #123) validées dans le navigateur ; restent l'écran de conflit (O4, session B en cours) et l'essai sur un vrai téléphone |
| 4     | 18 oct. | Créer une salle, lier un dépôt, rejoindre, créer et prendre des tâches           | **Code prêt** (#111 à #113, front #116, aperçus de partage #122) ; reste un essai avec un vrai dépôt GitHub (#7)                                                                                       |
| 5     | 22 oct. | Passport, Proof XP, découverte, Systalink et impact ; gel du code                | **API prête** (#113 à #115) ; restent le budget de l'accueil (BUG-024), le journal d'audit (M4), le déploiement et le dossier (#12)                                                                    |

Vue interactive par jalon (état réel de chaque exigence, tâches restantes, bloquants) : [cahier de livraison](https://claude.ai/artifact/6aWU3KSVDkfH8qdDF8zpj3) (page privée, partagée par Joachim).

## Mise en place (setup)

| Issue | Tâche                                               | Statut     | Responsable       | Référence / commentaire                                                      |
| ----- | --------------------------------------------------- | ---------- | ----------------- | ---------------------------------------------------------------------------- |
| #1    | Valider les ADR 0001 à 0013                         | `Terminé`  | Caleb             | Acceptés le 9 octobre (PR #105)                                              |
| #2    | Questions ouvertes à Systalink                      | `À faire`  | Caleb             | Aucune réponse consignée                                                     |
| #3    | Initialiser `apps/api`                              | `Terminé`  | Caleb             | PR #94, 7 oct.                                                               |
| #4    | Initialiser `apps/web`                              | `Terminé`  | Sylvio            | PR #97 (fusionnée), branchée sur l'API par #116                              |
| #5    | Initialiser `packages/core` et `packages/contracts` | `Terminé`  | Caleb             | PR #101 (fusionnée)                                                          |
| #6    | CI verte, déploiement auto, URL Systalink en ligne  | `En cours` | Emmanuel          | CI verte sur `main` ; déploiement non constaté                               |
| #7    | Application OAuth GitHub et clé IA avec plafond     | `À faire`  | Joachim, Emmanuel | Scopes décidés (#51) ; nécessaire pour le vrai GitHub                        |
| #8    | Protéger `main` et compléter CODEOWNERS             | `Bloqué`   | Emmanuel          | Impossible sur un dépôt privé gratuit : voir [BUG-003](anomalies.md#bug-003) |
| #9    | PostgreSQL managé Systalink ou dans Docker          | `À faire`  | Emmanuel          |                                                                              |
| #10   | Inviter 30+ devs réels                              | `À faire`  | Caleb             | Avant le 14 oct.                                                             |
| #11   | Restauration de sauvegarde testée                   | `À faire`  | Emmanuel          | Scripts `backup.sh` et `restore.sh` prêts                                    |
| #12   | README, deck, vidéo                                 | `À faire`  | Caleb             |                                                                              |
| #13   | Test extérieur, compte et vidéo de secours          | `À faire`  | Emmanuel          |                                                                              |

## Exigences du cahier des charges v3

### Auth (A)

| ID  | Issue | Exigence                   | Prio | Statut     | Responsable | Référence | Commentaire                                                                                                                                             |
| --- | ----- | -------------------------- | ---- | ---------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | #14   | Connexion avec GitHub      | P0   | `Terminé`  | Caleb       | PR #95    | OAuth avec `state`, cookie HttpOnly, jeton chiffré AES-GCM ; 8 tests e2e. Pas encore testé avec une vraie application OAuth (#7)                        |
| A2  | #15   | Connexion GitLab ou Google | P1   | `À faire`  | Caleb       |           | Le front de #97 les affiche « bientôt »                                                                                                                 |
| A3  | #16   | Supprimer mon compte       | P1   | `En cours` | Caleb       | PR #138   | API validée en réel le 16 oct. (session C : confirmation, déconnexion, Passport 404, contenus conservés) ; bouton dans les réglages à faire (session B) |

### Profil et Passport (PR)

| ID  | Issue | Exigence                                     | Prio | Statut    | Responsable | Référence       | Commentaire                                                                              |
| --- | ----- | -------------------------------------------- | ---- | --------- | ----------- | --------------- | ---------------------------------------------------------------------------------------- |
| PR1 | #17   | Profil rempli automatiquement depuis GitHub  | P0   | `Terminé` | Caleb       | #99 (fusionnée) | Job `github.import-profile`, au moins 3 compétences                                      |
| PR2 | #18   | Passport public `/u/pseudo`                  | P0   | `Terminé` | Caleb       | PR #113         | Validé en réel le 15 oct. (session C, API et front de main)                              |
| PR3 | #19   | « Voir les preuves »                         | P0   | `Terminé` | Caleb       | PR #113, #102   | Validé en réel le 15 oct. (session C, API et front de main) : preuves identiques à l'API |
| PR4 | #20   | « Disponible pour une mission » et Contacter | P1   | `À faire` | Caleb       |                 |                                                                                          |

### SOS Dev (S)

| ID  | Issue | Exigence                               | Prio | Statut     | Responsable | Référence                | Commentaire                                                                                              |
| --- | ----- | -------------------------------------- | ---- | ---------- | ----------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| S1  | #21   | Poser une question                     | P0   | `Terminé`  | Florent     | PR #106                  | Validé en réel le 14 oct. (session C : API réelle, front http, deux comptes) ; reste l'URL de production |
| S2  | #22   | Piste IA marquée « générée par IA »    | P0   | `Terminé`  | Joachim     | #104, déclenché par #106 | Validé en réel avec le faux modèle le 14 oct. ; reste l'essai avec la vraie clé (#7)                     |
| S3  | #23   | Envoi à 3 devs adaptés, avec la raison | P0   | `En cours` | Florent     | PR #108                  | 3 aidants notifiés avec la raison ; escalade à 15 min ; temps réel (Y8) à suivre                         |
| S4  | #24   | Répondre, voter, valider               | P0   | `Terminé`  | Florent     | PR #107                  | Validé en réel le 14 oct. (2e compte, validation, +10 XP et +3 de rapidité)                              |
| S5  | #25   | Créneau de pair programming            | P1   | `À faire`  | Florent     |                          |                                                                                                          |
| S6  | #26   | Question résolue = fiche cherchable    | P1   | `À faire`  | Florent     |                          |                                                                                                          |
| S7  | #27   | Questions similaires avant publication | P1   | `En cours` | Florent     | `fix/web-similar`        | 3 max., ignorables, aussi sur la fiche                                                                   |

### Salles de projet (R)

| ID  | Issue | Exigence                                 | Prio | Statut     | Responsable | Référence            | Commentaire                                                                                                                                                                                                                                                     |
| --- | ----- | ---------------------------------------- | ---- | ---------- | ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | #28   | Créer une salle liée à un dépôt GitHub   | P0   | `Terminé`  | Joachim     | #111                 | Validé en réel le 15 oct. (session C, API et front de main) ; essai avec un vrai dépôt quand #7 sera prêt                                                                                                                                                       |
| R2  | #29   | Tâches ouvertes avec niveau              | P0   | `Terminé`  | Joachim     | PR #112, #113        | Validé en réel le 15 oct. (session C, API et front de main) : création, prise par un membre, droits vérifiés (403 aux non-membres)                                                                                                                              |
| R3  | #30   | Demander à rejoindre                     | P0   | `Terminé`  | Joachim     | PR #111              | Validé en réel le 15 oct. (session C, API et front de main) : demande, notifications, acceptation                                                                                                                                                               |
| R4  | #31   | Fil de discussion par salle              | P1   | `En cours` | Joachim     | PR #112, #113        | Membres seulement, ordre serveur, hors ligne via /sync                                                                                                                                                                                                          |
| R5  | #32   | L'IA transforme une discussion en tâches | P1   | `Terminé`  | Joachim     | `feat/room-ai-tasks` | `POST /rooms/:id/tasks/suggest` : jusqu'à 5 tâches proposées depuis les 40 derniers messages, rien n'est créé sans un membre ; cache et quota communs avec S2 ; bouton « Proposer avec l'IA » dans l'onglet Tâches. Essayé avec le faux modèle (pas de clé, #7) |
| R6  | #33   | Demander un retour ou une revue de code  | P1   | `En cours` | Joachim     | PR #162              | API (7 routes), notifications, flux « Revues demandées » de /projets et carte de salle (FR, EN) ; +8 XP pour une revue de code seulement (barème §6.3) ; testé en e2e (API et Playwright)                                                                       |
| R7  | #34   | Lien d'invitation riche                  | P1   | `Terminé`  | Joachim     | PR #111, #122        | Validé le 15 oct. (balises échappées, salle masquée → 404) ; image dédiée avec PR5                                                                                                                                                                              |
| R8  | #35   | Tâche terminée avec un lien de PR        | P0   | `Terminé`  | Joachim     | PR #112, #113        | Validé en réel le 15 oct. (session C, API et front de main) : clôture, +15 XP                                                                                                                                                                                   |

### Découverte (D)

| ID  | Issue | Exigence                   | Prio | Statut    | Responsable | Référence | Commentaire                                                 |
| --- | ----- | -------------------------- | ---- | --------- | ----------- | --------- | ----------------------------------------------------------- |
| D1  | #36   | Rechercher devs et projets | P0   | `Terminé` | Caleb       | PR #114   | Validé en réel le 15 oct. (session C, API et front de main) |
| D2  | #37   | Classement par pays        | P1   | `Terminé` | Caleb       | PR #114   | Validé en réel le 15 oct. (session C, API et front de main) |
| D3  | #38   | Recherche sémantique       | P2   | `À faire` | Caleb       |           | Gel des P2 le 15                                            |

### Réputation (X)

| ID  | Issue | Exigence                                     | Prio | Statut    | Responsable | Référence        | Commentaire                                                                               |
| --- | ----- | -------------------------------------------- | ---- | --------- | ----------- | ---------------- | ----------------------------------------------------------------------------------------- |
| X1  | #39   | Proof XP : journal public, règles expliquées | P0   | `Terminé` | Caleb       | #102 (fusionnée) | `AwardXp`, `GET /u/:handle/proofs`, `GET /rules/xp`                                       |
| X2  | #40   | Garde-fous anti-abus                         | P0   | `Terminé` | Caleb       | #102 (fusionnée) | Plafond 60/jour, pas de vote pour soi, 2 validations par paire et par semaine, annulation |

### Hors ligne (O)

| ID  | Issue | Exigence                                   | Prio | Statut     | Responsable     | Référence                               | Commentaire                                                                                               |
| --- | ----- | ------------------------------------------ | ---- | ---------- | --------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| O1  | #41   | Lire sans réseau les contenus déjà ouverts | P0   | `Terminé`  | Sylvio          | PR #97, #119, #124                      | Validé en réel le 15 oct. (build de prod, service worker, réseau coupé) ; essai sur téléphone au Jalon 3  |
| O2  | #42   | Rédiger sans réseau                        | P0   | `Terminé`  | Sylvio, Florent | PR #110 (API), #118 (front), #123 (e2e) | Vérifié de bout en bout dans le navigateur (tests e2e de #123)                                            |
| O3  | #43   | État réseau toujours visible               | P0   | `Terminé`  | Sylvio          | PR #97, #123 (e2e)                      | Vérifié par les tests e2e                                                                                 |
| O4  | #44   | Écran de conflit de version                | P1   | `En cours` | Sylvio          | PR #110 (API)                           | API prête : `PATCH` avec `baseVersion`, `409 version_conflict` + version serveur, archive ; reste l’écran |

### Systalink, impact, notifications, stockage (Y)

| ID  | Issue | Exigence                                 | Prio | Statut     | Responsable | Référence                                                         | Commentaire                                                                                                                                                                                                              |
| --- | ----- | ---------------------------------------- | ---- | ---------- | ----------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Y1  | #45   | État des services et dernière sauvegarde | P0   | `Terminé`  | Emmanuel    | PR #115                                                           | Validé en réel le 15 oct. (session C, API et front de main) : sondes réelles ; sauvegarde et e-mail à brancher en production                                                                                             |
| Y2  | #46   | Écran d'impact                           | P1   | `Terminé`  | Emmanuel    | PR #115, #131, #141                                               | Chiffres réels uniquement : contributions vérifiées et échanges entre langues (#131, #141) ; série hebdomadaire masquée faute de données                                                                                 |
| Y3  | #47   | E-mails via la messagerie Systalink      | P1   | `En cours` | Emmanuel    | `feat/email-notifications`, `feat/web-email-notifications-toggle` | API faite : récapitulatif des notifications non lues toutes les 2 min, désabonnement en un clic ; interrupteur « Recevoir les e-mails » dans les réglages du web (mode API) ; reste les identifiants SMTP Systalink (#2) |
| Y4  | #48   | Stockage objet Systalink                 | P2   | `À faire`  | Emmanuel    |                                                                   | Si le produit est accepté (#2)                                                                                                                                                                                           |

### Modération (M) et langues (I)

| ID  | Issue | Exigence                                  | Prio | Statut     | Responsable | Référence                          | Commentaire                                                                          |
| --- | ----- | ----------------------------------------- | ---- | ---------- | ----------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| M1  | #49   | Signaler un contenu, retrait par un admin | P0   | `Terminé`  | Emmanuel    | PR #115, #137                      | Validé en réel le 15 oct. ; signalement d'un compte depuis le Passport ajouté (#137) |
| I1  | #50   | Interface en français et en anglais       | P0   | `En cours` | Sylvio      | PR #97, `feat/web-api-integration` | Français par défaut côté front                                                       |

## Propositions v3.1

Statuts tranchés le 9 octobre par l'[ADR-0017](../adr/0017-tri-des-propositions-v3-1.md) : `À faire` (retenue, avec jalon et responsable), `P2` ou `Écarté`. Les propositions P2 et roadmap de la v3.1 n'ont pas d'issue et ne sont pas suivies ici.

| ID   | Issue | Proposition                                      | Prio      | Statut     | Responsable                   | Référence                                                                                 |
| ---- | ----- | ------------------------------------------------ | --------- | ---------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| X3   | #52   | Score GitHub (G) résistant aux dépôts vides      | Correctif | `Terminé`  | Caleb (à la place de Joachim) | #99 (fusionnée)                                                                           |
| X4   | #53   | Démarrage à froid du matching                    | Correctif | `En cours` | Florent                       | PR #108 (régime froid, « Je m'en occupe »)                                                |
| Y8   | #54   | Temps réel par Server-Sent Events                | Correctif | `Terminé`  | Florent                       | PR #109 (API), #118 (front)                                                               |
| M2   | #55   | Protection contre l'injection de prompt          | Correctif | `Terminé`  | Joachim, Emmanuel             | PR #104 (piste IA)                                                                        |
| O9   | #56   | Masquage des secrets avant la mise en file       | Correctif | `Terminé`  | Sylvio, Emmanuel              | #101, #104, BUG-040 : tous les champs masqués                                             |
| PR5  | #57   | Proof Card : carte de partage générée            | MVP+      | `À faire`  | Caleb                         |                                                                                           |
| PR6  | #58   | Badge README dynamique pour GitHub               | MVP+      | `À faire`  | Caleb                         |                                                                                           |
| PR7  | #59   | Barre de score bicolore G + P                    | MVP+      | `À faire`  | Sylvio                        |                                                                                           |
| PR11 | #60   | Signaux de confiance, badge « Membre fondateur » | MVP+      | `Terminé`  | Caleb                         | #98 (fusionnée)                                                                           |
| S8   | #61   | Assistant de rédaction et jauge de qualité       | MVP+      | `À faire`  | Sylvio                        |                                                                                           |
| S9   | #62   | Étiquettes détectées depuis l'erreur             | MVP+      | `À faire`  | Joachim                       |                                                                                           |
| S10  | #63   | Pont bilingue français et anglais                | MVP+      | `En cours` | Joachim                       | PR (S10) : traduction IA à la demande, cache, bouton Traduire, matching L = 0,5           |
| S11  | #64   | Statut « Je m'en occupe »                        | MVP+      | `En cours` | Florent                       | PR #108 (régime froid, « Je m'en occupe »)                                                |
| O5   | #65   | Simulateur de réseau intégré                     | MVP+      | `Écarté`   | Sylvio                        | Retiré le 16/10 (décision de Sylvio) ; branche `refactor/web-remove-net-simulator`        |
| R9   | #66   | Contributions vérifiées par GitHub               | MVP+      | `Terminé`  | Joachim                       | PR #112, #113 (PR fusionnée + auteur = assigné ; nouvel essai si GitHub est indisponible) |
| X5   | #67   | Page publique « Comment marchent les Proof XP »  | MVP+      | `En cours` | Caleb                         | PR #102 (`GET /rules/xp`)                                                                 |
| Y6   | #68   | Systalink visible dans le parcours               | MVP+      | `À faire`  | Sylvio                        |                                                                                           |
| M3   | #69   | Code de conduite à l'inscription                 | MVP+      | `Terminé`  | Caleb                         | #98 (fusionnée)                                                                           |
| T1   | #70   | Page d'accueil publique « en direct »            | MVP+      | `À faire`  | Sylvio                        | #97 a une landing publique                                                                |
| T2   | #71   | Essai sans compte et visite guidée de 60 s       | MVP+      | `À faire`  | Sylvio, Emmanuel              |                                                                                           |
| PR8  | #72   | Carte de chaleur de l'entraide                   | P1        | `P2`       | Sylvio                        |                                                                                           |
| PR9  | #73   | Recommandations adossées à une preuve            | P1        | `Écarté`   | —                             |                                                                                           |
| PR10 | #74   | « Je peux aider sur » et « Je veux apprendre »   | P1        | `En cours` | Caleb                         | PR #113 (`PATCH /me`, Passport)                                                           |
| PR14 | #75   | Confidentialité granulaire du Passport           | P1        | `En cours` | Caleb                         | PR #113 (`PATCH /me`, Passport)                                                           |
| S12  | #76   | Fiche de résolution générée                      | P1        | `P2`       | Joachim                       |                                                                                           |
| S14  | #77   | Lien de reproduction                             | P1        | `À faire`  | Florent                       |                                                                                           |
| S16  | #78   | File « Personne n'a encore répondu »             | P1        | `En cours` | Florent                       | Bloc d'accueil : mes stacks, sans réponse, urgence puis ancienneté                        |
| O6   | #79   | Mode économie de données                         | P1        | `P2`       | Sylvio                        |                                                                                           |
| O8   | #80   | Centre de synchronisation                        | P1        | `À faire`  | Sylvio                        |                                                                                           |
| R10  | #81   | Rôles recherchés                                 | P1        | `P2`       | Joachim                       |                                                                                           |
| R11  | #82   | Vue Kanban et santé du projet                    | P1        | `À faire`  | Sylvio                        |                                                                                           |
| R12  | #83   | Salle créée à partir du README                   | P1        | `P2`       | Joachim                       |                                                                                           |
| R14  | #84   | Stand-up asynchrone relié à SOS Dev              | P1        | `Écarté`   | —                             |                                                                                           |
| D4   | #85   | Carte interactive de l'Afrique                   | P1        | `À faire`  | Sylvio                        |                                                                                           |
| D5   | #86   | Classements par école, ville et communauté       | P1        | `P2`       | Caleb                         |                                                                                           |
| D6   | #87   | « Devs à rencontrer » sur l'accueil              | P1        | `P2`       | Caleb                         |                                                                                           |
| Y5   | #88   | Page de statut avec historique                   | P1        | `Terminé`  | Emmanuel                      | PR #140 (API), `feat/web-status-history` (graphique 7 jours)                              |
| Y7   | #89   | Notifications Telegram et Web Push               | P1        | `P2`       | Joachim                       |                                                                                           |
| Y9   | #90   | Écran d'impact enrichi                           | P1        | `À faire`  | Caleb                         |                                                                                           |
| M4   | #91   | Journal d'audit de la modération                 | P1        | `En cours` | Emmanuel                      | PR #115, #129                                                                             |
| T3   | #92   | Accueil personnalisé en une question             | P1        | `P2`       | Sylvio                        |                                                                                           |
| T4   | #93   | Thème sombre                                     | P1        | `À faire`  | Sylvio                        |                                                                                           |

## Travail réalisé hors cahier des charges

Travail présent dans les PR ouvertes mais classé **roadmap** (« à présenter, pas à coder ») par le cahier des charges v3 (§3). À arbitrer par le rôle 1 (Caleb) avant fusion.

| Élément                                                                                      | PR               | Classement dans le CDC v3                                                                  |
| -------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| Fil d'actualités réelles (module API `news`, 72 sources, vidéos)                             | #96, #97         | Roadmap : « Fil d'actualité Dev Pulse »                                                    |
| Emplois, certifications                                                                      | #96, #97         | Roadmap : « Offres d'emploi », « certifications »                                          |
| Skills et outils IA, guide « Créer avec l'IA », templates, apprendre                         | #96, #97         | Roadmap : « Hub de skills », « parcours d'apprentissage », « assistant de création d'app » |
| Communautés, fil façon Reddit                                                                | #96, #97         | Roadmap : « Stack Spaces »                                                                 |
| Systalink A : preuve « en production sur Systalink » (+10 XP), disponibilité sondée          | `feat/systalink` | Renforce le critère Systalink (40 %)                                                       |
| Systalink B : bouton « Déployer sur Systalink » compté, écosystème et vitrine sur /systalink | `feat/systalink` | Renforce le critère Systalink (40 %)                                                       |
| Systalink C : aide Systalink dans SOS Dev (étiquette, FAQ publique /systalink/aide)          | `feat/systalink` | Renforce le critère Systalink (40 %)                                                       |
