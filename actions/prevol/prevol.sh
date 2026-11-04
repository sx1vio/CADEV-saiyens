#!/usr/bin/env bash
# Pré-vol DevHub depuis la CI : lance l'analyse, publie le rapport Markdown dans le résumé du
# job et applique le seuil choisi (fail-on, min-score).
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
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

body=$(jq -n --arg url "$url" --arg repo "$repo" \
  '{url: (if $url == "" then null else $url end), repo: (if $repo == "" then null else $repo end)}')
resp=$(mktemp)
code=$(curl -sS -o "$resp" -w '%{http_code}' --max-time 120 -X POST "$api/api/v1/preflight" \
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
