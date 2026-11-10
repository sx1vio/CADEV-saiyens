#!/usr/bin/env bash
# Restaure une sauvegarde dans une base CIBLE (jamais la production par défaut).
# Usage : restore.sh <fichier.dump.enc> <url-de-la-base-cible>
# Test obligatoire avant le 20 puis le 22 octobre (docs/architecture/11-infrastructure-deploiement.md).
set -euo pipefail
ENC="${1:?fichier .dump.enc}"
TARGET="${2:?URL de la base cible}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -in "$ENC" -out "$TMP" -pass file:/srv/devhub/.backup-key
pg_restore --clean --if-exists --no-owner --dbname="$TARGET" "$TMP"

echo "Vérification du nombre de lignes :"
for t in users questions answers rooms tasks xp_events; do
  printf '  %-12s %s\n' "$t" "$(psql "$TARGET" -tAc "SELECT count(*) FROM $t")"
done
