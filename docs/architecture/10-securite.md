# 10 · Sécurité

Responsable : **rôle 4 (DevOps et sécurité)**, qui a le dernier mot sur ce qui part en production (§10). Ce document reprend le §9 du cahier des charges, les correctifs v3.1 (M2, O9, scopes OAuth) et les détaille en mesures concrètes et vérifiables.

## Modèle de menace (résumé)

| Actif                                            | Menace principale                                  | Mesures                                                                                            |
| ------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Comptes utilisateurs                             | Vol de session, CSRF, fixation de session          | Cookie `__Host-` HttpOnly Secure SameSite=Lax, sessions serveur hachées, vérification de l'origine |
| Jetons GitHub                                    | Fuite de la base                                   | Chiffrement AES-256-GCM au repos, scopes en lecture seule                                          |
| Secrets collés par les devs dans leurs questions | Exposition publique, envoi à l'IA, stockage local  | Masquage côté client avant la file (O9) et côté serveur avant stockage et envoi à l'IA             |
| Crédibilité des scores                           | Triche (votes croisés, faux comptes, dépôts vides) | Plafonds, journal append-only, X3, détection de collusion (P2), signalement                        |
| Disponibilité de la démo                         | Spam, abus, déni de service applicatif             | Limitation du débit, quotas IA, modération rapide                                                  |
| Intégrité de l'IA                                | Injection de prompt                                | Contenu traité comme donnée, sortie JSON validée, aucune action automatique (M2)                   |
| Visiteurs                                        | XSS via le contenu utilisateur                     | Markdown assaini, CSP stricte, aucun `dangerouslySetInnerHTML` hors du composant de rendu assaini  |

## Authentification et sessions

- OAuth 2.0 avec paramètre **`state`** signé et **PKCE** ; le `state` est lié à un cookie temporaire pour empêcher la fixation de connexion.
- Création de session après le callback : jeton aléatoire de 256 bits dans le cookie ; seule son **empreinte SHA-256** est stockée (`sessions.id`).
- Cookie : `__Host-sid`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, durée 30 jours glissants. Nouvelle session à chaque connexion (pas de réutilisation).
- Déconnexion : suppression de la session en base, du cookie et des données locales (voir [04](04-hors-ligne-sync.md#9-sécurité-des-données-locales-o9)).
- Administration : `users.is_admin`, attribué uniquement par migration ou script de déploiement, jamais par l'API.

## Protection CSRF

`SameSite=Lax` bloque déjà la plupart des cas. En plus, toute requête qui modifie l'état doit :

1. avoir un en-tête `Origin` égal à `APP_URL` ;
2. porter l'en-tête `X-DevHub-Client: web`, qu'un formulaire d'un autre site ne peut pas ajouter sans déclencher un pré-vol CORS refusé.

**Exception : jetons d'API personnels du pré-vol.** Les routes marquées `@AllowApiToken()` (`POST /preflight`, `GET /preflight`, `POST /mcp`) acceptent sans contrôle d'origine une requête qui porte `Authorization: Bearer dh_pat_…`, ou qui ne porte aucun cookie de session. Un navigateur n'ajoute jamais cet en-tête de lui-même, et une requête sans cookie n'a rien à détourner : il n'y a donc pas de CSRF possible. Avec un jeton, le cookie est ignoré. Le jeton (256 bits, seule l'empreinte SHA-256 est stockée) n'ouvre que ces routes ; il ne crée pas d'autres jetons et ne lit pas le profil. Voir [`guides/prevol.md`](../guides/prevol.md).

**Exception : applications mobiles** ([ADR-0021](../adr/0021-applications-mobiles-kmp.md)). L'application porte la session dans `Authorization: Bearer <jeton>` (même session et même durée que le cookie ; si l'en-tête est présent, le cookie est ignoré). Une écriture est acceptée sans contrôle d'origine si elle porte une telle session **et** `X-DevHub-Client: mobile` : un navigateur n'ajoute pas cet en-tête de lui-même et CORS le refuse aux autres origines. La connexion GitHub passe par le navigateur système, revient par `devhub://auth/callback` avec un code chiffré (2 minutes), qui ne s'échange (`POST /auth/mobile/token`) qu'avec le secret PKCE de l'application.

## CORS

Une seule origine autorisée : `APP_URL`. Le front et l'API sont servis sur **le même domaine** par Caddy, donc CORS n'est même pas sollicité en temps normal. `credentials: true` seulement pour cette origine.

## En-têtes de sécurité (posés par Caddy)

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://avatars.githubusercontent.com <stockage-objet-systalink>;
  connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  object-src 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

`'unsafe-inline'` sur les styles est toléré pour Tailwind et les bibliothèques de rendu ; **jamais** sur les scripts. La CSP est d'abord déployée en `Content-Security-Policy-Report-Only` pendant 48 h pour repérer les violations, puis en mode bloquant avant le Jalon 5.

## Validation des entrées et rendu

