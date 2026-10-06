# Infrastructure

Propriétaire : **Emmanuel OKORIE** (rôle 4, DevOps et sécurité). Documentation : [docs/architecture/11-infrastructure-deploiement.md](../docs/architecture/11-infrastructure-deploiement.md).

| Fichier                  | Rôle                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `docker-compose.dev.yml` | PostgreSQL et Mailpit pour le développement local                              |
| `docker-compose.yml`     | Production sur le VPS Systalink (Caddy, API, worker)                           |
| `Caddyfile`              | TLS, en-têtes de sécurité, routage, front statique                             |
| `Dockerfile.api`         | Image de l'API et du worker (à ajuster à l'initialisation d'`apps/api`)        |
| `Dockerfile.web`         | Image Caddy avec le build du front (à ajuster à l'initialisation d'`apps/web`) |
| `scripts/deploy.sh`      | Migrations, redémarrage, smoke test, retour arrière automatique                |
| `scripts/backup.sh`      | Sauvegarde chiffrée quotidienne + fichier de statut pour `/systalink`          |
| `scripts/restore.sh`     | Restauration dans une base cible + comptage des lignes                         |

## Préparation du VPS (une fois)

1. Utilisateur `deploy` sans mot de passe, clé SSH dédiée à la CI (`VPS_SSH_KEY`).
2. Docker et le plugin Compose ; pare-feu : 22 (clés uniquement), 80, 443.
3. `git clone` du dépôt dans `/srv/devhub`, fichier `/srv/devhub/.env` (`chmod 600`), clé `/srv/devhub/.backup-key`.
4. `docker login ghcr.io` avec un jeton en lecture des paquets.
5. Cron de `backup.sh`.
6. Secrets GitHub (environnement `production`) : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` ; variable de dépôt `DEPLOY_ENABLED=true`.
