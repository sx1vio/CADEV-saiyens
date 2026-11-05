#!/usr/bin/env bash
# Sécurité du code dans la CI gratuite de GitHub, sans rien envoyer à DevHub :
#  - gitleaks (MIT) : secrets dans TOUT l'historique git (il faut actions/checkout avec fetch-depth: 0) ;
#  - osv-scanner (Apache-2.0) : failles connues des dépendances, tous écosystèmes (npm, PyPI, Go, Maven…).
# Les binaires sont téléchargés depuis leurs publications officielles et vérifiés par leur somme SHA-256.
# Sorties : secrets=<n>, vulnerable=<n>, result=passed|failed.
set -uo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
comment="${RUNNER_TEMP:-/tmp}/prevol-comment.md"
bin="${RUNNER_TEMP:-/tmp}/prevol-bin"
mkdir -p "$bin"

GITLEAKS_VERSION=8.30.1
OSV_VERSION=2.7.0

fetch_verified() { # url, fichier de sommes (url), nom dans le fichier de sommes, destination
  local url=$1 sums=$2 name=$3 dest=$4
  curl -fsSL --retry 3 -o "$dest" "$url" || return 1
  local expected
  expected=$(curl -fsSL --retry 3 "$sums" | awk -v n="$name" '$2 == n || $2 == "*"n {print $1}')
  [[ -n "$expected" ]] && echo "$expected  $dest" | sha256sum -c --quiet - >/dev/null
}

failed=0

# ── gitleaks : secrets dans l'historique ──
secrets=0
gl_url="https://github.com/gitleaks/gitleaks/releases/download/v$GITLEAKS_VERSION"
if fetch_verified "$gl_url/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
  "$gl_url/gitleaks_${GITLEAKS_VERSION}_checksums.txt" \
  "gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" "$bin/gitleaks.tgz"; then
  tar -xzf "$bin/gitleaks.tgz" -C "$bin" gitleaks
  depth=$(git rev-list --count HEAD 2>/dev/null || echo 1)
  [[ "$depth" -le 1 ]] && echo "::warning title=Pré-vol — gitleaks::Historique tronqué : ajoute « fetch-depth: 0 » à actions/checkout pour analyser tous les commits."
  "$bin/gitleaks" git --redact --no-banner --exit-code 0 \
    --report-format json --report-path "$bin/gitleaks.json" . >/dev/null 2>&1
  secrets=$(jq 'length' "$bin/gitleaks.json" 2>/dev/null || echo 0)
  jq -r '.[] | "::error file=\(.File),line=\(.StartLine),title=Pré-vol — secret (\(.RuleID))::Secret détecté dans le commit \(.Commit[0:7]). Révoque-le chez le fournisseur, puis retire-le de l’historique."' \
    "$bin/gitleaks.json" 2>/dev/null | head -50
  [[ "$secrets" -gt 0 ]] && failed=1
else
  echo "::warning title=Pré-vol::Téléchargement ou vérification de gitleaks impossible : analyse des secrets ignorée."
  secrets=-1
fi

# ── osv-scanner : failles des dépendances ──
vulnerable=0
osv_url="https://github.com/google/osv-scanner/releases/download/v$OSV_VERSION"
if fetch_verified "$osv_url/osv-scanner_linux_amd64" "$osv_url/osv-scanner_SHA256SUMS" \
  "osv-scanner_linux_amd64" "$bin/osv-scanner"; then
  chmod +x "$bin/osv-scanner"
  "$bin/osv-scanner" scan source -r --format json --output-file "$bin/osv.json" . >/dev/null 2>&1
  vulnerable=$(jq '[.results[]?.packages[]?] | length' "$bin/osv.json" 2>/dev/null || echo 0)
  [[ "$vulnerable" -gt 0 ]] && failed=1
else
  echo "::warning title=Pré-vol::Téléchargement ou vérification d'osv-scanner impossible : analyse des dépendances ignorée."
  vulnerable=-1
fi

{
  echo "## Sécurité du code"
  echo
  if [[ "$secrets" -lt 0 ]]; then echo "- Secrets dans l'historique : non analysé"
  elif [[ "$secrets" -eq 0 ]]; then echo "- ✅ Aucun secret dans l'historique git (gitleaks $GITLEAKS_VERSION)"
  else
    echo "- ❌ **$secrets secret(s)** dans l'historique git (valeurs masquées) :"
    echo
    echo "| Fichier | Ligne | Type | Commit |"
    echo "|---|---|---|---|"
    jq -r '.[:15][] | "| `\(.File)` | \(.StartLine) | \(.RuleID) | \(.Commit[0:7]) |"' "$bin/gitleaks.json"
  fi
  if [[ "$vulnerable" -lt 0 ]]; then echo "- Dépendances : non analysé"
  elif [[ "$vulnerable" -eq 0 ]]; then echo "- ✅ Aucune dépendance avec une faille connue (osv-scanner $OSV_VERSION)"
  else
    echo "- ❌ **$vulnerable dépendance(s)** avec des failles connues :"
    echo
    echo "| Paquet | Version | Failles | Écosystème |"
    echo "|---|---|---|---|"
    jq -r '[.results[]?.packages[]?] | .[:15][] | "| \(.package.name) | \(.package.version) | \([.vulnerabilities[]?.id] | .[:3] | join(", ")) | \(.package.ecosystem) |"' "$bin/osv.json"
  fi
  echo
} | tee -a "$summary" >>"$comment"

echo "secrets=$secrets" >>"$out"
echo "vulnerable=$vulnerable" >>"$out"
if [[ $failed -eq 1 ]]; then
  echo "result=failed" >>"$out"
else
  echo "result=passed" >>"$out"
fi
exit 0
