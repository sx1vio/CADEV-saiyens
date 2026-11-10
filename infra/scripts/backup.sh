#!/usr/bin/env bash
# Sauvegarde quotidienne de la base (sur devhub-data) depuis le serveur devhub-app : dump chiffré gardé
# 7 jours ici et copié sur devhub-data (30 jours), pour qu'aucune panne d'un seul serveur ne fasse tout perdre.
# Cron installé par infra/scripts/serveurs/role-app.sh (02:30 UTC, compte deploy). Voir infra/README.md.
set -euo pipefail
umask 077   # le dump en clair ne doit être lisible par personne d'autre, même quelques secondes
cd /srv/devhub
source /srv/devhub/.env
# Destination de la copie (alias SSH de ~deploy/.ssh/config, clé en écriture seule) ; vide = pas de copie.
REPLICA="${BACKUP_REPLICA-devhub-data}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="/srv/devhub/backups/devhub-$STAMP.dump"
mkdir -p /srv/devhub/backups

pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$FILE"
# Chiffrement avant envoi (clé dans /srv/devhub/.backup-key, chmod 600)
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$FILE" -out "$FILE.enc" -pass file:/srv/devhub/.backup-key
rm -f "$FILE"
chmod 600 "$FILE.enc"

# Copie hors du serveur : rsync vers devhub-data (le compte distant ne peut qu'écrire, ni lire ni effacer).
REPLICATED=false
if [[ -n "$REPLICA" ]]; then
  if rsync -q --timeout=60 "$FILE.enc" "$REPLICA:"; then
    REPLICATED=true
  else
    echo "ATTENTION : copie vers $REPLICA échouée ; la sauvegarde reste seulement sur ce serveur." >&2
  fi
fi

# Rétention locale : 7 jours
find /srv/devhub/backups -name 'devhub-*.dump.enc' -mtime +7 -delete

# Statut lu par le job status.check pour l'écran /systalink (aucune valeur codée en dur)
printf '{"lastBackupAt":"%s","file":"%s","replicated":%s}\n' "$(date -u +%FT%TZ)" "$(basename "$FILE.enc")" \
  "$REPLICATED" > /srv/devhub/backups/status.json
chmod 644 /srv/devhub/backups/status.json   # lu par le worker (conteneur, autre utilisateur)
echo "Sauvegarde OK : $FILE.enc (copie sur $REPLICA : $REPLICATED)"
