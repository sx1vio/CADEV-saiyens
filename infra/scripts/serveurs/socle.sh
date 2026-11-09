#!/usr/bin/env bash
# Socle commun des VPS Systalink (Ubuntu 24.04) : nom d'hôte, mises à jour, swap, administrateur,
# SSH par clés seulement, fail2ban, pare-feu fermé par défaut.
# À lancer en root, une fois par serveur ; rejouable sans danger.
# Usage : socle.sh <nom-d-hote> <fichier-de-clés-publiques-de-l-administrateur>
# Voir infra/README.md, section « Serveurs ».
set -euo pipefail

HOST="${1:?Usage : socle.sh <nom-d-hote> <clés-admin.pub>}"
ADMIN_KEYS="${2:?Usage : socle.sh <nom-d-hote> <clés-admin.pub>}"
ADMIN=devops
export DEBIAN_FRONTEND=noninteractive

log() { echo "[socle $(date -u +%H:%M:%S)] $*"; }

log "Nom d'hôte : $HOST (le panneau Systalink ne permet pas de renommer)"
hostnamectl set-hostname "$HOST"
# cloud-init remettrait « vps-systalink » au redémarrage : on garde notre nom et notre /etc/hosts.
cat > /etc/cloud/cloud.cfg.d/99-devhub.cfg <<'EOF'
preserve_hostname: true
manage_etc_hosts: false
EOF
cat > /etc/hosts <<EOF
127.0.0.1 localhost
127.0.1.1 $HOST
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
EOF

log "Mises à jour et paquets de base"
apt-get update -q
apt-get -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade
apt-get -yq install ufw fail2ban python3-systemd unattended-upgrades rsync curl ca-certificates

# Correctifs de sécurité appliqués chaque nuit, sans redémarrage automatique.
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

log "Swap de 2 Go (le plan n'a que 1,8 Go de mémoire)"
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  [[ -f /swapfile ]] || fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
cat > /etc/sysctl.d/90-devhub.conf <<'EOF'
vm.swappiness = 10
# Réseau : pas de redirections ICMP ni de routage source
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.tcp_syncookies = 1
EOF
sysctl --quiet --system

log "Administrateur « $ADMIN » : clés SSH seulement, aucun mot de passe"
id "$ADMIN" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$ADMIN" >/dev/null
usermod -aG sudo "$ADMIN"
echo "$ADMIN ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-devops
chmod 440 /etc/sudoers.d/90-devops
visudo -cqf /etc/sudoers.d/90-devops
install -d -m 700 -o "$ADMIN" -g "$ADMIN" "/home/$ADMIN/.ssh"
install -m 600 -o "$ADMIN" -g "$ADMIN" "$ADMIN_KEYS" "/home/$ADMIN/.ssh/authorized_keys"

log "SSH : clés seulement (root sera fermé par fermer-root.sh après vérification)"
cat > /etc/ssh/sshd_config.d/10-devhub.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
X11Forwarding no
AllowAgentForwarding no
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
install -d -m 755 /run/sshd   # Ubuntu 24.04 : SSH démarré à la demande, dossier absent
sshd -t
systemctl reload ssh

log "fail2ban : 5 échecs SSH en 10 min = 1 h de bannissement"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
backend = systemd
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban >/dev/null
systemctl restart fail2ban

log "Pare-feu : tout fermé en entrée sauf SSH (les rôles ouvrent le reste)"
ufw --force default deny incoming >/dev/null
ufw --force default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw --force enable >/dev/null

log "Socle prêt sur $HOST."
