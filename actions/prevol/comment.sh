#!/usr/bin/env bash
# Publie (ou met à jour) un seul commentaire de synthèse sur la pull request.
# Le workflow doit accorder « permissions: pull-requests: write ».
set -uo pipefail

comment="${RUNNER_TEMP:-/tmp}/prevol-comment.md"
marker='<!-- devhub-prevol -->'
pr="${PREVOL_PR_NUMBER:-}"

if [[ -z "$pr" ]]; then
  echo "Pas de pull request : commentaire ignoré."
  exit 0
fi
if [[ ! -s "$comment" ]]; then
  echo "Rien à commenter."
  exit 0
fi

body="${RUNNER_TEMP:-/tmp}/prevol-comment-full.md"
{
  echo "$marker"
  echo "# Pré-vol DevHub"
  echo
  cat "$comment"
  echo "---"
  echo "Généré par [DevHub Pré-vol](https://github.com/sx1vio/CADEV-saiyens/tree/main/actions/prevol) · run [${GITHUB_RUN_ID:-}](${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-})"
} >"$body"

existing=$(gh api "repos/$GITHUB_REPOSITORY/issues/$pr/comments" --paginate \
  --jq ".[] | select(.body | startswith(\"$marker\")) | .id" 2>/dev/null | head -1)
if [[ -n "$existing" ]]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$existing" -F "body=@$body" >/dev/null &&
    echo "Commentaire mis à jour."
else
  gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$pr/comments" -F "body=@$body" >/dev/null &&
    echo "Commentaire publié."
fi || echo "::warning title=Pré-vol::Commentaire impossible : ajoute « permissions: pull-requests: write » au workflow."
exit 0
