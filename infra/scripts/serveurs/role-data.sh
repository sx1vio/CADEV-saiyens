#!/usr/bin/env bash
# Rôle « devhub-data » : PostgreSQL 16 joignable seulement depuis le serveur d'application,
# par le réseau privé et en TLS vérifié ; dépôt des sauvegardes chiffrées envoyées par l'application.
# À lancer en root après socle.sh ; rejouable sans danger (le mot de passe et les certificats existants sont gardés).
# Usage : role-data.sh <ip-privée-de-ce-serveur> <ip-privée-du-serveur-app> <clé-publique-de-sauvegarde.pub>
# Résultat : /root/devhub-database-url (chmod 600), à recopier dans /srv/devhub/.env du serveur app.
set -euo pipefail

DATA_IP="${1:?Usage : role-data.sh <ip-privée-data> <ip-privée-app> <clé-sauvegarde.pub>}"
APP_IP="${2:?ip privée du serveur app manquante}"
BACKUP_KEY="${3:?clé publique de sauvegarde manquante}"
PG=16
CONF=/etc/postgresql/$PG/main
TLS=$CONF/tls
export DEBIAN_FRONTEND=noninteractive

log() { echo "[data $(date -u +%H:%M:%S)] $*"; }

log "PostgreSQL $PG"
apt-get -yq install "postgresql-$PG" openssl >/dev/null

log "Certificats TLS (autorité DevHub privée, 10 ans) pour $DATA_IP"
install -d -m 700 -o postgres -g postgres "$TLS"
install -d -m 700 /root/pg-ca
if [[ ! -f /root/pg-ca/ca.crt ]]; then
  openssl req -x509 -newkey rsa:3072 -nodes -days 3650 -subj "/CN=DevHub PostgreSQL CA" \
    -keyout /root/pg-ca/ca.key -out /root/pg-ca/ca.crt 2>/dev/null
fi
if [[ ! -f $TLS/server.crt ]] || ! openssl x509 -in "$TLS/server.crt" -noout -ext subjectAltName 2>/dev/null | grep -q "IP Address:$DATA_IP"; then
  openssl req -newkey rsa:3072 -nodes -subj "/CN=$DATA_IP" -keyout "$TLS/server.key" -out /root/pg-ca/server.csr 2>/dev/null
  printf 'subjectAltName=IP:%s\nextendedKeyUsage=serverAuth\n' "$DATA_IP" > /root/pg-ca/server.ext
  openssl x509 -req -in /root/pg-ca/server.csr -CA /root/pg-ca/ca.crt -CAkey /root/pg-ca/ca.key \
    -CAcreateserial -days 3650 -extfile /root/pg-ca/server.ext -out "$TLS/server.crt" 2>/dev/null
fi
chown postgres:postgres "$TLS"/server.*
chmod 600 "$TLS/server.key"

log "Configuration (2 Go de mémoire, connexions chiffrées seulement depuis $APP_IP)"
cat > "$CONF/conf.d/devhub.conf" <<EOF
# DevHub — voir infra/README.md. Le pare-feu ne laisse passer 5432 que depuis $APP_IP.
listen_addresses = '*'
ssl = on
ssl_cert_file = '$TLS/server.crt'
ssl_key_file = '$TLS/server.key'
ssl_min_protocol_version = 'TLSv1.2'
password_encryption = scram-sha-256
max_connections = 60
shared_buffers = 448MB
effective_cache_size = 1GB
maintenance_work_mem = 96MB
work_mem = 6MB
wal_compression = on
random_page_cost = 1.1
log_min_duration_statement = 500
log_connections = on
log_disconnections = on
timezone = 'UTC'
EOF
HBA="$CONF/pg_hba.conf"
sed -i '/# devhub-app$/d' "$HBA"
echo "hostssl devhub devhub $APP_IP/32 scram-sha-256 # devhub-app" >> "$HBA"

systemctl enable postgresql >/dev/null
systemctl restart postgresql

log "Rôle et base « devhub » (extensions citext et pgcrypto)"
if [[ ! -f /root/devhub-db-password ]]; then
  (umask 077; openssl rand -hex 32 > /root/devhub-db-password)
fi
PASS="$(cat /root/devhub-db-password)"
sudo -u postgres psql -qX -v ON_ERROR_STOP=1 -v pass="$PASS" <<'SQL'
SELECT 'CREATE ROLE devhub LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'devhub') \gexec
ALTER ROLE devhub WITH LOGIN PASSWORD :'pass';
SELECT 'CREATE DATABASE devhub OWNER devhub' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'devhub') \gexec
SQL
sudo -u postgres psql -qX -v ON_ERROR_STOP=1 -d devhub <<'SQL'
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
REVOKE ALL ON DATABASE devhub FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO devhub;
SQL
(umask 077; printf 'postgresql://devhub:%s@%s:5432/devhub?sslmode=verify-full&sslrootcert=/srv/devhub/pg-ca.crt\n' \
  "$PASS" "$DATA_IP" > /root/devhub-database-url)

log "Dépôt des sauvegardes : compte « devhub-backup », écriture seule par rsync, depuis $APP_IP seulement"
id devhub-backup >/dev/null 2>&1 || adduser --system --group --shell /bin/sh --home /srv/backups devhub-backup >/dev/null
install -d -m 750 -o devhub-backup -g devhub-backup /srv/backups /srv/backups/devhub
install -d -m 700 -o devhub-backup -g devhub-backup /srv/backups/.ssh
RRSYNC="$(command -v rrsync || echo /usr/share/doc/rsync/scripts/rrsync)"
printf 'restrict,from="%s",command="%s -wo -no-del /srv/backups/devhub" %s\n' "$APP_IP" "$RRSYNC" "$(cat "$BACKUP_KEY")" \
  > /srv/backups/.ssh/authorized_keys
chown devhub-backup:devhub-backup /srv/backups/.ssh/authorized_keys
chmod 600 /srv/backups/.ssh/authorized_keys
# Rétention : 30 jours de copies chiffrées.
cat > /etc/cron.d/devhub-backup-retention <<'EOF'
15 4 * * * devhub-backup find /srv/backups/devhub -name 'devhub-*.dump.enc' -mtime +30 -delete
EOF

log "Pare-feu : PostgreSQL ouvert seulement à $APP_IP sur le réseau privé"
ufw allow in from "$APP_IP" to "$DATA_IP" port 5432 proto tcp comment 'postgres depuis devhub-app' >/dev/null
ufw reload >/dev/null

log "Rôle data prêt. URL de connexion : /root/devhub-database-url ; autorité TLS : /root/pg-ca/ca.crt"
