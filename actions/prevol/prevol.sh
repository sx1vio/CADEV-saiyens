#!/usr/bin/env bash
# Pré-vol DevHub depuis la CI : lance l'analyse, publie le rapport Markdown dans le résumé du
# job et applique le seuil choisi (fail-on, min-score).
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
comment="${RUNNER_TEMP:-/tmp}/prevol-comment.md"
api="${PREVOL_API%/}"
url="${PREVOL_URL:-}"
repo="${PREVOL_REPO:-}"

if [[ "${PREVOL_REPO_PRIVATE:-false}" == "true" && "$repo" == "${GITHUB_REPOSITORY:-}" ]]; then
  echo "::notice title=Pré-vol::Dépôt privé : seule l'application en ligne est analysée."
  repo=""
fi
if [[ -z "${PREVOL_TOKEN:-}" ]]; then
  echo "::notice title=Pré-vol::Pas de jeton DevHub (input token) : pré-vol ignoré. Crée-en un sur $api/prevol."
  exit 0
fi
if [[ -z "$url" && -z "$repo" ]]; then
  echo "::notice title=Pré-vol::Ni url ni repo : rien à analyser."
  exit 0
fi

load=false
[[ "${PREVOL_LOAD_TEST:-false}" == "true" && -n "$url" ]] && load=true
body=$(jq -n --arg url "$url" --arg repo "$repo" --argjson load "$load" \
  '{url: (if $url == "" then null else $url end), repo: (if $repo == "" then null else $repo end), loadTest: $load}')
resp=$(mktemp)
code=$(curl -sS -o "$resp" -w '%{http_code}' --max-time 240 -X POST "$api/api/v1/preflight" \
  -H "Authorization: Bearer $PREVOL_TOKEN" -H 'Content-Type: application/json' \
  -H 'User-Agent: devhub-prevol-action/1' -d "$body") || code=000

if [[ "$code" != 2* ]]; then
  title=$(jq -r '.title // .code // empty' "$resp" 2>/dev/null || true)
  echo "::error title=Pré-vol::Échec de l'appel ($code) : ${title:-réponse illisible}"
  exit 1
fi

id=$(jq -r .id "$resp")
score=$(jq -r .score "$resp")
verdict=$(jq -r .verdict "$resp")
page=$(sed -E 's#^(https?://[^/]+).*#\1#' <<<"$api")/prevol/$id
{
  echo "score=$score"
  echo "verdict=$verdict"
  echo "report-url=$page"
} >>"$out"

curl -sS --max-time 30 "$api/api/v1/preflight/$id/report.md" >>"$summary" || true
echo >>"$summary"

{
  echo "## Application en ligne : $score/100"
  echo
  case "$verdict" in
    ready) echo "✅ Prêt pour la production" ;;
    review) echo "🟠 À améliorer avant le lancement" ;;
    *) echo "🔴 À corriger avant le lancement" ;;
  esac
  echo
  jq -r '.checks[] | select(.status == "fail" or .status == "warn") | "- \(if .status == "fail" then "🔴" else "🟠" end) **\(.title)** (`\(.id)`)"' "$resp" | head -12
  lt=$(jq -r 'if .loadTest then "Test de charge : \(if .loadTest.breakingConcurrency == null then "tient \(.loadTest.maxStableConcurrency) visiteurs simultanés" else "cède à \(.loadTest.breakingConcurrency) visiteurs simultanés" end)" else empty end' "$resp")
  [[ -n "$lt" ]] && echo && echo "$lt"
  echo
  echo "[Rapport complet]($page) · à donner à ton agent IA : \`$api/api/v1/preflight/$id/report.md\`"
  echo
} >>"$comment"

echo "Pré-vol : $score/100, verdict $verdict — $page"
jq -r '.checks[] | select(.status == "fail") | "::error title=Pré-vol — \(.title)::\(.detail)"' "$resp"
jq -r '.checks[] | select(.status == "warn") | "::warning title=Pré-vol — \(.title)::\(.detail)"' "$resp"

fail=0
case "${PREVOL_FAIL_ON:-fix}" in
  never) ;;
  review) [[ "$verdict" != "ready" ]] && fail=1 ;;
  *) [[ "$verdict" == "fix" ]] && fail=1 ;;
esac
if (( score < ${PREVOL_MIN_SCORE:-0} )); then
  echo "::error title=Pré-vol::Score $score inférieur au minimum ${PREVOL_MIN_SCORE}."
  fail=1
fi
exit $fail
