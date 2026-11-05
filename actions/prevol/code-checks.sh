#!/usr/bin/env bash
# Contrôle du code dans la CI gratuite de GitHub : installe les dépendances avec le bon
# gestionnaire, puis lance les scripts lint, typecheck, test et build du projet s'ils existent.
# Résultat dans le résumé du job ; sortie « result » = passed | failed | skipped.
set -uo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
comment="${RUNNER_TEMP:-/tmp}/prevol-comment.md"

if [[ ! -f package.json ]]; then
  echo "::notice title=Pré-vol::Pas de package.json dans $(pwd) : contrôle du code ignoré."
  echo "result=skipped" >>"$out"
  exit 0
fi

if [[ -f pnpm-lock.yaml ]]; then
  pm=pnpm; install=(pnpm install --frozen-lockfile)
  command -v pnpm >/dev/null || corepack enable >/dev/null 2>&1 || npm i -g pnpm >/dev/null
elif [[ -f yarn.lock ]]; then
  pm=yarn; install=(yarn install --frozen-lockfile)
  command -v yarn >/dev/null || corepack enable >/dev/null 2>&1 || npm i -g yarn >/dev/null
elif [[ -f bun.lockb || -f bun.lock ]]; then
  pm=bun; install=(bun install --frozen-lockfile)
elif [[ -f package-lock.json ]]; then
  pm=npm; install=(npm ci)
else
  pm=npm; install=(npm install --no-audit --no-fund)
fi

has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null; }

declare -a rows
failed=0
run_step() { # libellé, commande…
  local label=$1; shift
  echo "::group::$label"
  local start=$SECONDS
  if "$@"; then
    rows+=("| ✅ | $label | $((SECONDS - start)) s |")
  else
    rows+=("| ❌ | $label | $((SECONDS - start)) s |")
    echo "::error title=Pré-vol — $label::La commande « $* » a échoué."
    failed=1
  fi
  echo "::endgroup::"
}

run_step "Installation ($pm)" "${install[@]}"
if [[ $failed -eq 0 ]]; then
  ran=0
  for s in lint typecheck test build; do
    if has_script "$s"; then
      ran=1
      if [[ $s == test ]]; then
        CI=true run_step "$s" "$pm" run "$s"
      else
        run_step "$s" "$pm" run "$s"
      fi
    else
      rows+=("| ➖ | $s | script absent |")
    fi
  done
  [[ $ran -eq 0 ]] && echo "::warning title=Pré-vol::Aucun script lint, typecheck, test ni build dans package.json : ajoute-en pour que la CI contrôle vraiment le code."
fi

# Couverture : lue si les tests produisent coverage/coverage-summary.json (Istanbul, Vitest, Jest :
# reporter « json-summary ») ou coverage/coverage-final.json n'existe pas sans résumé.
coverage=""
for f in coverage/coverage-summary.json */coverage/coverage-summary.json; do
  [[ -f "$f" ]] && coverage=$(jq -r '.total.lines.pct // empty' "$f") && break
done
min_cov="${PREVOL_COVERAGE_MIN:-0}"
if [[ -n "$coverage" ]]; then
  echo "coverage=$coverage" >>"$out"
  if awk -v c="$coverage" -v m="$min_cov" 'BEGIN { exit !(c < m) }'; then
    echo "::error title=Pré-vol — couverture::Couverture des lignes $coverage %, sous le minimum $min_cov %."
    failed=1
  fi
fi

{
  echo "## Contrôle du code"
  echo
  echo "| | Étape | Durée |"
  echo "|---|---|---|"
  printf '%s\n' "${rows[@]}"
  echo
  if [[ -n "$coverage" ]]; then
    echo "Couverture des lignes par les tests : **$coverage %**"
  else
    echo "Couverture : non mesurée (ajoute le reporter « json-summary » à tes tests pour l'afficher)."
  fi
  echo
} | tee -a "$summary" >>"$comment"

if [[ $failed -eq 1 ]]; then
  echo "result=failed" >>"$out"
  exit 1
fi
echo "result=passed" >>"$out"
