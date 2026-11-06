#!/usr/bin/env bash
# Lighthouse mobile réel, exécuté sur la machine GitHub (Chrome y est installé) : aucun coût pour
# DevHub ni pour Systalink. Sorties : performance, accessibility, best-practices, seo (sur 100).
set -uo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
comment="${RUNNER_TEMP:-/tmp}/prevol-comment.md"
report="${RUNNER_TEMP:-/tmp}/lighthouse.json"
url="${PREVOL_URL:-}"
LIGHTHOUSE_VERSION=13.5.0

if [[ -z "$url" ]]; then
  echo "::notice title=Pré-vol::Pas d'adresse (input url) : audit Lighthouse ignoré."
  exit 0
fi

chrome=$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || true)
if ! CHROME_PATH="$chrome" npx -y "lighthouse@$LIGHTHOUSE_VERSION" "$url" \
  --quiet --output=json --output-path="$report" --locale=fr \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" >/dev/null 2>&1; then
  echo "::warning title=Pré-vol::Lighthouse n'a pas pu auditer $url."
  exit 0
fi

score() { jq -r ".categories[\"$1\"].score // empty | . * 100 | round" "$report"; }
ms() { jq -r ".audits[\"$1\"].numericValue // empty | round" "$report"; }
perf=$(score performance)
a11y=$(score accessibility)
bp=$(score best-practices)
seo=$(score seo)
lcp=$(ms largest-contentful-paint)
tbt=$(ms total-blocking-time)
cls=$(jq -r '.audits["cumulative-layout-shift"].numericValue // empty' "$report")
icon() { [[ -z "$1" ]] && echo "➖" && return; (($1 >= 90)) && echo "🟢" || { (($1 >= 50)) && echo "🟠" || echo "🔴"; }; }

{
  echo "## Lighthouse mobile"
  echo
  echo "| Performance | Accessibilité | Bonnes pratiques | Référencement |"
  echo "|---|---|---|---|"
  echo "| $(icon "$perf") $perf | $(icon "$a11y") $a11y | $(icon "$bp") $bp | $(icon "$seo") $seo |"
  echo
  echo "Contenu principal (LCP) ${lcp:-–} ms · blocage (TBT) ${tbt:-–} ms · stabilité (CLS) ${cls:-–}"
  echo
  opp=$(jq -r '[.audits[] | select(.details.type == "opportunity" and (.details.overallSavingsMs // 0) >= 100)] | sort_by(-.details.overallSavingsMs) | .[:5][] | "- \(.title) (gain estimé \(.details.overallSavingsMs | round) ms)"' "$report")
  if [[ -n "$opp" ]]; then
    echo "**Pistes de gain :**"
    echo
    echo "$opp"
    echo
  fi
} | tee -a "$summary" >>"$comment"

{
  echo "performance=$perf"
  echo "accessibility=$a11y"
  echo "best-practices=$bp"
  echo "seo=$seo"
} >>"$out"

min="${PREVOL_LH_MIN:-0}"
if [[ -n "$perf" && "$perf" -lt "$min" ]]; then
  echo "::error title=Pré-vol — Lighthouse::Performance $perf, sous le minimum $min."
  exit 1
fi
exit 0