- **Chaque endpoint** valide son corps, ses paramètres et sa requête avec le schéma zod de `@devhub/contracts`. Champs inconnus refusés (`.strict()`).
- Longueurs maximales sur tous les textes (titre 150, corps 10 000, extrait 20 000, message 4 000).
- Markdown rendu côté client avec `marked` + **DOMPurify** (liste blanche de balises, liens `rel="noopener nofollow ugc"`, protocoles `http`, `https` et `mailto` uniquement).
- Les extraits de code ne sont **jamais exécutés**, ni côté serveur, ni dans un iframe.
- Les liens externes saisis (dépôt, démo, reproduction S14, visio S5) sont validés : HTTPS obligatoire. Pour la reproduction, liste blanche `REPRO_HOSTS` de `@devhub/contracts`, limitée aux pages d'**éditeur** et comparée **exactement** (l'hôte, ou `www.` suivi de l'hôte) : stackblitz.com, codesandbox.io, replit.com, gist.github.com, github.com (dépôt, ticket : contenu contrôlé par GitHub), codepen.io, jsfiddle.net. Aucun sous-domaine : les domaines d'aperçu hébergé (`*.csb.app`, `*.stackblitz.io`, `*.codesandbox.io`, `*.github.io`, `*.repl.co`) publient n'importe quelle page et servent à l'hameçonnage. Ni identifiants ni port dans l'hôte. Un secret repéré dans le lien retire sa requête et son ancre (ou le lien entier s'il est dans le chemin) et compte dans « secrets masqués ».
- SQL : uniquement Prisma ou `$queryRaw` avec gabarit paramétré. `$queryRawUnsafe` est interdit hors de l'adaptateur pg-boss (règle ESLint et point de revue).

## Secrets

| Règle                                                                                        | Contrôle                                                                                                                                                                |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clés (IA, SMTP, OAuth, chiffrement) uniquement en **variables d'environnement côté serveur** | Fichier `.env` absent du dépôt (`.gitignore`), `.env.example` sans valeur                                                                                               |
| Jamais de secret dans le front                                                               | Seules les variables préfixées `VITE_PUBLIC_` arrivent dans le bundle ; revue systématique                                                                              |
| Détection dans le dépôt                                                                      | `gitleaks` en CI et en hook `pre-commit`                                                                                                                                |
| Secrets de production                                                                        | Stockés dans les **secrets GitHub Actions** (environnement `production` protégé) et dans un `.env` sur le VPS en `chmod 600`, propriété de l'utilisateur de déploiement |
| Rotation                                                                                     | Procédure documentée dans [11](11-infrastructure-deploiement.md#rotation-des-secrets) ; rotation immédiate si un secret apparaît dans un commit                         |

### Masquage des secrets dans le contenu utilisateur

`maskSecrets()` (`@devhub/core/secrets`) détecte, entre autres : clés AWS (`AKIA…`), jetons GitHub (`ghp_`, `gho_`, `github_pat_`), clés Stripe (`sk_live_`), clés Google (`AIza…`), JWT (`eyJ…`), clés privées PEM, chaînes de connexion (`postgres://user:pass@`), en-têtes `Authorization: Bearer`, variables `*_SECRET=`, `*_KEY=`, `PASSWORD=`. Le secret est remplacé par `[secret masqué]`. Il s'applique :

1. côté client, **avant** l'écriture dans IndexedDB (O9) ;
2. côté serveur, **avant** l'enregistrement et avant tout envoi à l'IA (§6.1).

## Limitation du débit et abus

- Limites détaillées dans [06 · API](06-api.md#limitation-du-débit), implémentées avec `@nestjs/throttler` (stockage en mémoire, suffisant avec une seule instance d'API ; passage à PostgreSQL si plusieurs instances).
- Identification par IP (derrière Caddy : `X-Forwarded-For` de confiance uniquement depuis le réseau Docker) et par compte.
- Garde-fous des Proof XP : voir [08](08-algorithmes.md#garde-fous-x2).
- Signalement sur chaque contenu ; masquage immédiat par l'administrateur (`hidden_at`), diffusé par SSE (moins d'une minute, M1), et journalisé (`admin_actions`, M4).

## Données personnelles

Le cadre de référence est le droit des pays des utilisateurs, notamment le Code du numérique au Bénin et la loi de 2008 sur les données personnelles au Sénégal. Les mesures prévues :

- **Données minimales** : pas de numéro de téléphone, pas d'adresse, pas de date de naissance.
- **E-mail jamais exposé** : le bouton « Contacter » (PR4) relaie le message par e-mail sans montrer l'adresse.
- **Confidentialité par champ** et mode non listé (PR14), appliqués **côté API** (le front ne reçoit jamais un champ masqué).
- **Suppression de compte** effective (A3), par anonymisation : voir [05](05-modele-donnees.md#suppression-de-compte-a3).
- Les journaux techniques ne contiennent ni contenu utilisateur ni adresse IP en clair (empreinte salée).
- Code de conduite accepté à la première connexion (M3).

## Dépendances

- `pnpm audit --prod` en CI : une vulnérabilité **haute** ou **critique** bloque la fusion, sauf exception documentée dans la PR.
- Dependabot (ou Renovate) activé pour les mises à jour de sécurité uniquement pendant le challenge, afin de limiter le bruit.
- Images Docker basées sur `node:24-alpine` et `caddy:2-alpine`, reconstruites à chaque déploiement.

## Revue de sécurité

| Quand                                                                   | Quoi                                                                                                    | Qui                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Jalon 1 (8 oct.)                                                        | Revue de base : OAuth, sessions, secrets, en-têtes                                                      | Emmanuel + un back-end                         |
| Chaque PR qui touche `identity`, `sync`, `moderation`, `ai` ou `infra/` | Checklist sécurité de la [revue de code](../equipe/revue-de-code.md)                                    | Emmanuel en relecteur obligatoire (CODEOWNERS) |
| 21 oct.                                                                 | Revue complète : CSP en mode bloquant, test d'abus des XP (X2), injections de prompt, scan des en-têtes | Emmanuel, toute l'équipe                       |
