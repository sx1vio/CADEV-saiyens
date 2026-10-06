#!/usr/bin/env bash
# Sauvegarde quotidienne de la base vers la sauvegarde cloud Systalink.
# Cron (02:30 UTC) : 30 2 * * * /srv/devhub/infra/scripts/backup.sh >> /var/log/devhub-backup.log 2>&1
# Si Systalink fournit une sauvegarde native de la base, l'utiliser et ne garder ici que l'écriture du statut.
set -euo pipefail
source /srv/devhub/.env

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="/srv/devhub/backups/devhub-$STAMP.dump"
mkdir -p /srv/devhub/backups

pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$FILE"
# Chiffrement avant envoi (clé dans /srv/devhub/.backup-key, chmod 600)
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$FILE" -out "$FILE.enc" -pass file:/srv/devhub/.backup-key
rm -f "$FILE"

# TODO (rôle 4) : envoyer "$FILE.enc" vers la sauvegarde cloud Systalink (outil ou API fournis par Systalink).

# Rétention locale : 7 jours
find /srv/devhub/backups -name 'devhub-*.dump.enc' -mtime +7 -delete

# Statut lu par le job status.check pour l'écran /systalink (aucune valeur codée en dur)
printf '{"lastBackupAt":"%s","file":"%s"}\n' "$(date -u +%FT%TZ)" "$(basename "$FILE.enc")" \
  > /srv/devhub/backups/status.json
echo "Sauvegarde OK : $FILE.enc"
