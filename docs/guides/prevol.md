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
| Code (CI)   | avec l'action GitHub : installation, `lint`, `typecheck`, `test` et `build` du projet                                                                                                          |

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

| Outil                  | Rôle                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| `run_preflight`        | `{ url?, repo? }` : lance un pré-vol et renvoie le rapport Markdown |
| `get_preflight_report` | `{ id }` : relit un rapport                                         |
| `list_preflights`      | derniers pré-vols du compte                                         |

Il suffit ensuite de demander à l'agent : « lance un pré-vol sur https://monapp.sn et corrige ce qu'il trouve ». Les erreurs (quota, dépôt privé, site injoignable) reviennent comme résultat d'outil lisible, pas comme panne.

## Depuis la CI (action GitHub)

L'action `actions/prevol` de ce dépôt contrôle d'abord le code sur les machines gratuites de GitHub, puis lance le pré-vol. Le rapport complet s'affiche dans le résumé du job, et chaque problème apparaît en annotation.

```yaml
# .github/workflows/prevol.yml
name: Pré-vol
on: [push, pull_request]
jobs:
  prevol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: sx1vio/CADEV-saiyens/actions/prevol@main
        with:
          token: ${{ secrets.DEVHUB_TOKEN }}
          url: https://monapp.sn
          api-url: https://<domaine>
          fail-on: fix
```

| Entrée              | Défaut                     | Rôle                                                                   |
| ------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `token`             | vide                       | jeton DevHub ; sans lui, seul le contrôle du code tourne               |
| `url`               | vide                       | application en ligne (HTTPS public)                                    |
| `repo`              | `${{ github.repository }}` | dépôt analysé ; ignoré automatiquement si le dépôt est privé           |
| `api-url`           | `https://devhub.africa`    | adresse de DevHub Africa                                               |
| `code-checks`       | `true`                     | installation puis `lint`, `typecheck`, `test`, `build` s'ils existent  |
| `working-directory` | `.`                        | dossier du `package.json`                                              |
| `fail-on`           | `fix`                      | `fix` (point bloquant), `review` (au moindre avertissement) ou `never` |
| `min-score`         | `0`                        | score minimal exigé                                                    |

Sorties : `score`, `verdict`, `report-url`, `code-checks` (`passed`, `failed`, `skipped`). Le gestionnaire de paquets est choisi selon le fichier de verrouillage (pnpm, yarn, bun, npm).

## Limites connues

- Le temps en 3G est un **calcul** à partir des octets et des allers-retours, pas une mesure sur un vrai téléphone.
- Seuls les dépôts GitHub **publics** sont lus. En production, renseigner `PREFLIGHT_GITHUB_TOKEN` (jeton GitHub en lecture seule) : sans lui, le serveur entier est limité à 60 requêtes GitHub par heure (2 par pré-vol de dépôt).
- Le code du dépôt n'est jamais exécuté côté DevHub. Les tests du projet tournent uniquement dans la CI du développeur (action GitHub).
