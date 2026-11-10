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

smoke() {
  local base="https://${SITE_ADDRESS:-localhost}"
  curl -fsS "$base/" >/dev/null && curl -fsS "$base/api/v1/status" >/dev/null
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
