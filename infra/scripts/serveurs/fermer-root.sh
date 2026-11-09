#!/usr/bin/env bash
# Ferme la connexion SSH de root et limite SSH aux comptes du rôle.
# À lancer seulement après avoir vérifié qu'on entre avec « devops » (ssh devops@<ip> sudo true).
# La clé de gestion Systalink reste dans /root/.ssh/authorized_keys : rien n'est supprimé,
# il suffit d'effacer /etc/ssh/sshd_config.d/11-root.conf (console Systalink) pour revenir en arrière.
# Usage : fermer-root.sh "<comptes autorisés séparés par des espaces>"
set -euo pipefail

USERS="${1:?Usage : fermer-root.sh \"devops deploy\"}"

cat > /etc/ssh/sshd_config.d/11-root.conf <<EOF
PermitRootLogin no
AllowUsers $USERS
EOF
install -d -m 755 /run/sshd   # Ubuntu 24.04 : SSH démarré à la demande, dossier absent
sshd -t
systemctl reload ssh
echo "SSH : root fermé, comptes autorisés : $USERS"
