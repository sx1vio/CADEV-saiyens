# 07 · Tâches de fond et temps réel

Deux besoins, une seule brique : **PostgreSQL**.
- Les **tâches de fond** (piste IA, matching, e-mails, escalade…) passent par une file stockée dans PostgreSQL, gérée par **pg-boss**. Voir [ADR-0006](../adr/0006-file-taches-pg-boss.md).
- Le **temps réel** (notifications, nouvelles réponses, « Je m'en occupe ») passe par **Server-Sent Events**, alimentés par `LISTEN/NOTIFY`. Voir [ADR-0007](../adr/0007-temps-reel-sse-listen-notify.md).

## Tâches de fond (pg-boss)

### Pourquoi pg-boss

- C'est le choix du cahier des charges (§8) : la file vit dans PostgreSQL, on n'a pas de service de plus.
- Les jobs sont **créés dans la même transaction** que l'action métier (boîte d'envoi transactionnelle) : pas de job orphelin, pas d'action sans son job.
- Il gère les reprises, les délais (`startAfter` pour l'escalade à 15 minutes), les tâches planifiées (cron), l'unicité (`singletonKey`) et la concurrence.

### Où tournent les jobs

Dans le **process worker** (`apps/api/src/worker.ts`), un conteneur séparé de l'API mais construit à partir de la même image. Si le worker redémarre, les jobs attendent ; s'il plante pendant un job, pg-boss le relance après expiration.

### Catalogue des jobs

| Job | Déclencheur | Rôle | Délai max | Reprises | US |
|---|---|---|---|---|---|
| `ai.hint` | `QuestionAsked` | Piste IA ; met à jour `ai_hint` et `ai_status` ; notifie l'auteur | 10 s (puis `failed`) | 1 | S2 |
| `matching.run` | `QuestionAsked` (après `ai.hint` ou en parallèle) | Calcule les scores, choisit 3 aidants, écrit `match_events`, notifie | 30 s | 3 | S3 |
| `matching.escalate` | `MatchCreated`, `startAfter` = +15 min | Sans réponse ni « Je m'en occupe » actif : sollicite 3 aidants de plus (vague 2) ; sinon ne fait rien | 30 s | 3 | §6.1, S11 |
| `notifications.fanout` | Événements métier | Crée les `notifications`, `NOTIFY`, planifie l'e-mail si l'utilisateur n'est pas connecté | 10 s | 5 | S3, Y3 |
| `notifications.email` | `notifications.fanout` (+2 min si non lue) | Envoi SMTP Systalink, lien de désabonnement | 60 s | 5 (repli exponentiel) | Y3 |
| `notifications.telegram` | `notifications.fanout` | Message du bot Telegram | 10 s | 3 | Y7 (P1) |
| `github.import-profile` | `UserSignedUp`, `POST /me/github/refresh` | Dépôts, langages, âge du compte ; recalcule G (X3) | 120 s | 3 | PR1, X3 |
| `github.verify-pr` | `TaskCompleted` | Vérifie PR fusionnée et auteur ; met à jour `verification` | 30 s | 5 | R9 |
| `github.import-issues` | `POST /rooms/:id/tasks/import-issues` | Crée les tâches depuis les issues ouvertes | 60 s | 3 | R2 |
| `ai.room-tasks` | `POST /rooms/:id/ai/tasks` | Propositions de tâches, en attente de validation | 30 s | 1 | R5 |
| `ai.resolution-sheet` | `AnswerAccepted` | Fiche de résolution proposée à l'auteur | 30 s | 1 | S12 (P1) |
| `ai.translate` | `POST …/translate` | Traduction FR ↔ EN, mise en cache | 15 s | 1 | S10 |
| `sos.still-resolved-check` | `AnswerAccepted`, +24 h | « Toujours résolu ? » | 10 s | 3 | S15 (P2) |
| `passport.recompute-skills` | Changement d'XP ou de GitHub | Recalcule `user_skills` | 30 s | 3 | PR3 |
| `passport.render-card` | Changement de score | Régénère la Proof Card | 30 s | 2 | PR5 |
| `status.check` | Cron toutes les 5 min | Sonde chaque service Systalink ; écrit `status_checks` | 30 s | 0 | Y1, Y5 |
| `maintenance.purge` | Cron quotidien 03:00 UTC | Purge des `idempotency_keys` > 7 j, `status_checks` > 30 j, sessions expirées | 5 min | 1 | — |
| `demo.reset-sandbox` | Cron quotidien 02:00 UTC | Remet à zéro le bac à sable de l'essai sans compte | 5 min | 1 | T2 |
| `moderation.collusion-scan` | Cron quotidien | Détection de validations croisées suspectes | 5 min | 1 | X8 (P2) |

### Règles d'écriture d'un job

- **Idempotent** : un job peut être exécuté deux fois (après un plantage, par exemple). Il vérifie l'état avant d'agir, comme `matching.escalate` qui ne fait rien si quelqu'un a déjà répondu, et il s'appuie sur les contraintes d'unicité (`match_events (question_id, helper_id)`).
- **Court** : délai maximal explicite, sans boucle infinie.
- **Observable** : il journalise le début, la fin, la durée et l'identifiant métier (jamais le contenu utilisateur en clair).
- **Typé** : le payload est défini par un schéma zod dans `infrastructure/jobs/catalog.ts` et validé à la réception.

### Création d'un job dans la transaction

```ts
// infrastructure/jobs/domain-event-publisher.ts (indicatif)
async publish(event: DomainEvent, tx: Tx) {
  for (const job of jobsFor(event)) {
    await this.boss.send(job.name, job.data, {
      ...job.options,                                    // startAfter, singletonKey, retryLimit…
      db: { executeSql: (text, values) => tx.$queryRawUnsafe(text, ...values) },
    });
  }
}
```

L'option `db` de pg-boss permet d'insérer le job avec la connexion de la transaction Prisma en cours.

## Temps réel : Server-Sent Events

### Pourquoi SSE (correctif Y8)

- Le besoin est **unidirectionnel** (serveur vers client). Les écritures passent déjà par HTTP et la file d'actions.
- SSE passe par HTTP/1.1 et HTTP/2 sans configuration spéciale des proxys, et **reprend automatiquement** après une coupure, avec `Last-Event-ID`.
- Aucun service supplémentaire n'est nécessaire.

### Architecture

```mermaid
sequenceDiagram
    participant W as Worker ou API
    participant DB as PostgreSQL
    participant L as API : écouteur LISTEN
    participant R as Registre des connexions SSE
    participant C as Navigateur (EventSource)

    C->>R: GET /api/v1/events (cookie), Last-Event-ID: 1842
    R->>DB: SELECT notifications WHERE user_id = … AND seq > 1842
    R-->>C: événements manqués
    W->>DB: INSERT notification (seq 1843) ; NOTIFY devhub_events, '{"u":"…","s":1843}'
    DB-->>L: notification
    L->>R: dispatch(userId)
    R-->>C: id: 1843 / event: answer.created / data: {…}
    loop toutes les 25 s
        R-->>C: commentaire « : ping »
    end
```

- **Une seule connexion `LISTEN`** par process API (canal `devhub_events`), et non une par client.
- Le `NOTIFY` ne transporte que l'identifiant de l'utilisateur et le `seq` (limite de 8 Ko par message). L'API relit l'événement complet en base.
- Les événements publics (nouvelle question dans une stack, mise à jour d'une question que je regarde) passent par le canal `devhub_public` avec un sujet (`question:<id>`, `tag:<slug>`). Le client s'y abonne par paramètre : `GET /events?topics=question:c9e0…`.
- **Reprise** : l'`id` de chaque événement SSE est `notifications.seq`. Au retour, le navigateur envoie `Last-Event-ID`, et l'API rejoue ce qui manque (100 événements au maximum ; au-delà, le client recharge ses données).
- **Ping** toutes les 25 secondes pour maintenir la connexion à travers les proxys des opérateurs mobiles.
- **Caddy** : `flush_interval -1` sur `/api/v1/events` pour ne pas mettre la réponse en tampon.

### Types d'événements

| `event` | Destinataire | Effet côté front |
|---|---|---|
| `notification.created` | Utilisateur | Pastille, liste des notifications |
| `question.ai_hint` | Auteur, observateurs de la question | Affiche la piste IA |
| `question.matched` | Auteur | Affiche les aidants sollicités et leurs raisons |
| `question.claimed` | Auteur | « Moussa examine ta question depuis 2 min » (S11) |
| `answer.created` | Auteur, observateurs | Ajoute la réponse |
| `answer.accepted` | Aidant, observateurs | Statut résolu ; animation +XP chez l'aidant |
| `xp.awarded` | Utilisateur | Met à jour le total et le Passport |
| `task.updated` | Membres de la salle | Met à jour la tâche (prise, vérifiée par GitHub…) |
| `room_message.created` | Membres de la salle | Ajoute le message |
| `content.hidden` | Tous les observateurs | Retire le contenu de l'affichage (M1 : moins d'une minute) |

### Repli

Si `EventSource` échoue trois fois de suite (proxy hostile, navigateur ancien), le front passe en **interrogation toutes les 30 secondes** de `GET /notifications?after=<seq>`. Le contrat ne change pas : seul le transport diffère.

### Limites et capacité

- Une connexion SSE par onglet connecté, en HTTP/2 via Caddy (multiplexée, sans limite des 6 connexions par domaine).
- Ordre de grandeur visé pendant le challenge : quelques centaines de connexions simultanées. Node.js les tient sans difficulté sur un seul process.
- Au-delà d'un process API, chaque instance a son propre `LISTEN`, et `NOTIFY` diffuse à toutes : l'architecture passe à plusieurs instances sans modification.
