# Pré-vol : du prompt à la prod vérifiée

Le pré-vol vérifie une application déployée et son dépôt GitHub public avant la mise en production. Il rend un rapport qu'un humain lit et que l'agent IA du développeur (Claude Code, Codex, Cursor…) applique tel quel. On peut le lancer de trois façons : depuis la page `/prevol`, depuis l'agent IA (serveur MCP) ou depuis la CI (action GitHub).

## Ce qui est vérifié

| Catégorie   | Contrôles                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sécurité    | `.env` et `.git/config` lisibles, clés dans le JavaScript servi, redirection HTTP → HTTPS, en-têtes de sécurité, cartes de source publiques, version du serveur, secrets publiés dans le dépôt |
| Réseau lent | premier affichage estimé en « 3G rapide » (1,6 Mbit/s, 562 ms), poids, compression, images, cache, viewport mobile, temps de réponse du serveur                                                |
| Dépendances | failles connues (base OSV) avec la version corrigée, fichier de verrouillage                                                                                                                   |
| Licences    | licence du dépôt, dépendances directes GPL, AGPL, LGPL…                                                                                                                                        |
| Hébergement | application servie depuis les adresses Systalink (`SYSTALINK_IP_RANGES`)                                                                                                                       |
| Performance | **Lighthouse mobile réel** (Google PageSpeed Insights) : scores performance, accessibilité, bonnes pratiques, référencement ; LCP, TBT, CLS ; mesures de vrais visiteurs Chrome si disponibles |
| Charge      | **test de charge** (option) : montée de 2 à 50 visiteurs simultanés, point de rupture, latences p50/p95/p99, erreurs ; domaine prouvé obligatoire                                              |
| Code (CI)   | avec l'action GitHub : `lint`, `typecheck`, `test`, couverture, `build` ; secrets dans tout l'historique (gitleaks) ; failles des dépendances (osv-scanner) ; Lighthouse sur la machine GitHub |

## Lighthouse et coûts

L'audit Lighthouse du serveur passe par l'API PageSpeed Insights : il tourne chez Google, pas chez Systalink. Sans clé, Google partage un petit quota entre tous les appelants anonymes, souvent épuisé : en production, créer une clé gratuite (Google Cloud → API « PageSpeed Insights API » → identifiants → clé API, 25 000 audits par jour) et la mettre dans `PAGESPEED_API_KEY`. Sans réponse de Google, le rapport l'indique (`lh.unavailable`) et reste complet pour le reste. Dans la CI, l'action lance Lighthouse directement sur la machine GitHub.

## Test de charge

Option « Ajouter un test de charge » sur `/prevol`, `loadTest: true` dans l'API ou l'outil MCP, `load-test: 'true'` dans l'action.

