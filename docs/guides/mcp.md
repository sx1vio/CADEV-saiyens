# Serveur MCP de DevHub Africa

DevHub Africa expose un serveur MCP (Model Context Protocol) : l'agent IA du développeur (Claude Code, Cursor, Codex, Windsurf, VS Code…) agit sur la plateforme en son nom, sans quitter son éditeur. Il lance un pré-vol et corrige le projet, cherche une offre et prépare la candidature, répond aux questions d'entraide, publie une avancée, suit ses projets, ses messages et ses notifications.

- **Adresse** : `POST https://devafrica.tech/api/v1/mcp` (transport « Streamable HTTP », sans état, réponses JSON).
- **Authentification** : `Authorization: Bearer dh_pat_…`, un jeton d'API personnel créé sur la page **Pré-vol**, section « Brancher ton agent IA et ta CI ».

## Deux portées de jeton

| Portée                  | Pour                           | Ouvre                                                             |
| ----------------------- | ------------------------------ | ----------------------------------------------------------------- |
| **Toute la plateforme** | l'agent IA, les scripts du dev | toute l'API au nom du titulaire, et tous les outils MCP           |
| **Pré-vol seulement**   | la CI (action GitHub `prevol`) | `POST/GET /api/v1/preflight`, le MCP avec ses 3 outils de pré-vol |

Un jeton, quelle que soit sa portée, **n'ouvre jamais** : la gestion des jetons (`/me/tokens`), la suppression du compte (`DELETE /me`), la connexion (`/auth/*`), l'administration (`/admin/*`), le portail entreprise (`/business/*`), la synchronisation hors ligne du mobile (`/sync`) ni le flux SSE (`/events`). La règle est centrale : `apps/api/src/modules/identity/http/platform-token.ts`.

Cinq jetons au plus par personne ; seule l'empreinte SHA-256 est stockée ; un jeton est refusé dès que le compte est suspendu ou supprimé.

## Brancher l'agent

Claude Code :

```bash
claude mcp add --transport http devhub https://devafrica.tech/api/v1/mcp \
  --header "Authorization: Bearer dh_pat_…"
```

Cursor, Windsurf, VS Code, Codex (`.cursor/mcp.json` ou équivalent) :

```json
{
  "mcpServers": {
    "devhub": {
      "url": "https://devafrica.tech/api/v1/mcp",
      "headers": { "Authorization": "Bearer dh_pat_…" }
    }
  }
}
```

Exemples de demandes : « lance un pré-vol sur https://monapp.sn et corrige ce qu'il trouve », « trouve-moi une offre React à distance et prépare une candidature », « montre-moi les questions sans réponse sur Laravel et propose une réponse », « publie mon avancée sur DevHub ».

## Outils

| Domaine                | Outils                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pré-vol (toute portée) | `run_preflight`, `get_preflight_report`, `list_preflights`                                                                                                        |
| Compte et réseau       | `whoami`, `update_my_profile`, `get_passport`, `search_devs`, `leaderboard`                                                                                       |
| Entraide               | `list_questions`, `get_question`, `ask_question`, `answer_question`, `upvote_answer`, `accept_answer`                                                             |
| Fil                    | `list_posts`, `get_post`, `create_post`, `comment_post`, `vote_post`, `list_news`                                                                                 |
| Emplois                | `list_jobs`, `get_job`, `apply_job`, `my_applications`                                                                                                            |
| Projets                | `list_projects`, `get_project`, `create_project`, `join_project`, `list_project_tasks`, `create_project_task`, `take_task`, `submit_task`, `post_project_message` |
| Messages               | `list_conversations`, `read_conversation`, `start_conversation`, `send_message`, `list_notifications`                                                             |
| Livrer                 | `list_test_requests`, `request_device_tests`, `my_certifications`                                                                                                 |
| Accès direct           | `call_api` : n'importe quelle route de `/api/v1`, avec les mêmes droits que le dev                                                                                |

Les outils qui publient quelque chose de visible (question, réponse, publication, candidature, message) portent l'annotation `destructiveHint` : les clients MCP demandent confirmation avant de les lancer, et les instructions du serveur demandent à l'agent de montrer le texte au dev d'abord.

## Fonctionnement

- Les schémas d'entrée des outils sont **générés depuis les contrats** (`packages/contracts`, zod) : ils restent exacts quand l'API évolue.
- Chaque outil plateforme **appelle la vraie route de l'API** par la boucle locale, avec le jeton de l'appelant (`apps/api/src/modules/preflight/infrastructure/api-loopback.ts`). Il repasse donc par les mêmes gardes, validations, quotas, masquage des secrets et modération que l'application. Le `clientId` des écritures hors ligne et la clé d'idempotence sont générés par le serveur.
- Les erreurs de l'API reviennent comme résultat d'outil lisible (`isError: true`, code et explication), jamais comme panne du serveur MCP.
- Un jeton « Pré-vol seulement » ne voit que les 3 outils du pré-vol ; appeler un outil plateforme avec lui renvoie la consigne de créer un jeton « Toute la plateforme ».

Code : `apps/api/src/modules/preflight/application/{mcp-server,platform-tools}.ts`. Tests : `platform-tools.spec.ts`, `test/mcp-platform.e2e.spec.ts`, `test/api-tokens.e2e.spec.ts`.
