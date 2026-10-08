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

| Statut     | Sens                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| `Terminé`  | Fusionné sur `main`, critère d'acceptation tenu (au moins en local et CI) |
| `En cours` | Code en cours ou PR ouverte                                               |
| `À faire`  | Rien de commencé                                                          |
| `Bloqué`   | Attend une décision ou une autre tâche                                    |
| `À trier`  | Proposition v3.1 pas encore retenue en revue du périmètre (9 et 15 oct.)  |

Priorités : **P0** indispensable à la démo · **P1** fortement souhaité · **P2** bonus · **MVP+** ajout v3.1 proposé au MVP · **Correctif** correction v3.1 d'une règle du v3.

> « Terminé » ici veut dire fusionné. La [définition de « terminé »](../equipe/definition-of-done.md) de l'équipe exige en plus que ce soit visible sur l'URL de production et essayé par une autre personne : aucune exigence ne remplit encore ce critère, faute d'URL de production.

## Tableau de bord

### Exigences v3 (37)

| Priorité  | Total  | Terminé | En cours | À faire | Terminé (%) | Engagé (%) |
| --------- | ------ | ------- | -------- | ------- | ----------- | ---------- |
| P0        | 21     | 4       | 5        | 12      | 19 %        | 43 %       |
| P1        | 14     | 0       | 0        | 14      | 0 %         | 0 %        |
| P2        | 2      | 0       | 0        | 2       | 0 %         | 0 %        |
| **Total** | **37** | **4**   | **5**    | **28**  | **11 %**    | **24 %**   |

« Engagé » = terminé + en cours.

### Par module

| Module                  | Exigences | Terminé | En cours | Avancement                  |
| ----------------------- | --------- | ------- | -------- | --------------------------- |
| Auth (A)                | 3         | 1       | 0        | `███░░░░░░░` A1 fait        |
| Profil et Passport (PR) | 4         | 1       | 0        | `██░░░░░░░░` PR1 fait       |
| SOS Dev (S)             | 7         | 0       | 1        | `█░░░░░░░░░` S2 en revue    |
| Salles de projet (R)    | 8         | 0       | 0        | `░░░░░░░░░░`                |
| Découverte (D)          | 3         | 0       | 0        | `░░░░░░░░░░`                |
| Réputation (X)          | 2         | 2       | 0        | `██████████` X1, X2 faits   |
| Hors ligne (O)          | 4         | 0       | 3        | `███░░░░░░░` front en revue |
| Systalink et impact (Y) | 4         | 0       | 0        | `░░░░░░░░░░`                |
| Modération (M)          | 1         | 0       | 0        | `░░░░░░░░░░`                |
| Langues (I)             | 1         | 0       | 1        | `█████░░░░░` front en revue |

### Par personne (exigences v3 et setup ouverts)

