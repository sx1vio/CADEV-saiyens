# Espace d'administration DevHub (`@devhub/admin`)

Application à part, servie sur **sa propre adresse** (sous-domaine en production, port 5299 en local).
Le site public n'en contient aucune trace : pas de page `/admin`, pas d'entrée de menu, et l'API répond
**404** à toutes les routes `/api/v1/admin/*` sans session d'administration.

## Ce qu'on y fait

- **Vue d'ensemble** : chiffres réels de la plateforme (membres, questions, salles, signalements, offres).
- **Offres d'emploi** : créer, modifier, publier, archiver ou supprimer une offre. Chaque offre exige le
  lien vers son **annonce officielle** ; seules les offres publiées et non expirées sont visibles sur `/emplois`.
- **Modération** : file des signalements (masquer, rétablir, rejeter) et journal de toutes les décisions.

## Sécurité

| Protection      | Détail                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| Double facteur  | E-mail + mot de passe + code TOTP à 6 chiffres (RFC 6238), un code ne sert qu'une fois       |
| Comptes         | Créés **uniquement en ligne de commande** sur le serveur, jamais depuis le web               |
| Session séparée | Cookie `__Host-dh-adm` (HttpOnly, Secure, SameSite=Strict), 30 min d'inactivité, 8 h au plus |
| Invisible       | Toute requête sans session valide reçoit un 404, comme une route qui n'existe pas            |
| Origine         | Écritures acceptées seulement depuis `ADMIN_URL` avec `X-DevHub-Client: admin` ; pas de CORS |
| Réseau (option) | `ADMIN_ALLOWED_IPS` : plages CIDR autorisées (vide = toutes)                                 |
| Traçabilité     | Connexions et actions écrites dans le journal (`admin_actions`)                              |
| Révocation      | Retirer le droit ferme aussitôt toutes les sessions                                          |

## Créer un compte administrateur

```bash
# En local (depuis la racine du dépôt)
pnpm --filter @devhub/api admin create --email admin@exemple.com --name "Prénom Nom"

# En production
docker compose exec api node dist/modules/backoffice/cli.js create --email admin@exemple.com --name "Prénom Nom"
```

La commande affiche le mot de passe **une seule fois** et un lien `otpauth://` à ajouter dans une
application d'authentification (Google Authenticator, Aegis, 1Password…). Autres commandes :
`reset-2fa`, `revoke`, `list`.

## Lancer en local

```bash
# .env : ADMIN_URL=http://localhost:5299
pnpm --filter @devhub/admin dev   # http://localhost:5299 (l'API doit tourner sur le port 3000)
```

## Production

- Caddy sert l'application sur `ADMIN_ADDRESS` (ex. `admin.devhub.africa`) et ne relaie vers l'API que
  `/api/v1/admin/*` ; en-têtes `X-Robots-Tag: noindex`, CSP stricte, `Cache-Control: no-store`.
- Côté API : `ADMIN_URL=https://admin.devhub.africa` (doit être une origine distincte de `APP_URL`).
- Sans `ADMIN_ADDRESS`, le bloc Caddy écoute sur `127.0.0.1:8081` (non publié) ; sans `ADMIN_URL`,
  l'administration est entièrement désactivée.
