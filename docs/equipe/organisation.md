# Organisation de l'équipe

Cinq personnes, 17 jours de développement (du 6 au 22 octobre), soumission le 24 octobre. Ce document répartit les rôles du cahier des charges (§10) entre les membres réels de l'équipe, fixe les propriétaires de modules et les rituels.

> **À valider au point du 6 ou du 7 octobre.** La répartition ci-dessous est une **proposition**. Les rôles 1 (produit et pitch) et 5 (IA et intégrations) du cahier des charges n'ont pas encore de titulaire. On les propose en complément d'un rôle technique, pour équilibrer la charge.

## Membres et rôles

| Membre | Rôle principal (CDC §10) | Rôle complémentaire proposé | Modules back-end possédés | Écrans front pris en charge après le Jalon 2 |
|---|---|---|---|---|
| **Caleb KPOSSOU** | 2 · Back-end | **1 · Produit et pitch** (arbitrage du périmètre, contact Systalink, README, deck) | `identity`, `passport`, `reputation`, `discovery` | Passport, Découvrir, classement |
| **AMAMION Florent** | 2 · Back-end | Back-end « temps réel et synchronisation » | `sos`, `matching`, `notifications`, `sync` | — (appui ponctuel sur SOS Dev) |
| **Joachim GOEH-AKUE** | 2 · Back-end | **5 · IA et intégrations** (auteur des propositions v3.1) | `ai`, `github`, `rooms` | Salles de projet |
| **Sylvio CHALLA** | 3 · Front-end et hors ligne | Propriétaire de l'interface et du design | — | Shell, système de design, moteur hors ligne, SOS Dev, accueil, relecture de tous les écrans |
| **Emmanuel OKORIE** | 4 · DevOps et sécurité | Dernier mot sur ce qui part en production | `moderation`, `platform` | `/systalink`, `/impact`, `/admin` |

### Pourquoi cette répartition

- **Le front est le goulet d'étranglement** : une seule personne pour une PWA riche **et** le moteur hors ligne, qui est le chantier le plus risqué. Sylvio garde la propriété de l'interface, mais à partir du Jalon 2 (14 octobre), chaque back-end construit les écrans de ses propres modules, en réutilisant les composants de `shared/ui`, avec Sylvio comme relecteur obligatoire.
- **Rôle 1 (produit)** : Caleb coordonne déjà le projet (installation des outils, documentation). Le rôle demande surtout de la décision et de la communication, compatibles avec des modules back-end moins risqués que SOS Dev.
- **Rôle 5 (IA)** : Joachim a rédigé l'analyse v3.1, qui porte en bonne partie sur l'IA et GitHub (S9, S10, S12, R9, R12). Les salles de projet dépendent fortement de GitHub : même propriétaire.
- **Florent** prend la boucle temps réel complète de SOS Dev (question → matching → notification → réponse) et la synchronisation côté serveur, en binôme serré avec Sylvio sur le contrat hors ligne.
- **Emmanuel** garde des modules petits et proches de la sécurité et de l'infrastructure, pour rester disponible sur le déploiement, la CI et les revues de sécurité.

### Règle « aucune connaissance détenue par une seule personne » (§10)

| Sujet | Titulaire | Suppléant (sait reprendre) |
|---|---|---|
| Déploiement, VPS, secrets | Emmanuel | Caleb |
| Moteur hors ligne (front) | Sylvio | Florent |
| Idempotence et `/sync` | Florent | Caleb |
| Matching et XP (`packages/core/scoring`) | Florent, Caleb | Joachim |
| IA et GitHub | Joachim | Florent |
| Contact Systalink, soumission | Caleb | Emmanuel |

Si l'équipe perd un membre actif, le cahier des charges prévoit la fusion des rôles 1 et 5, puis 4 et 2.

## Autorité de décision

| Domaine | Qui tranche | Comment |
|---|---|---|
| Périmètre (ce qui entre, ce qui sort, P2 gelés le 15 oct.) | Rôle 1 (Caleb) | Après avis de l'équipe ; règle : on coupe avant de repousser une date |
| Ce qui part en production, sécurité | Rôle 4 (Emmanuel) | Peut bloquer une PR ou un déploiement |
| Architecture d'un module | Son propriétaire | ADR si la décision touche d'autres modules |
| Contrat d'API, hors ligne | Un back-end **et** Sylvio | Approbation des deux dans la PR |
| Interface, design | Sylvio | — |
| Désaccord persistant | Vote à la majorité au point quotidien | Décision consignée (ADR ou issue) |

## Rituels

| Rituel | Quand | Durée | Contenu |
|---|---|---|---|
| **Point quotidien** | Chaque jour à heure fixe (à choisir : par exemple 9 h 00 UTC) | 10 min | Pour chacun : fait hier, prévu aujourd'hui, blocages. Aucun débat technique : on le planifie après |
| **Revue de jalon** | Les 8, 14, 16, 18 et 22 octobre | 30 min | Le critère de sortie est-il tenu, sur l'URL de production ? Sinon : on coupe quoi ? |
| **Revue du périmètre** | Les 9 et 15 octobre | 20 min | Tri des propositions v3.1, gel des P2 le 15 |
| **Répétition de démo** | Les 21, 23 et 24 octobre | 30 min | Le script de 4 minutes, sur la production |

Le point quotidien est asynchrone si quelqu'un ne peut pas être présent : il écrit ses trois lignes sur le canal de l'équipe avant l'heure.

## Outils

