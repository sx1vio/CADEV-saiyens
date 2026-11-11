# Pré-vol : du prompt à la prod vérifiée

Le pré-vol vérifie une application déployée et son dépôt GitHub public avant la mise en production. Il rend un rapport qu'un humain lit et que l'agent IA du développeur (Claude Code, Codex, Cursor…) applique tel quel. On peut le lancer de trois façons : depuis la page `/prevol`, depuis l'agent IA (serveur MCP) ou depuis la CI (action GitHub).

## Ce qui est vérifié

| Catégorie   | Contrôles                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sécurité    | `.env` et `.git/config` lisibles, clés dans le JavaScript servi, redirection HTTP → HTTPS, en-têtes de sécurité, cartes de source publiques, version du serveur, secrets publiés dans le dépôt                                                                                                    |
| Réseau lent | premier affichage estimé en « 3G rapide » (1,6 Mbit/s, 562 ms), poids, compression, images, cache, viewport mobile, temps de réponse du serveur                                                                                                                                                   |
| Dépendances | failles connues (base OSV) avec la version corrigée, fichier de verrouillage                                                                                                                                                                                                                      |
| Licences    | licence du dépôt, dépendances directes GPL, AGPL, LGPL…                                                                                                                                                                                                                                           |
| Hébergement | application servie depuis les adresses Systalink (`SYSTALINK_IP_RANGES`) ; avec l’offre Systalink déclarée et le test de charge, offre conseillée (`host.plan`)                                                                                                                                   |
| Charge      | **test de charge** (option) : montée de 2 à 50 visiteurs simultanés, point de rupture, latences p50/p95/p99, erreurs ; domaine prouvé obligatoire                                                                                                                                                 |
| Fonctionnel | **recette** : pages du sitemap appelées une à une (`func.pages`), routes découvertes dans le sitemap, le robots.txt et le routeur du JavaScript (`func.routes`), erreurs de la console au chargement (`lh.console_errors`)                                                                        |
| Recette     | routes d'API appelées **sans session** (`sec.anonymous_api`, GET seulement), divulgation de la pile par l'API (`sec.api_disclosure`), zoom bloqué (`a11y.zoom`), langue (`a11y.lang`), manifeste complet (`pwa.manifest`), cache d'API du service worker (`pwa.api_cache`), Brotli (`net.brotli`) |
| Code (CI)   | avec l'action GitHub : `lint`, `typecheck`, `test`, couverture, `build` ; secrets dans tout l'historique (gitleaks) ; failles des dépendances (osv-scanner) ; Lighthouse sur la machine GitHub                                                                                                    |

## Verdict de recette (GO / NO-GO)

