#!/usr/bin/env bash
# Déploie une version sur le VPS Systalink : migrations, redémarrage, vérification, retour arrière.
# Usage : deploy.sh <sha-du-commit>
# Voir docs/architecture/11-infrastructure-deploiement.md
set -euo pipefail

TAG="${1:?Usage : deploy.sh <sha>}"
ROOT=/srv/devhub
COMPOSE=(docker compose -f "$ROOT/infra/docker-compose.yml" --env-file "$ROOT/.env")
CURRENT_FILE="$ROOT/.current"
PREVIOUS="$(cat "$CURRENT_FILE" 2>/dev/null || true)"

log() { echo "[deploy $(date -u +%H:%M:%S)] $*"; }

cd "$ROOT"
set -a; source "$ROOT/.env"; set +a   # SITE_ADDRESS, etc.
git fetch --quiet origin && git checkout --quiet "$TAG" -- infra/   # infra au même commit que les images

export TAG
log "Récupération des images $TAG"
"${COMPOSE[@]}" pull api caddy

log "Migrations"
if ! "${COMPOSE[@]}" run --rm --no-deps api npx prisma migrate deploy; then
  log "Échec des migrations : la version en cours ($PREVIOUS) continue de servir."
  exit 1
fi

log "Redémarrage"
"${COMPOSE[@]}" up -d --no-deps api worker caddy

log "Attente de /readyz"
for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T api wget -qO- http://localhost:3000/readyz >/dev/null 2>&1; then
    READY=1; break
  fi
  sleep 2
done

# Test de l'URL publique, avec plusieurs essais : au premier démarrage (ou à un nouveau
# sous-domaine), Caddy met quelques secondes à obtenir le certificat Let's Encrypt.
smoke() {
  local base="https://${SITE_ADDRESS:-localhost}"
  for _ in $(seq 1 24); do
    if curl -fsS --max-time 10 "$base/" >/dev/null && curl -fsS --max-time 10 "$base/api/v1/status" >/dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

if [[ "${READY:-0}" == 1 ]] && smoke; then
  echo "$TAG" > "$CURRENT_FILE"
  log "Déploiement $TAG réussi."
else
  log "Échec du smoke test."
  if [[ -n "$PREVIOUS" && "$PREVIOUS" != "$TAG" ]]; then
    log "Retour arrière vers $PREVIOUS"
    exec "$0" "$PREVIOUS"
  fi
  exit 1
fi
