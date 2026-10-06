# 06 · Contrat d'API

API **REST** en JSON, versionnée, documentée en **OpenAPI** générée depuis les schémas zod de `@devhub/contracts`. Documentation interactive : `/api/docs` (désactivée en production si besoin). Voir [ADR-0010](../adr/0010-contrat-api-rest-zod-openapi.md).

## Conventions générales

| Sujet | Règle |
|---|---|
| Base | `https://<domaine>/api/v1` |
| Format | `application/json; charset=utf-8`, champs en `camelCase` |
| Identifiants | UUID en chaîne ; le Passport s'adresse par `handle`, une salle par `inviteCode` dans les URL publiques |
| Dates | ISO 8601 en UTC (`2026-10-16T10:42:07Z`) |
| Langue | Le serveur ne renvoie pas de texte destiné à l'utilisateur, seulement des `code` stables traduits par le front. Exception : le contenu des utilisateurs et les sorties de l'IA |
| Authentification | Cookie de session `__Host-sid` (HttpOnly, Secure, SameSite=Lax). Pas de jeton dans le stockage du navigateur |
| Protection CSRF | Les écritures exigent un en-tête `Origin` égal à l'origine de l'application, et l'en-tête `X-DevHub-Client: web` |
| Idempotence | En-tête `Idempotency-Key` (UUID) **obligatoire** sur `POST`, `PATCH`, `DELETE` (voir [04](04-hors-ligne-sync.md#3-idempotence-côté-serveur)) |
| Versionnement | Préfixe d'URL `/v1`. Un changement incompatible crée `/v2` pour l'endpoint concerné. Avant le gel, on préfère un champ ajouté (compatible) à un champ renommé |
| Cache HTTP | `ETag` sur les ressources individuelles ; `Cache-Control: private, no-cache` sur les données personnelles ; `public, max-age=3600` sur les badges et images de partage |

### Pourquoi certaines URL contiennent un verbe

Le cahier des charges définit `POST /answers/:id/accept`, `POST /tasks/:id/take`, etc. Ce sont des **actions métier** qui déclenchent des règles (XP, notifications, vérification GitHub). Les modéliser en `PATCH /answers/:id { isAccepted: true }` cacherait ces règles derrière une simple mise à jour de champ. On garde donc des sous-ressources d'action, explicites et faciles à journaliser, tout en respectant la sémantique HTTP : `POST` pour une action non sûre, idempotent grâce à l'`Idempotency-Key`.

## Pagination

Pagination **par curseur** sur toutes les listes (stable même quand de nouveaux éléments arrivent, ce qui est fréquent ici) :

```http
GET /api/v1/questions?status=open&tag=docker&limit=20&cursor=eyJjIjoiMjAyNi0xMC0xNlQxMDo0MjowN1oiLCJpIjoiYzllMCJ9
```

```json
{
  "data": [ { "id": "…", "title": "…" } ],
  "page": { "nextCursor": "eyJ…", "hasMore": true }
}
```

- `limit` vaut 20 par défaut et 50 au maximum.
- Le curseur est opaque (base64url de la clé de tri), le client ne le construit jamais.
- Il n'y a pas de total, car il est coûteux. Les écrans qui affichent un nombre utilisent un endpoint de statistiques dédié.

## Erreurs

Format **RFC 9457** (`application/problem+json`) :

```json
{
  "type": "https://devhub.africa/errors/question.already_resolved",
  "title": "Question already resolved",
  "status": 409,
  "code": "question.already_resolved",
  "detail": "This question was resolved by another answer.",
  "instance": "/api/v1/answers/4b1e…/accept",
  "requestId": "req_01J…",
  "errors": [ { "path": "title", "code": "too_small", "params": { "minimum": 10 } } ]
}
```

| HTTP | Usage | Exemples de `code` |
|---|---|---|
| 400 | Requête mal formée, validation | `validation.failed`, `idempotency_key.missing` |
| 401 | Non connecté | `auth.required` |
| 403 | Connecté mais pas autorisé | `forbidden`, `room.not_member`, `xp.self_vote` |
| 404 | Ressource absente ou masquée | `not_found` |
| 409 | Conflit d'état | `question.already_resolved`, `task.already_taken`, `version_conflict`, `idempotency_key.in_progress` |
| 422 | Règle métier refusée | `idempotency_key.reused`, `room.repo_not_found`, `xp.daily_cap_reached` |
| 429 | Limite de débit | `rate_limited` (avec en-tête `Retry-After`) |
| 503 | Dépendance indisponible | `github.unavailable` (l'action est replanifiée) |

Les `code` sont listés dans `packages/contracts/src/errors.ts`, partagés avec le front pour la traduction.

## Limitation du débit

| Portée | Limite | Raison |
|---|---|---|
| IP, endpoints publics | 120 requêtes par minute | Lecture des Passports, accueil public |
| Utilisateur, écritures | 30 par minute | Anti-spam (§9) |
| Utilisateur, création de questions | 10 par heure | Anti-spam |
| Utilisateur, appels IA | 10 par heure (§8), réglable | Coût maîtrisé |
| IP, `/auth/*` | 10 par minute | Force brute sur le callback |
| `/sync` | 6 lots par minute | Un lot contient déjà jusqu'à 50 actions |

En-têtes renvoyés : `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## Liste des endpoints

Légende de l'accès : **Pub** = public sans compte ; **Co** = connecté ; **Adm** = administrateur. **Id** = `Idempotency-Key` obligatoire. Les identifiants d'user stories renvoient au cahier des charges.

### Authentification et compte (`identity`)

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `GET /auth/github` | Pub | Redirection OAuth (paramètre `state` signé, PKCE) | A1 |
| `GET /auth/github/callback` | Pub | Création ou connexion du compte, cookie de session, import du profil en tâche de fond | A1, PR1 |
| `GET /auth/gitlab`, `GET /auth/google` (+ `/callback`) | Pub | Idem | A2 (P1) |
| `POST /auth/logout` | Co, Id | Révoque la session | — |
| `GET /me` | Co | Mon profil, mes préférences, mes compteurs | PR1 |
| `PATCH /me` | Co, Id | Fuseau, disponibilités, langues, « je cherche », « je peux aider » et « je veux apprendre », langue de l'interface | PR1, PR10, T3 |
| `PATCH /me/privacy` | Co, Id | Confidentialité par champ, mode non listé | PR14 |
| `POST /me/code-of-conduct` | Co, Id | Acceptation du code de conduite | M3 |
| `DELETE /me` | Co, Id | Suppression du compte (anonymisation) | A3 |

### Passport et réputation (`passport`, `reputation`)

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `GET /u/:handle` | Pub | Passport public : identité, compétences (G + P), statistiques, projets, signaux de confiance | PR2, PR7, PR11 |
| `GET /u/:handle/proofs?tag=` | Pub | Chronologie des preuves, filtrable par étiquette ; chaque ligne renvoie à sa source | PR3, X1 |
| `GET /u/:handle/activity` | Pub | Carte de chaleur de l'entraide sur 26 semaines | PR8 (P1) |
| `POST /u/:handle/endorsements` | Co, Id | Recommandation adossée à une interaction vérifiée | PR9 (P1) |
| `POST /me/github/refresh` | Co, Id | Réimport du profil GitHub (limité à 1 par heure) | PR1 |
| `GET /rules/xp` | Pub | Barème, plafonds et formules (alimente `/regles`) | X5 |

Routes **hors** `/api/v1`, servies par l'API pour les robots et les README :

| Chemin | Rôle | US |
|---|---|---|
| `GET /u/:handle`, `GET /p/:code` (HTML) | `index.html` avec balises Open Graph injectées | PR2, R7 |
| `GET /og/u/:handle.png`, `GET /og/p/:code.png` | Proof Card et carte de salle 1200 × 630 | PR5 |
| `GET /badge/:handle.svg`, `GET /badge/:handle/:tag.svg` | Badge README dynamique | PR6 |

### SOS Dev (`sos`, `matching`)

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `GET /questions?status=&tag=&q=&mine=&unanswered=` | Pub | Liste, filtres, recherche plein texte | S6, S16 |
| `GET /questions/similar?title=&tags=` | Co | Jusqu'à 3 questions similaires avant publication | S7 (P1) |
| `POST /questions` | Co, Id | Poser une question. Déclenche la piste IA et le matching | S1, S2, S3 |
| `GET /questions/:id` | Pub | Question, piste IA, réponses, aidants sollicités et leurs raisons | S2, S3 |
| `PATCH /questions/:id` | Co (auteur), Id | Modifier (avec `baseVersion`) | O4 |
| `POST /questions/:id/claim` | Co (aidant sollicité), Id | « Je m'en occupe » | S11 |
| `POST /questions/:id/answers` | Co, Id | Répondre | S4 |
| `PATCH /answers/:id` | Co (auteur), Id | Modifier (avec `baseVersion`) | O4 |
| `POST /answers/:id/vote` | Co, Id | « Réponse utile » (pas pour soi) | S4, X2 |
| `POST /answers/:id/accept` | Co (auteur de la question), Id | Valider : question résolue, Proof XP attribués | S4, X1 |
| `POST /questions/:id/pair` | Co, Id | Proposer un créneau de pair programming | S5 (P1) |
| `POST /pair-sessions/:id/respond` | Co, Id | Accepter ou refuser | S5 (P1) |
| `POST /questions/:id/translate?lang=` | Co, Id | Traduction IA à la demande (mise en cache) | S10 |
| `POST /tags/detect` | Co | Affinage IA des étiquettes détectées localement | S9 |

### Salles de projet (`rooms`)

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `GET /rooms?tag=&state=&q=&role=` | Pub | Liste et recherche | D1 |
| `POST /rooms` | Co, Id | Créer (dépôt vérifié via l'API GitHub) | R1 |
| `POST /rooms/draft-from-repo` | Co | Proposition de description, stack et tâches depuis le README | R12 (P1) |
| `GET /rooms/:code` | Pub | Fiche de salle | R1 |
| `PATCH /rooms/:id` | Co (owner), Id | Modifier | R1 |
| `POST /rooms/:id/join` | Co, Id | Demander à rejoindre | R3 |
| `POST /join-requests/:id/decide` | Co (owner), Id | Accepter ou refuser | R3 |
| `GET /rooms/:id/tasks` | Pub | Tâches | R2 |
| `POST /rooms/:id/tasks` | Co (membre), Id | Créer une tâche | R2 |
| `POST /rooms/:id/tasks/import-issues` | Co (owner), Id | Importer les issues GitHub | R2 |
| `POST /tasks/:id/take` | Co (membre), Id | Prendre une tâche | R2 |
| `POST /tasks/:id/submit` | Co (assigné), Id | Passer en revue avec un lien de PR | R2 |
| `POST /tasks/:id/complete` | Co (owner), Id | Terminer : vérification GitHub, +15 XP | R8, R9 |
| `GET /rooms/:id/messages?cursor=` | Co (membre) | Discussion | R4 (P1) |
| `POST /rooms/:id/messages` | Co (membre), Id | Message ou « Point du jour » | R4, R14 |
| `POST /rooms/:id/ai/tasks` | Co (owner), Id | Propositions de tâches depuis la discussion (jamais créées sans validation) | R5 (P1) |
| `POST /rooms/:id/feedback-requests` | Co (membre), Id | Demander un retour ou une revue | R6 (P1) |
| `POST /feedback-requests/:id/confirm` | Co (demandeur), Id | Confirmer la revue : +8 XP au relecteur | R6 |

### Découverte (`discovery`)

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `GET /discover/devs?tag=&tz=&available=&lookingFor=&country=` | Pub | Recherche de devs (filtres combinables, respecte le mode non listé) | D1 |
| `GET /discover/rooms?…` | Pub | Recherche de salles | D1 |
| `GET /discover/suggestions` | Co | « Devs à rencontrer » avec leur raison | D6 (P1) |
| `GET /leaderboard?scope=country\|community&season=` | Pub | Classement (calcul transparent, lié au journal) | D2, D5, D7 |
| `GET /leaderboard/map` | Pub | Agrégats par pays pour la carte | D4 (P1) |

### Synchronisation, notifications, temps réel

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `POST /sync` | Co | Lot d'actions hors ligne (voir [04](04-hors-ligne-sync.md#4-endpoint-post-sync)) | O2 |
| `GET /events` | Co | Flux **Server-Sent Events** (voir [07](07-taches-fond-temps-reel.md)) | S3, Y8 |
| `GET /notifications?cursor=` | Co | Notifications | S3 |
| `POST /notifications/read` | Co, Id | Marquer comme lues | — |
| `PATCH /me/notification-settings` | Co, Id | E-mail, désabonnement, Telegram, Web Push | Y3, Y7 |
| `GET /unsubscribe?token=` | Pub | Désabonnement en un clic depuis un e-mail | Y3 |

### Systalink, impact, modération

| Méthode et chemin | Accès | Rôle | US |
|---|---|---|---|
| `GET /status` | Pub | État réel des services Systalink, latence, dernière sauvegarde | Y1, Y6 |
| `GET /status/history?days=7` | Pub | Disponibilité sur 7 jours | Y5 (P1) |
| `GET /impact` | Pub | Devs inscrits, questions résolues, temps médian de première réponse humaine, pays, échanges entre langues | Y2, Y9 |
| `GET /live-feed` | Pub | Flux anonymisé de la page d'accueil publique | T1 |
| `POST /demo/session` | Pub | Session d'essai sans compte dans le bac à sable | T2 |
| `POST /reports` | Co, Id | Signaler un contenu | M1 |
| `GET /admin/reports` | Adm | File de modération | M1 |
| `POST /admin/reports/:id/action` | Adm, Id | Masquer, restaurer, annuler des XP, rejeter (journalisé) | M1, M4 |
| `GET /admin/audit` | Adm | Journal d'audit | M4 (P1) |

### Santé (non versionnée)

| Chemin | Rôle |
|---|---|
| `GET /api/v1/healthz` | Le processus répond (utilisé par le front pour confirmer « en ligne ») |
| `GET /readyz` | La base répond et les migrations sont à jour (utilisé par Docker et la CI de déploiement) |

## Exemple complet : poser une question

```http
POST /api/v1/questions HTTP/1.1
Cookie: __Host-sid=…
Origin: https://devhub.africa
X-DevHub-Client: web
Idempotency-Key: 6f1c2a8e-3b4d-4e5f-9a0b-1c2d3e4f5a6b
Content-Type: application/json

{
  "clientId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "title": "nginx renvoie 502 derrière Docker Compose",
  "body": "Je veux exposer mon API Node via nginx…",
  "codeSnippet": "upstream api { server localhost:3000; }",
  "tagSlugs": ["docker", "nginx", "nodejs"],
  "urgency": "high",
  "lang": "fr"
}
```

```http
HTTP/1.1 201 Created
Location: /api/v1/questions/c9e0f1a2-…
ETag: "q-c9e0f1a2-v1"

{
  "id": "c9e0f1a2-…",
  "clientId": "a1b2c3d4-…",
  "status": "open",
  "aiStatus": "pending",
  "version": 1,
  "createdAt": "2026-10-16T22:58:12Z",
  "secretsMasked": 0,
  "author": { "handle": "awa-dev", "displayName": "Awa", "isDemo": false }
}
```

La piste IA et les aidants sollicités arrivent ensuite par SSE (`question.ai_hint`, `question.matched`).

## Règles pour faire évoluer le contrat

1. On modifie d'abord le schéma zod dans `packages/contracts`, dans la même PR que l'implémentation API **et** l'adaptation du front (ou avec le front marqué comme tâche suivante).
2. Ajouter un champ optionnel ou un endpoint est compatible : la PR suit le circuit normal.
3. Renommer, supprimer ou rendre obligatoire un champ est incompatible : on prévient l'équipe au point quotidien, et un back-end **et** le front-end doivent approuver.
4. Toute modification de `/sync`, de l'idempotence ou de `/events` suit la règle 3, même si elle paraît compatible.