Depuis le 10/11/2026, chaque rapport porte aussi une lecture « recette » (méthode VABF du skill `recette-qa` de l'équipe), recalculée à chaque lecture : les anciens rapports l'ont aussi. Objet `recette` du JSON, section « Recette » du Markdown, carte « Recette » sur `/prevol/:id`.

- **Gravité** de chaque contrôle ouvert : _critique_ (fuite de secret ou de données, contournement d'accès, HTTPS cassé), _majeure_ (fonction ou critère AA dégradé), _mineure_ (confort, bonne pratique). Les informations ne comptent pas.
- **Sections et poids** (web / PWA) : fonctionnel 25, sécurité 20, accessibilité 15, performance 15, réseau et fiabilité 10, cookies et vie privée 10, PWA 5. Référencement, qualité du code, licences et hébergement restent dans le score du pré-vol, hors barème de recette. Score de section = points des contrôles réussis / points applicables (poids 3, 2 ou 1 ; un avertissement vaut la moitié). Une majeure ouverte plafonne la section à 79, une critique à 49. Une section sans contrôle est exclue.
- **Gates éliminatoires** : aucun secret exposé ; HTTPS valide et TLS 1.2 minimum ; aucune donnée protégée servie sans connexion ; aucun traceur publicitaire avant consentement ; cloisonnement entre comptes (IDOR), **jamais évaluable de l'extérieur** : la décision est donc toujours marquée « provisoire ».
- **Décision** : `go` (score ≥ 85, aucune critique, aucune majeure en sécurité ni en accessibilité, aucune gate en échec), `go_with_reservations` (score 70 à 84, aucune critique), `no_go` (une critique, une gate en échec ou un score < 70).
- **À tester à la main** (`untested`) : IDOR avec deux comptes, parcours connectés et écritures, purge du cache après déconnexion, accessibilité manuelle (clavier, lecteur d'écran, zoom 200 %), Safari et Firefox, et selon le passage : Lighthouse, mesures terrain, charge, dépôt.

La matrice des routes d'API en anonyme ne tourne que sur un **domaine prouvé** (même preuve que le test de charge : fichier `.well-known/devhub-verify.txt` ou DNS TXT) ; sans preuve, `sec.anonymous_api` reste une information et la gate « aucune donnée protégée servie sans connexion » est non évaluée. Les routes sont appelées en **GET seulement**, 18 au plus, jamais celles qui pourraient avoir un effet (`logout`, `delete`, `reset`, `publish`, `invite`, `cron`, `send`, `export`, paiement, OAuth…). Seuls les **noms** des champs sensibles d'une réponse sont relevés, jamais leurs valeurs. Une réponse vide comme `{ "user": null }` n'est pas une fuite.

## Label « DevHub Ready »

Depuis le 11/11/2026, une application peut recevoir le **label DevHub Ready** : la preuve publique qu'elle a passé la recette du pré-vol.

- **Conditions** : le domaine est **prouvé** par l'auteur du pré-vol (fichier `.well-known/devhub-verify.txt` ou DNS TXT, la même preuve que le test de charge) et le verdict de recette est **GO**.
- **Le label suit le dernier pré-vol prouvé du domaine** : un NO-GO ou un GO sous réserves le retire (`not_ready`), et il expire 30 jours après le dernier GO (`expired`). Si quelqu'un d'autre prouve à son tour le domaine, le label passe à son nom.
- **Public** : page `/label/:domaine` (verdict, scores par section, propriétaire, lien vers le rapport), `GET /api/v1/labels/:domaine` (JSON), `GET /api/v1/labels?owner=:pseudo` (section « Applications DevHub Ready » du Passport).
- **Badge** pour le README : `GET /api/v1/labels/:domaine/badge.svg`, vert « Ready ✓ 92 », orange « pré-vol 74/100 », gris « label expiré » ou « non vérifié ». Mis en cache une heure. Le rapport donne le Markdown à coller : `[![DevHub Ready](…/badge.svg)](…/label/:domaine)`.
- **Proof XP** : 10 XP (`preflight_ready`) la première fois qu'un domaine passe GO, une seule fois par domaine et par personne.

Table `preflight_labels` (un label par domaine), code : `infrastructure/preflight-labels.ts`, `http/labels.controller.ts`. Tests : `test/preflight-labels.e2e.spec.ts`.

## Correctifs prêts (pull request en un clic)

Pour les points qu'un fichier règle, le rapport donne le **fichier complet** (objet `fixes` du JSON, carte « Correctifs prêts » sur `/prevol/:id`, section du Markdown pour l'agent IA) :

| Contrôle                                                                                    | Correctif                                                                           |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `site.security_headers`, `site.hsts_quality`, `site.permissions_policy`, `site.csp_quality` | `public/_headers` (Netlify, Cloudflare Pages), extraits Vercel, Nginx et Caddy      |
| `site.security_txt`                                                                         | `public/.well-known/security.txt` (RFC 9116, expiration à un an)                    |
| `seo.robots`, `seo.sitemap`                                                                 | `public/robots.txt`, `public/sitemap.xml`                                           |
| `repo.gitignore`                                                                            | `.gitignore` (secrets et dépendances exclus)                                        |
| `quality.ci`                                                                                | `.github/workflows/prevol.yml` : lint, types, tests, build et pré-vol à chaque push |
| `net.mobile_viewport`, `a11y.lang`, `seo.title`, `seo.description`, `seo.open_graph`        | extraits HTML pour `index.html`                                                     |
| `site.source_maps`, `site.tech_disclosure`, `deps.lockfile`                                 | extrait de configuration ou commande                                                |

Avec un dépôt GitHub, chaque fichier a un bouton **« Proposer sur GitHub »** : il ouvre l'éditeur de github.com déjà rempli (`/new/<branche>?filename=…&value=…`), et « Propose changes » crée la branche et la pull request. DevHub n'a **aucun droit d'écriture** sur le dépôt : l'OAuth reste en lecture seule et c'est le développeur qui valide sur GitHub. Si le fichier existe déjà, GitHub le signale : il faut alors fusionner le contenu à la main. Calcul pur, à chaque lecture (`domain/fixes.ts`) : les anciens rapports en profitent aussi.

## Lighthouse : dans la CI seulement

Depuis le 12/11/2026, le pré-vol du serveur ne lance plus d'audit Lighthouse : il passait par l'API PageSpeed Insights de Google qui, sans clé, refuse souvent la requête, et le rapport affichait « audit indisponible ». La performance réelle se mesure dans l'action GitHub (`lighthouse: true`), qui lance Lighthouse sur la machine GitHub. Les anciens rapports qui contiennent un audit l'affichent toujours ; la sonde (`infrastructure/lighthouse.probe.ts`) reste dans le code, débranchée.

## Test de charge

Option « Ajouter un test de charge » sur `/prevol`, `loadTest: true` dans l'API ou l'outil MCP, `load-test: 'true'` dans l'action.

- **Preuve de propriété obligatoire**, sinon l'outil servirait à attaquer le site d'un autre. Deux façons : publier `https://<domaine>/.well-known/devhub-verify.txt` contenant `devhub-verify=<jeton>`, ou un enregistrement DNS TXT `_devhub-verify.<domaine>` de même valeur. Le jeton est dérivé du compte et du domaine (`GET /api/v1/preflight/ownership?url=` le donne, avec l'état de la vérification). Rien n'est stocké.
- **Montée par paliers** de 2, 5, 10, 20, 35 et 50 visiteurs simultanés, 4 secondes chacun ; arrêt au premier palier qui ne tient pas (95 % des réponses sous 2 s et moins de 2 % d'erreurs : 5xx, 429, délai, connexion refusée).
- **Plafonds** pour que l'hébergement reste quasi gratuit : 4 000 requêtes au plus, 64 Ko lus par réponse, 10 s par requête, un seul test à la fois sur tout le serveur, 3 tests par personne et par heure. L'anti-SSRF du pré-vol s'applique à chaque requête.
- Contrôles produits : `load.capacity` (tenue, avec les pistes de correction dans l'ordre), `load.server_errors`, `load.rate_limited`, `load.slow_baseline`. Le rapport en ligne trace la courbe débit / temps de réponse par palier.

Score = (OK + avertissements / 2) / nombre de contrôles. Verdict : `ready` (rien à corriger), `review` (avertissements), `fix` (au moins un point bloquant). Chaque contrôle a un identifiant stable (`site.exposed_files`, `deps.vulnerabilities`…) que l'agent peut citer.

## Conseil d'offre Systalink

Champ facultatif « Ton hébergement Systalink » sur `/prevol`, `systalink` dans l'API et l'outil MCP (`cloud_starter`, `cloud_business`, `cloud_performance`, `cloud_enterprise`, `cloud_other`, `web_service`, `static_site`, `web_hosting`, `site_builder`). Le rapport contient un objet `systalink` (`declared`, `recommended`, `reason`) et, quand une offre est conseillée, le contrôle `host.plan` (information, sans effet sur le score).

| Situation (avec test de charge)                         | Conseil                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| Tient jusqu'au plafond                                  | garder l'offre actuelle                               |
| Lent même sans charge (médiane > 800 ms au 1er palier)  | corriger l'application d'abord (`load.slow_baseline`) |
| Serveur cloud Starter, Business ou Performance saturé   | la taille au-dessus, puis relancer le pré-vol         |
| Serveur cloud Entreprise saturé                         | répartir la charge (plusieurs serveurs, Kubernetes)   |
| Hébergement web, web service ou créateur de site saturé | serveur cloud Starter                                 |
| Hors Systalink et saturé                                | serveur cloud Business à Dakar                        |

Sans test de charge, aucune offre n'est conseillée. La déclaration ne remplace pas la vérification par l'adresse IP : si l'IP n'est pas reconnue, `host.systalink` l'explique (attendu pour un site statique servi par un CDN).

## Jetons d'API personnels

Sur `/prevol`, section « Brancher ton agent IA et ta CI » : donner un nom, **Créer**, copier le jeton (`dh_pat_…`), affiché une seule fois.

- Deux portées (11/11/2026) : **Pré-vol seulement** n'ouvre que les routes du pré-vol (`POST /api/v1/preflight`, `GET /api/v1/preflight`, `POST /api/v1/mcp`) ; **Toute la plateforme** ouvre toute l'API et tous les outils du serveur MCP (voir [`mcp.md`](mcp.md)). Même quota de 10 pré-vols par heure.
- Aucun jeton ne permet de créer d'autres jetons, de supprimer le compte ni d'entrer dans l'administration. Cinq jetons au plus par personne ; suppression d'un clic.
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

- Le verdict de recette est un **projet** : il ne remplace ni le cahier de recette, ni les tests avec des comptes, ni un procès-verbal signé par un humain.
- Le temps en 3G est un **calcul** à partir des octets et des allers-retours ; l'audit Lighthouse, lui, est une vraie mesure (téléphone et réseau simulés par Google).
- Le test de charge part d'une seule adresse : une limitation de débit par IP peut le freiner (`load.rate_limited`) alors que de vrais visiteurs, chacun sur son adresse, ne le seraient pas.
- Seuls les dépôts GitHub **publics** sont lus. En production, renseigner `PREFLIGHT_GITHUB_TOKEN` (jeton GitHub en lecture seule) : sans lui, le serveur entier est limité à 60 requêtes GitHub par heure (2 par pré-vol de dépôt).
- Le code du dépôt n'est jamais exécuté côté DevHub. Les tests du projet tournent uniquement dans la CI du développeur (action GitHub).