| Personne | En cours                                                     | Prochaine échéance du planning                                   |
| -------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Caleb    | — (#98, #99, #101, #102 fusionnées le 8 oct.)                | Passport public et « Voir les preuves » (PR2, PR3)               |
| Florent  | —                                                            | Tables questions et réponses, `POST /questions` (S1)             |
| Joachim  | S2, M2 (#104 fusionnée, en attente de S1) ; outillage (#103) | Salles : modèle (12 oct.), création et lien GitHub (R1, 15 oct.) |
| Sylvio   | `apps/web`, O1-O3, I1 (#97)                                  | Connexion et Passport v0 (écran) : 8 oct.                        |
| Emmanuel | —                                                            | URL Systalink en ligne, revue de sécurité : 8 oct.               |

## Jalons

| Jalon | Date    | Critère de sortie                                                                | Statut                                                                          |
| ----- | ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1     | 8 oct.  | Connexion GitHub, profil, base de données et URL Systalink en ligne              | **À risque** : A1 et profil (PR1) fusionnés ; pas d'URL de production constatée |
| 2     | 14 oct. | Question → piste IA → réponse d'un autre dev, de bout en bout ; 30+ devs invités | `À faire`                                                                       |
| 3     | 16 oct. | Poser, lire, répondre sans réseau puis synchroniser, sur un vrai téléphone       | `À faire` (moteur hors ligne front en revue dans #97)                           |
| 4     | 18 oct. | Créer une salle, lier un dépôt, rejoindre, créer et prendre des tâches           | `À faire`                                                                       |
| 5     | 22 oct. | Passport, Proof XP, découverte, Systalink et impact ; gel du code                | `À faire`                                                                       |

## Mise en place (setup)

| Issue | Tâche                                               | Statut     | Responsable       | Référence / commentaire                                                      |
| ----- | --------------------------------------------------- | ---------- | ----------------- | ---------------------------------------------------------------------------- |
| #1    | Valider les ADR 0001 à 0013                         | `À faire`  | Caleb             | Les 13 ADR sont toujours « proposés »                                        |
| #2    | Questions ouvertes à Systalink                      | `À faire`  | Caleb             | Aucune réponse consignée                                                     |
| #3    | Initialiser `apps/api`                              | `Terminé`  | Caleb             | PR #94, 7 oct.                                                               |
| #4    | Initialiser `apps/web`                              | `En cours` | Sylvio            | PR #97                                                                       |
| #5    | Initialiser `packages/core` et `packages/contracts` | `En cours` | Caleb             | PR #101 (Florent était attributaire)                                         |
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

| ID  | Issue | Exigence                   | Prio | Statut    | Responsable | Référence | Commentaire                                                                                                                      |
| --- | ----- | -------------------------- | ---- | --------- | ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A1  | #14   | Connexion avec GitHub      | P0   | `Terminé` | Caleb       | PR #95    | OAuth avec `state`, cookie HttpOnly, jeton chiffré AES-GCM ; 8 tests e2e. Pas encore testé avec une vraie application OAuth (#7) |
| A2  | #15   | Connexion GitLab ou Google | P1   | `À faire` | Caleb       |           | Le front de #97 les affiche « bientôt »                                                                                          |
| A3  | #16   | Supprimer mon compte       | P1   | `À faire` | Caleb       |           |                                                                                                                                  |

### Profil et Passport (PR)

| ID  | Issue | Exigence                                     | Prio | Statut    | Responsable | Référence       | Commentaire                                         |
| --- | ----- | -------------------------------------------- | ---- | --------- | ----------- | --------------- | --------------------------------------------------- |
| PR1 | #17   | Profil rempli automatiquement depuis GitHub  | P0   | `Terminé` | Caleb       | #99 (fusionnée) | Job `github.import-profile`, au moins 3 compétences |
| PR2 | #18   | Passport public `/u/pseudo`                  | P0   | `À faire` | Caleb       |                 | `trustSignals()` de #98 réutilisable                |
| PR3 | #19   | « Voir les preuves »                         | P0   | `À faire` | Caleb       |                 | `GET /me/skills` (#99) expose déjà G et P           |
| PR4 | #20   | « Disponible pour une mission » et Contacter | P1   | `À faire` | Caleb       |                 |                                                     |

### SOS Dev (S)

| ID  | Issue | Exigence                               | Prio | Statut     | Responsable | Référence | Commentaire                                                                                          |
| --- | ----- | -------------------------------------- | ---- | ---------- | ----------- | --------- | ---------------------------------------------------------------------------------------------------- |
| S1  | #21   | Poser une question                     | P0   | `À faire`  | Florent     |           | Étiquette `contrat`                                                                                  |
| S2  | #22   | Piste IA marquée « générée par IA »    | P0   | `En cours` | Joachim     | PR #104   | Job `ai.hint` : quota, cache, 10 s ; reste le déclenchement par S1 et l'essai avec la vraie clé (#7) |
| S3  | #23   | Envoi à 3 devs adaptés, avec la raison | P0   | `À faire`  | Florent     |           | Algorithme §6.2                                                                                      |
| S4  | #24   | Répondre, voter, valider               | P0   | `À faire`  | Florent     |           | Validation = +10 Proof XP                                                                            |
| S5  | #25   | Créneau de pair programming            | P1   | `À faire`  | Florent     |           |                                                                                                      |
| S6  | #26   | Question résolue = fiche cherchable    | P1   | `À faire`  | Florent     |           |                                                                                                      |
| S7  | #27   | Questions similaires avant publication | P1   | `À faire`  | Florent     |           |                                                                                                      |

### Salles de projet (R)

| ID  | Issue | Exigence                                 | Prio | Statut    | Responsable | Référence | Commentaire                      |
| --- | ----- | ---------------------------------------- | ---- | --------- | ----------- | --------- | -------------------------------- |
| R1  | #28   | Créer une salle liée à un dépôt GitHub   | P0   | `À faire` | Joachim     |           | Planning : 15 oct.               |
| R2  | #29   | Tâches ouvertes avec niveau              | P0   | `À faire` | Joachim     |           |                                  |
| R3  | #30   | Demander à rejoindre                     | P0   | `À faire` | Joachim     |           | API : appui de Florent (16 oct.) |
| R4  | #31   | Fil de discussion par salle              | P1   | `À faire` | Joachim     |           |                                  |
| R5  | #32   | L'IA transforme une discussion en tâches | P1   | `À faire` | Joachim     |           | Planning : 18 oct.               |
| R6  | #33   | Demander un retour ou une revue de code  | P1   | `À faire` | Joachim     |           |                                  |
| R7  | #34   | Lien d'invitation riche                  | P1   | `À faire` | Joachim     |           | ADR-0012                         |
| R8  | #35   | Tâche terminée avec un lien de PR        | P0   | `À faire` | Joachim     |           | Renforcé par R9 (v3.1)           |

### Découverte (D)

| ID  | Issue | Exigence                   | Prio | Statut    | Responsable | Référence | Commentaire        |
| --- | ----- | -------------------------- | ---- | --------- | ----------- | --------- | ------------------ |
| D1  | #36   | Rechercher devs et projets | P0   | `À faire` | Caleb       |           | Planning : 19 oct. |
| D2  | #37   | Classement par pays        | P1   | `À faire` | Caleb       |           |                    |
| D3  | #38   | Recherche sémantique       | P2   | `À faire` | Caleb       |           | Gel des P2 le 15   |

### Réputation (X)

| ID  | Issue | Exigence                                     | Prio | Statut    | Responsable | Référence        | Commentaire                                                                               |
| --- | ----- | -------------------------------------------- | ---- | --------- | ----------- | ---------------- | ----------------------------------------------------------------------------------------- |
| X1  | #39   | Proof XP : journal public, règles expliquées | P0   | `Terminé` | Caleb       | #102 (fusionnée) | `AwardXp`, `GET /u/:handle/proofs`, `GET /rules/xp`                                       |
| X2  | #40   | Garde-fous anti-abus                         | P0   | `Terminé` | Caleb       | #102 (fusionnée) | Plafond 60/jour, pas de vote pour soi, 2 validations par paire et par semaine, annulation |

### Hors ligne (O)

| ID  | Issue | Exigence                                   | Prio | Statut     | Responsable     | Référence | Commentaire                                                                      |
| --- | ----- | ------------------------------------------ | ---- | ---------- | --------------- | --------- | -------------------------------------------------------------------------------- |
| O1  | #41   | Lire sans réseau les contenus déjà ouverts | P0   | `En cours` | Sylvio          | PR #97    | Service worker et cache côté front ; contenus métier pas encore servis par l'API |
| O2  | #42   | Rédiger sans réseau                        | P0   | `En cours` | Sylvio, Florent | PR #97    | File IndexedDB côté front ; `/sync` idempotent côté API à faire                  |
| O3  | #43   | État réseau toujours visible               | P0   | `En cours` | Sylvio          | PR #97    |                                                                                  |
| O4  | #44   | Écran de conflit de version                | P1   | `À faire`  | Sylvio          |           |                                                                                  |

### Systalink, impact, notifications, stockage (Y)

| ID  | Issue | Exigence                                 | Prio | Statut    | Responsable | Référence | Commentaire                              |
| --- | ----- | ---------------------------------------- | ---- | --------- | ----------- | --------- | ---------------------------------------- |
| Y1  | #45   | État des services et dernière sauvegarde | P0   | `À faire` | Emmanuel    |           | `backup.sh` écrit déjà un fichier d'état |
| Y2  | #46   | Écran d'impact                           | P1   | `À faire` | Emmanuel    |           |                                          |
| Y3  | #47   | E-mails via la messagerie Systalink      | P1   | `À faire` | Emmanuel    |           | Mailpit prêt en local                    |
| Y4  | #48   | Stockage objet Systalink                 | P2   | `À faire` | Emmanuel    |           | Si le produit est accepté (#2)           |

### Modération (M) et langues (I)

| ID  | Issue | Exigence                                  | Prio | Statut     | Responsable | Référence | Commentaire                    |
| --- | ----- | ----------------------------------------- | ---- | ---------- | ----------- | --------- | ------------------------------ |
| M1  | #49   | Signaler un contenu, retrait par un admin | P0   | `À faire`  | Emmanuel    |           |                                |
| I1  | #50   | Interface en français et en anglais       | P0   | `En cours` | Sylvio      | PR #97    | Français par défaut côté front |

## Propositions v3.1

Toutes sont `À trier` sauf mention contraire, en attendant la revue du périmètre. Les propositions P2 et roadmap de la v3.1 n'ont pas d'issue et ne sont pas suivies ici.

| ID   | Issue | Proposition                                      | Prio      | Statut     | Responsable                   | Référence                               |
| ---- | ----- | ------------------------------------------------ | --------- | ---------- | ----------------------------- | --------------------------------------- |
| X3   | #52   | Score GitHub (G) résistant aux dépôts vides      | Correctif | `Terminé`  | Caleb (à la place de Joachim) | #99 (fusionnée)                         |
| X4   | #53   | Démarrage à froid du matching                    | Correctif | `À trier`  | Florent                       |                                         |
| Y8   | #54   | Temps réel par Server-Sent Events                | Correctif | `À trier`  | Florent                       |                                         |
| M2   | #55   | Protection contre l'injection de prompt          | Correctif | `En cours` | Joachim, Emmanuel             | PR #104 (piste IA)                      |
| O9   | #56   | Masquage des secrets avant la mise en file       | Correctif | `En cours` | Sylvio, Emmanuel              | PR #101 (`maskSecrets`), #104 (côté IA) |
| PR5  | #57   | Proof Card : carte de partage générée            | MVP+      | `À trier`  | Caleb                         |                                         |
| PR6  | #58   | Badge README dynamique pour GitHub               | MVP+      | `À trier`  | Caleb                         |                                         |
| PR7  | #59   | Barre de score bicolore G + P                    | MVP+      | `À trier`  | Sylvio                        |                                         |
| PR11 | #60   | Signaux de confiance, badge « Membre fondateur » | MVP+      | `Terminé`  | Caleb                         | #98 (fusionnée)                         |
| S8   | #61   | Assistant de rédaction et jauge de qualité       | MVP+      | `À trier`  | Florent                       |                                         |
| S9   | #62   | Étiquettes détectées depuis l'erreur             | MVP+      | `À trier`  | Joachim                       |                                         |
| S10  | #63   | Pont bilingue français et anglais                | MVP+      | `À trier`  | Joachim                       |                                         |
| S11  | #64   | Statut « Je m'en occupe »                        | MVP+      | `À trier`  | Florent                       |                                         |
| O5   | #65   | Simulateur de réseau intégré                     | MVP+      | `En cours` | Sylvio                        | PR #97 (`?net=offline\|2g`)             |
| R9   | #66   | Contributions vérifiées par GitHub               | MVP+      | `À trier`  | Joachim                       |                                         |
| X5   | #67   | Page publique « Comment marchent les Proof XP »  | MVP+      | `En cours` | Caleb                         | PR #102 (`GET /rules/xp`)               |
| Y6   | #68   | Systalink visible dans le parcours               | MVP+      | `À trier`  | Emmanuel                      |                                         |
| M3   | #69   | Code de conduite à l'inscription                 | MVP+      | `Terminé`  | Caleb                         | #98 (fusionnée)                         |
| T1   | #70   | Page d'accueil publique « en direct »            | MVP+      | `À trier`  | Sylvio                        | #97 a une landing publique              |
| T2   | #71   | Essai sans compte et visite guidée de 60 s       | MVP+      | `À trier`  | Sylvio                        |                                         |
| PR8  | #72   | Carte de chaleur de l'entraide                   | P1        | `À trier`  | Caleb                         |                                         |
| PR9  | #73   | Recommandations adossées à une preuve            | P1        | `À trier`  | Caleb                         |                                         |
| PR10 | #74   | « Je peux aider sur » et « Je veux apprendre »   | P1        | `À trier`  | Caleb                         |                                         |
| PR14 | #75   | Confidentialité granulaire du Passport           | P1        | `À trier`  | Caleb, Sylvio                 |                                         |
| S12  | #76   | Fiche de résolution générée                      | P1        | `À trier`  | Joachim                       |                                         |
| S14  | #77   | Lien de reproduction                             | P1        | `À trier`  | Sylvio                        |                                         |
| S16  | #78   | File « Personne n'a encore répondu »             | P1        | `À trier`  | Sylvio                        |                                         |
| O6   | #79   | Mode économie de données                         | P1        | `À trier`  | Sylvio                        |                                         |
| O8   | #80   | Centre de synchronisation                        | P1        | `À trier`  | Sylvio                        |                                         |
| R10  | #81   | Rôles recherchés                                 | P1        | `À trier`  | Joachim                       |                                         |
| R11  | #82   | Vue Kanban et santé du projet                    | P1        | `À trier`  | Sylvio                        |                                         |
| R12  | #83   | Salle créée à partir du README                   | P1        | `À trier`  | Joachim                       |                                         |
| R14  | #84   | Stand-up asynchrone relié à SOS Dev              | P1        | `À trier`  | Joachim                       |                                         |
| D4   | #85   | Carte interactive de l'Afrique                   | P1        | `À trier`  | Caleb                         |                                         |
| D5   | #86   | Classements par école, ville et communauté       | P1        | `À trier`  | Caleb                         |                                         |
| D6   | #87   | « Devs à rencontrer » sur l'accueil              | P1        | `À trier`  | Caleb                         |                                         |
| Y5   | #88   | Page de statut avec historique                   | P1        | `À trier`  | Emmanuel                      |                                         |
| Y7   | #89   | Notifications Telegram et Web Push               | P1        | `À trier`  | Joachim                       |                                         |
| Y9   | #90   | Écran d'impact enrichi                           | P1        | `À trier`  | Emmanuel                      |                                         |
| M4   | #91   | Journal d'audit de la modération                 | P1        | `À trier`  | Emmanuel                      |                                         |
| T3   | #92   | Accueil personnalisé en une question             | P1        | `À trier`  | Sylvio                        |                                         |
| T4   | #93   | Thème sombre                                     | P1        | `À trier`  | Sylvio                        |                                         |

## Travail réalisé hors cahier des charges

Travail présent dans les PR ouvertes mais classé **roadmap** (« à présenter, pas à coder ») par le cahier des charges v3 (§3). À arbitrer par le rôle 1 (Caleb) avant fusion.

| Élément                                                              | PR       | Classement dans le CDC v3                                                                  |
| -------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| Fil d'actualités réelles (module API `news`, 72 sources, vidéos)     | #96, #97 | Roadmap : « Fil d'actualité Dev Pulse »                                                    |
| Emplois, certifications                                              | #96, #97 | Roadmap : « Offres d'emploi », « certifications »                                          |
| Skills et outils IA, guide « Créer avec l'IA », templates, apprendre | #96, #97 | Roadmap : « Hub de skills », « parcours d'apprentissage », « assistant de création d'app » |
| Communautés, fil façon Reddit                                        | #96, #97 | Roadmap : « Stack Spaces »                                                                 |
