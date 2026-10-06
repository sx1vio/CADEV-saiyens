# Glossaire

Le même mot doit désigner la même chose dans le produit, dans le code et dans les discussions (« langage omniprésent » en DDD). Colonne « Code » : le nom utilisé dans le code et la base.

## Produit

| Terme | Code | Définition |
|---|---|---|
| **SOS Dev** | module `sos` | Le pilier « Aider » : poser une question, recevoir une piste IA puis l'aide d'un pair |
| **Question** | `Question`, `questions` | Demande d'aide d'un dev bloqué : titre, corps, extrait de code ou d'erreur, étiquettes, urgence, langue |
| **Piste IA** | `aiHint` | Première réponse générée par l'IA, marquée « générée par IA, à vérifier ». N'est **pas** une réponse au sens des statistiques |
| **Réponse** | `Answer`, `answers` | Réponse écrite par un humain |
| **Validation** | `accept` | L'auteur de la question marque la réponse qui l'a débloqué ; la question passe en `resolved` |
| **Aidant** | `helper` | Dev sollicité par le matching pour une question |
| **Matching** | module `matching` | Choix des 3 aidants les plus adaptés, avec leur raison |
| **Escalade** | `escalate`, `wave = 2` | Sollicitation de 3 aidants de plus si personne n'a répondu au bout de 15 minutes |
| **« Je m'en occupe »** | `claim`, `claimedAt` | Un aidant signale qu'il examine la question (S11) |
| **Fiche de connaissance** | — | Question résolue, cherchable dans la base de connaissance (S6) |
| **Salle (de projet)** | `Room`, `rooms` | Espace d'un projet relié à un dépôt GitHub, avec membres, tâches et discussion |
| **Tâche** | `Task`, `tasks` | Travail ouvert aux contributeurs : `open` → `taken` → `in_review` → `done` |
| **Contribution vérifiée** | `verification = github_verified` | Tâche close avec une PR fusionnée dont l'auteur GitHub est le contributeur (R9) |
| **Contribution déclarée** | `verification = declared` | Tâche close sans vérification GitHub possible ; affichée comme telle |
| **Point du jour** | `kind = standup` | Message « fait, prévu, bloqué » dans une salle ; « bloqué » crée une question SOS Dev (R14) |
| **Developer Passport** | module `passport`, `/u/:handle` | Identité technique publique où chaque score renvoie à ses preuves |
| **Preuve** | ligne de `xp_events` ou signal GitHub | Fait vérifiable qui justifie une partie d'un score |
| **Proof XP** | `xp_events.points` | Points gagnés par des actions utiles, dans un journal public append-only |
| **Score de compétence** | `user_skills.score` | min(100, G + P) pour une étiquette |
| **G** | `githubSignal` | Part GitHub du score : min(40, 5 × dépôts qualifiés) |
| **P** | `xpTag` plafonné | Part plateforme du score : min(60, XP sur l'étiquette) |
| **Dépôt qualifié** | — | Non forké, non vide, actif depuis moins de 24 mois, technologie ≥ 20 % du code (X3) |
| **Étiquette** | `Tag`, `tags` | Technologie (docker, react, nodejs…) ; sert au matching et aux scores |
| **Proof Card** | `/og/u/:handle.png` | Image de partage du Passport (PR5) |
| **Classement par pays** | `/leaderboard` | Somme des Proof XP nets des devs d'un pays |
| **Démarrage à froid** | `regime = cold_start` | Régime du matching tant que la plateforme a moins de 50 réponses validées (X4) |
| **Compte démo** | `isDemo` | Compte de démonstration, marqué partout et exclu des chiffres réels |
| **Écran Systalink** | `/systalink` | État réel des services Systalink utilisés |
| **Écran d'impact** | `/impact` | Chiffres réels de la communauté |

## Technique

| Terme | Définition |
|---|---|
| **Hors ligne d'abord** | L'application est conçue pour fonctionner sans réseau ; le réseau sert à synchroniser |
| **File d'actions (outbox)** | Table IndexedDB où chaque écriture attend d'être envoyée au serveur |
| **Action** | Écriture de l'utilisateur dans la file, identifiée par un `opId` |
| **`opId` / Idempotency-Key** | UUID d'une action ; permet au serveur de reconnaître un rejeu et de ne pas créer de doublon |
| **`clientId`** | UUID généré par le client pour une entité créée (question, réponse, message) ; unique par auteur |
| **Référence `client:`** | Manière de désigner une entité créée hors ligne avant de connaître son identifiant serveur |
| **`baseVersion` / `version`** | Compteur de modification ; une différence signale un conflit |
| **Conflit de version** | Un texte modifié hors ligne a aussi changé sur le serveur entre-temps |
| **Simulateur de réseau** | Interrupteur qui imite une coupure ou une connexion 2G (O5) |
| **SSE** | Server-Sent Events : flux HTTP du serveur vers le navigateur, pour le temps réel |
| **Job** | Tâche de fond dans la file pg-boss, exécutée par le worker |
| **Boîte d'envoi transactionnelle** | Création des jobs dans la même transaction que l'action métier |
| **Module** | Contexte métier du back-end (`sos`, `rooms`…), avec ses tables et son API publique |
| **Port / adaptateur** | Interface dont le domaine a besoin / implémentation concrète (Prisma, GitHub, IA…) |
| **Cas d'usage** | Classe de la couche `application` qui réalise une action métier (`AcceptAnswer`) |
| **Contrat** | Schémas zod de `@devhub/contracts`, partagés entre le front et l'API |
| **ADR** | Architecture Decision Record : trace écrite d'une décision technique |

## Priorités du cahier des charges

| Terme | Sens |
|---|---|
| **P0** | Indispensable à la démo |
| **P1** | Fortement souhaité |
| **P2** | Bonus si le temps le permet ; gelé le 15 octobre |
| **MVP+** | Ajout v3.1 recommandé au MVP : coût faible, impact fort |
| **Correctif** | Corrige une faille ou une incohérence du v3 ; à intégrer dans les contrats des premiers jours |
| **Roadmap** | À présenter, pas à coder |
