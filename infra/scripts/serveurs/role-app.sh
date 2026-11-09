#!/usr/bin/env bash
# Rôle « devhub-app » : Docker (Caddy, API, worker), compte « deploy » piloté par la CI,
# sauvegarde quotidienne de la base copiée sur le serveur data.
# À lancer en root après socle.sh ; rejouable sans danger.
# Usage : role-app.sh <ip-privée-du-serveur-data> <clé-publique-CI.pub>
# À fournir ensuite (voir infra/README.md) : /home/deploy/.ssh/backup (clé privée de sauvegarde),
# /srv/devhub/pg-ca.crt (autorité TLS de la base) et /srv/devhub/.env.
set -euo pipefail

DATA_IP="${1:?Usage : role-app.sh <ip-privée-data> <clé-CI.pub>}"
CI_KEY="${2:?clé publique de la CI manquante}"
ROOT=/srv/devhub
export DEBIAN_FRONTEND=noninteractive

log() { echo "[app $(date -u +%H:%M:%S)] $*"; }

log "Docker (dépôt officiel) et client PostgreSQL 16 pour les sauvegardes"
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get -yq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
  postgresql-client-16 git openssl >/dev/null
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true,
  "no-new-privileges": true
}
EOF
systemctl enable docker >/dev/null
systemctl restart docker

log "Compte « deploy » (CI) : seule commande possible « deploy <sha> »"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy >/dev/null
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cat > /usr/local/bin/devhub-deploy-gate <<'EOF'
#!/usr/bin/env bash
# Commande forcée de la clé SSH de la CI (infra/README.md) : n'accepte que « deploy <sha 40> <acteur> ».
# Le jeton GHCR (GITHUB_TOKEN du job, valable le temps du job) arrive sur l'entrée standard,
# sert à tirer les images, puis disparaît avec le dossier temporaire : rien ne reste sur le disque.
set -euo pipefail
if [[ ! "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})\ ([A-Za-z0-9][A-Za-z0-9-]*(\[bot\])?)$ ]]; then
  echo "Commande refusée." >&2
  exit 1
fi
SHA="${BASH_REMATCH[1]}"
ACTOR="${BASH_REMATCH[2]}"
TOKEN="$(head -c 4096)"
DOCKER_CONFIG="$(mktemp -d)"
export DOCKER_CONFIG
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
printf '%s' "$TOKEN" | docker login ghcr.io -u "$ACTOR" --password-stdin >/dev/null
/srv/devhub/infra/scripts/deploy.sh "$SHA"
EOF
chmod 755 /usr/local/bin/devhub-deploy-gate
printf 'restrict,command="/usr/local/bin/devhub-deploy-gate" %s\n' "$(cat "$CI_KEY")" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

log "Clé de lecture du dépôt GitHub (à déclarer comme deploy key en lecture seule)"
if [[ ! -f /home/deploy/.ssh/github ]]; then
  sudo -u deploy ssh-keygen -q -t ed25519 -N "" -C "devhub-app deploy key" -f /home/deploy/.ssh/github
fi
# Empreinte publiée par GitHub : SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
ssh-keyscan -t ed25519 github.com 2>/dev/null > /tmp/github.kh
grep -q 'SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU' <(ssh-keygen -lf /tmp/github.kh) \
  || { echo "Empreinte GitHub inattendue" >&2; exit 1; }
ssh-keyscan -t ed25519 "$DATA_IP" 2>/dev/null >> /tmp/github.kh
install -m 644 -o deploy -g deploy /tmp/github.kh /home/deploy/.ssh/known_hosts
rm -f /tmp/github.kh
cat > /home/deploy/.ssh/config <<EOF
Host github.com
  IdentityFile ~/.ssh/github
  IdentitiesOnly yes
Host devhub-data
  HostName $DATA_IP
  User devhub-backup
  IdentityFile ~/.ssh/backup
  IdentitiesOnly yes
EOF
chown deploy:deploy /home/deploy/.ssh/config
chmod 600 /home/deploy/.ssh/config

log "Dossier $ROOT et clé de chiffrement des sauvegardes"
install -d -m 750 -o deploy -g deploy "$ROOT"
install -d -m 755 -o deploy -g deploy "$ROOT/backups"
if [[ ! -f $ROOT/.backup-key ]]; then
  (umask 077; openssl rand -base64 48 > "$ROOT/.backup-key")
  chown deploy:deploy "$ROOT/.backup-key"
fi

log "Sauvegarde chaque nuit à 02:30 UTC (base -> chiffrement -> copie sur devhub-data)"
cat > /etc/cron.d/devhub-backup <<'EOF'
30 2 * * * deploy /srv/devhub/infra/scripts/backup.sh >> /srv/devhub/backups/backup.log 2>&1
EOF

log "Pare-feu : HTTP et HTTPS (HTTP/3 compris)"
ufw allow 80/tcp comment 'caddy http' >/dev/null
ufw allow 443/tcp comment 'caddy https' >/dev/null
ufw allow 443/udp comment 'caddy http3' >/dev/null
ufw reload >/dev/null

log "Rôle app prêt. Clé du dépôt à déclarer sur GitHub :"
cat /home/deploy/.ssh/github.pub