| Besoin | Outil |
|---|---|
| Code, revues, CI | GitHub : dépôt `sx1vio/CADEV-saiyens` |
| Backlog | **GitHub Projects** (tableau Kanban : *À faire*, *En cours*, *En revue*, *Terminé*), une issue par user story (identifiant du cahier des charges dans le titre : `[S1] Poser une question`) |
| Communication | Canal de l'équipe (WhatsApp ou Discord) ; décisions recopiées dans une issue ou un ADR |
| Documentation | Ce dossier `docs/`, versionné avec le code |
| Secrets partagés | Secrets GitHub Actions + gestionnaire de mots de passe partagé. **Jamais** dans le chat |

### Étiquettes GitHub

| Étiquette | Usage |
|---|---|
| `P0`, `P1`, `P2`, `MVP+`, `correctif` | Priorité (cahier des charges et v3.1) |
| `front`, `back`, `infra`, `ia`, `docs` | Domaine |
| `sos`, `rooms`, `passport`, `offline`, `xp`, `systalink` | Pilier ou module |
| `bloqué` | En attente d'une décision ou d'une autre tâche |
| `contrat` | Touche le contrat d'API ou le hors ligne (deux approbations) |
| `démo` | Sur le chemin critique de la démo |

## Planning par personne

Le planning du cahier des charges (§11), avec les noms. Les ajouts v3.1 retenus seront insérés après la revue du périmètre du 9 octobre, selon le §13 de la v3.1.

| Date | Caleb | Florent | Joachim | Sylvio | Emmanuel |
|---|---|---|---|---|---|
| **Lun 5** (passé) | Nom, message à Systalink, stack | Contrat hors ligne avec Sylvio | — | Contrat hors ligne | « Hello world » sur le VPS |
| **Mar 6** | Validation des ADR ; squelette `apps/api` ; schéma v1 et migrations | Squelette `sync` + intercepteur d'idempotence | Application OAuth GitHub (avec Emmanuel) ; clé IA | Shell PWA, routeur, i18n FR/EN, système de design de base | CI, `docker-compose`, Caddy, déploiement auto |
| **Mer 7** | OAuth GitHub, sessions, `GET /me` | Tables questions et réponses, `POST /questions` | Import du profil GitHub (X3) ; budget et quota IA | Maquettes SOS Dev ; Passport v0 | Sauvegarde quotidienne ; décision « PostgreSQL managé ou Docker » |
| **Jeu 8 · Jalon 1** | Passport v0 (API) | Revue | Revue | Connexion et Passport v0 (écran) | Revue de sécurité de base |
| **Ven 9** | `reputation` : journal et barème | Liste, fiche, étiquettes | Prompts IA (M2) ; `ai.hint` | Formulaire de question, file IndexedDB v0, service worker | Limitation du débit, en-têtes |
| **Sam 10** | Validation → XP | Réponses, votes, validation | Piste IA asynchrone | Fiche question, réponses, votes | CSP en mode rapport |
| **Dim 11** | Scores de compétence | Matching v1, SSE (Y8) | Détection d'étiquettes (S9) | Indicateur réseau, temps réel | E-mails SMTP Systalink |
| **Lun 12** | Liste de 30+ invités, préparation de l'amorçage | Escalade 15 min, `/sync` idempotent | Modèle des salles | Synchronisation côté client | Comptes admin et démo |
| **Mar 13** | Vague d'invitations | Tests de bout en bout SOS Dev | Pont bilingue (S10) | Synchronisation hors ligne des questions et réponses | CI Playwright |
| **Mer 14 · Jalon 2** | Tous : poser une question → piste IA → réponse d'un autre dev | | | | |
| **Jeu 15** | Gel des P2 | Appui hors ligne | Création de salle + lien GitHub | Indicateur d'état, écran de conflit, simulateur (O5) | Modération (M1) |
| **Ven 16 · Jalon 3** | Test sur téléphone | Demandes pour rejoindre (API) | Rejoindre une salle (écran) | Hors ligne testé sur vrai téléphone | Test sur téléphone |
| **Sam 17** | Passport public et « Voir les preuves » (écran) | Appui salles | Tâches, import des issues, vérification PR (R9) | Relectures, Passport | — |
| **Dim 18 · Jalon 4** | Tous : créer une salle, lier un dépôt, rejoindre, tâches | | IA de projet (R5, P1) | | |
| **Lun 19** | Découverte, classement par pays | Aperçus Open Graph, Proof Card | — | Accueil public (T1), essai sans compte (T2) | — |
| **Mar 20** | — | — | — | — | Écrans Systalink et Impact ; **restauration de sauvegarde testée** |
| **Mer 21** | Tous : performance (< 300 Ko), sécurité, bout en bout complet, première répétition | | | | |
| **Jeu 22 · Jalon 5** | **Gel du code**, corrections critiques seulement | | | | |
| **Ven 23** | README, deck, vidéo | Corrections | Corrections | Corrections, captures | Compte et vidéo de secours, test extérieur |
| **Sam 24** | **Soumission avant midi** | | | | |

## Communication avec Systalink et le challenge

- Contact : `cadev@systalink.com` (Caleb, rôle 1).
- Questions ouvertes à poser **dès que possible** (échéance du 6 octobre) : barème complet, liste exacte des produits Systalink acceptés (dont le stockage objet), lieu et format de la soumission, localisation des serveurs (pour le slogan « hébergé en Afrique »), possibilité de proposer DevHub aux autres participants (idée A1 de la v3.1), type exact de la base de données.
- Toute réponse reçue est consignée dans une issue `[Systalink]`, pour que toute l'équipe y ait accès.