- **Preuve de propriété obligatoire**, sinon l'outil servirait à attaquer le site d'un autre. Deux façons : publier `https://<domaine>/.well-known/devhub-verify.txt` contenant `devhub-verify=<jeton>`, ou un enregistrement DNS TXT `_devhub-verify.<domaine>` de même valeur. Le jeton est dérivé du compte et du domaine (`GET /api/v1/preflight/ownership?url=` le donne, avec l'état de la vérification). Rien n'est stocké.
- **Montée par paliers** de 2, 5, 10, 20, 35 et 50 visiteurs simultanés, 4 secondes chacun ; arrêt au premier palier qui ne tient pas (95 % des réponses sous 2 s et moins de 2 % d'erreurs : 5xx, 429, délai, connexion refusée).
- **Plafonds** pour que l'hébergement reste quasi gratuit : 4 000 requêtes au plus, 64 Ko lus par réponse, 10 s par requête, un seul test à la fois sur tout le serveur, 3 tests par personne et par heure. L'anti-SSRF du pré-vol s'applique à chaque requête.
- Contrôles produits : `load.capacity` (tenue, avec les pistes de correction dans l'ordre), `load.server_errors`, `load.rate_limited`, `load.slow_baseline`. Le rapport en ligne trace la courbe débit / temps de réponse par palier.

Score = (OK + avertissements / 2) / nombre de contrôles. Verdict : `ready` (rien à corriger), `review` (avertissements), `fix` (au moins un point bloquant). Chaque contrôle a un identifiant stable (`site.exposed_files`, `deps.vulnerabilities`…) que l'agent peut citer.

## Jetons d'API personnels

Sur `/prevol`, section « Brancher ton agent IA et ta CI » : donner un nom, **Créer**, copier le jeton (`dh_pat_…`), affiché une seule fois.

- Un jeton n'ouvre **que** les routes du pré-vol (`POST /api/v1/preflight`, `GET /api/v1/preflight`, `POST /api/v1/mcp`), au nom de son titulaire, dans le même quota de 10 pré-vols par heure.
- Il ne permet ni de lire le profil ni de créer d'autres jetons. Cinq jetons au plus par personne ; suppression d'un clic.
- Seule l'empreinte SHA-256 est stockée (`api_tokens`). Les jetons sont supprimés avec le compte, et refusés si le compte est suspendu.

## Depuis l'agent IA (serveur MCP)

Serveur MCP distant : `POST https://<domaine>/api/v1/mcp` (transport « Streamable HTTP », sans état, réponses JSON), authentifié par `Authorization: Bearer dh_pat_…`.

Claude Code :

```bash
claude mcp add --transport http devhub https://<domaine>/api/v1/mcp \
  --header "Authorization: Bearer dh_pat_…"
```

Cursor, Windsurf, VS Code et autres (`.cursor/mcp.json` ou équivalent) :

```json
{
  "mcpServers": {
    "devhub": {
      "url": "https://<domaine>/api/v1/mcp",
      "headers": { "Authorization": "Bearer dh_pat_…" }
    }
  }
}
```

Outils exposés :

| Outil                  | Rôle                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| `run_preflight`        | `{ url?, repo?, loadTest? }` : lance un pré-vol et renvoie le rapport Markdown |
| `get_preflight_report` | `{ id }` : relit un rapport                                                    |
| `list_preflights`      | derniers pré-vols du compte                                                    |

Il suffit ensuite de demander à l'agent : « lance un pré-vol sur https://monapp.sn et corrige ce qu'il trouve ». Les erreurs (quota, dépôt privé, site injoignable) reviennent comme résultat d'outil lisible, pas comme panne.

## Depuis la CI (action GitHub)

L'action `actions/prevol` de ce dépôt contrôle d'abord le code sur les machines gratuites de GitHub, puis lance le pré-vol. Le rapport complet s'affiche dans le résumé du job, et chaque problème apparaît en annotation.

```yaml
# .github/workflows/prevol.yml
name: Pré-vol
on: [push, pull_request]
permissions:
  contents: read
  pull-requests: write # commentaire de synthèse sur la PR
jobs:
  prevol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # gitleaks lit tout l'historique
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: sx1vio/CADEV-saiyens/actions/prevol@main
        with:
          token: ${{ secrets.DEVHUB_TOKEN }}
          url: https://monapp.sn
          api-url: https://<domaine>
          fail-on: fix
```

| Entrée                       | Défaut                     | Rôle                                                                   |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `token`                      | vide                       | jeton DevHub ; sans lui, seul le contrôle du code tourne               |
| `url`                        | vide                       | application en ligne (HTTPS public)                                    |
| `repo`                       | `${{ github.repository }}` | dépôt analysé ; ignoré automatiquement si le dépôt est privé           |
| `api-url`                    | `https://devhub.africa`    | adresse de DevHub Africa                                               |
| `code-checks`                | `true`                     | installation puis `lint`, `typecheck`, `test`, `build` s'ils existent  |
| `working-directory`          | `.`                        | dossier du `package.json`                                              |
| `fail-on`                    | `fix`                      | `fix` (point bloquant), `review` (au moindre avertissement) ou `never` |
| `min-score`                  | `0`                        | score minimal exigé                                                    |
| `security-scan`              | `true`                     | gitleaks (historique complet) et osv-scanner (tous écosystèmes)        |
| `fail-on-security`           | `true`                     | échec du job si un secret ou une dépendance vulnérable est trouvé      |
| `lighthouse`                 | `true`                     | audit Lighthouse mobile sur la machine GitHub (si `url`)               |
| `lighthouse-min-performance` | `0`                        | score de performance minimal                                           |
| `coverage-min`               | `0`                        | couverture des lignes minimale (`coverage/coverage-summary.json`)      |
| `load-test`                  | `false`                    | ajoute le test de charge au pré-vol (domaine prouvé sur DevHub)        |
| `comment-pr`                 | `true`                     | une synthèse en commentaire de la PR, mise à jour à chaque passage     |

Sorties : `score`, `verdict`, `report-url`, `code-checks` (`passed`, `failed`, `skipped`), `coverage`, `secrets`, `vulnerable`, `lighthouse-performance`. gitleaks 8.30.1 (MIT), osv-scanner 2.7.0 (Apache-2.0) et Lighthouse 13.5.0 (Apache-2.0) sont téléchargés depuis leurs publications officielles ; gitleaks et osv-scanner sont vérifiés par leur somme SHA-256. Le gestionnaire de paquets est choisi selon le fichier de verrouillage (pnpm, yarn, bun, npm).

## Limites connues

- Le temps en 3G est un **calcul** à partir des octets et des allers-retours ; l'audit Lighthouse, lui, est une vraie mesure (téléphone et réseau simulés par Google).
- Le test de charge part d'une seule adresse : une limitation de débit par IP peut le freiner (`load.rate_limited`) alors que de vrais visiteurs, chacun sur son adresse, ne le seraient pas.
- Seuls les dépôts GitHub **publics** sont lus. En production, renseigner `PREFLIGHT_GITHUB_TOKEN` (jeton GitHub en lecture seule) : sans lui, le serveur entier est limité à 60 requêtes GitHub par heure (2 par pré-vol de dépôt).
- Le code du dépôt n'est jamais exécuté côté DevHub. Les tests du projet tournent uniquement dans la CI du développeur (action GitHub).
