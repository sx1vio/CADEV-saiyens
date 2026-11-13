import type {
  ApiTokenItem,
  ApiTokenScope,
  CreateApiTokenResponse,
  ListApiTokensResponse,
} from '@devhub/contracts';
import {
  Bot,
  Briefcase,
  Check,
  FolderGit2,
  KeyRound,
  LifeBuoy,
  Lock,
  MessageSquare,
  Newspaper,
  PlaneTakeoff,
  Plug,
  ShieldCheck,
  Smartphone,
  Terminal,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { CodeBlock } from '@/components/agents/CodeBlock';
import { Button, ButtonLink, Spinner } from '@/components/ui/button';
import { Badge, Card, Input, Skeleton } from '@/components/ui/primitives';
import { setQueryData, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { DomainError } from '@/services/types';
import { useSession } from '@/stores/app';
import { Page } from './_layout';

/* ==================================================================
   Agents IA et MCP (12/11/2026) : page publique qui explique le serveur MCP de DevHub et,
   une fois connecté, crée et gère les jetons d'accès. Guide : docs/guides/mcp.md.
   ================================================================== */

async function call<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['X-DevHub-Client'] = 'web';
    headers['Idempotency-Key'] = crypto.randomUUID();
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new DomainError('network.offline');
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string };
    throw new DomainError(err.code ?? `http.${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const tokensApi = {
  list: () => call<ListApiTokensResponse>('GET', '/me/tokens'),
  create: (name: string, scope: ApiTokenScope) =>
    call<CreateApiTokenResponse>('POST', '/me/tokens', { name, scope }),
  revoke: (id: string) => call<void>('DELETE', `/me/tokens/${id}`),
};

const TOKENS_KEY = 'mcp:tokens';
const PLACEHOLDER = 'dh_pat_TON_JETON';

/* ---------------- Contenu ---------------- */

const EXAMPLES = [
  'Lance un pré-vol sur https://monapp.sn et corrige ce qu’il trouve.',
  'Trouve-moi une offre React en télétravail et prépare une candidature.',
  'Montre-moi les questions sans réponse sur Laravel et propose une réponse.',
  'Publie sur DevHub l’avancée de mon projet, avec le lien de la démo.',
  'Quelles tâches sont ouvertes dans mes projets ? Prends la plus simple.',
  'Résume mes notifications et mes messages non lus.',
];

const TOOL_GROUPS: { icon: typeof Bot; title: string; tools: string[] }[] = [
  {
    icon: PlaneTakeoff,
    title: 'Pré-vol',
    tools: ['run_preflight', 'get_preflight_report', 'list_preflights'],
  },
  {
    icon: UserRound,
    title: 'Compte et réseau',
    tools: ['whoami', 'update_my_profile', 'get_passport', 'search_devs', 'leaderboard'],
  },
  {
    icon: LifeBuoy,
    title: 'Entraide',
    tools: [
      'list_questions',
      'get_question',
      'ask_question',
      'answer_question',
      'upvote_answer',
      'accept_answer',
    ],
  },
  {
    icon: Newspaper,
    title: 'Fil et actualité',
    tools: ['list_posts', 'get_post', 'create_post', 'comment_post', 'vote_post', 'list_news'],
  },
  {
    icon: Briefcase,
    title: 'Emplois',
    tools: ['list_jobs', 'get_job', 'apply_job', 'my_applications', 'withdraw_application'],
  },
  {
    icon: FolderGit2,
    title: 'Projets',
    tools: [
      'list_projects',
      'get_project',
      'create_project',
      'join_project',
      'list_project_tasks',
      'create_project_task',
      'take_task',
      'submit_task',
      'post_project_message',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Messages et alertes',
    tools: [
      'list_conversations',
      'read_conversation',
      'start_conversation',
      'send_message',
      'list_notifications',
    ],
  },
  {
    icon: Smartphone,
    title: 'Livrer et progresser',
    tools: ['list_test_requests', 'request_device_tests', 'my_certifications', 'call_api'],
  },
];

const CLIENTS = [
  'Claude Code',
  'Cursor',
  'VS Code',
  'Codex',
  'Windsurf',
  'GitHub Actions',
] as const;
type Client = (typeof CLIENTS)[number];

function snippet(client: Client, origin: string, token: string): { where: string; code: string } {
  const url = `${origin}/api/v1/mcp`;
  switch (client) {
    case 'Claude Code':
      return {
        where: 'Dans le terminal de ton projet :',
        code: `claude mcp add --transport http devhub ${url} \\\n  --header "Authorization: Bearer ${token}"`,
      };
    case 'Cursor':
      return {
        where: 'Fichier .cursor/mcp.json (dans le projet, ou ~/.cursor/mcp.json pour tous) :',
        code: JSON.stringify(
          { mcpServers: { devhub: { url, headers: { Authorization: `Bearer ${token}` } } } },
          null,
          2,
        ),
      };
    case 'VS Code':
      return {
        where:
          'Fichier .vscode/mcp.json, puis « Start » sur le serveur dans le mode Agent de Copilot :',
        code: JSON.stringify(
          {
            servers: {
              devhub: { type: 'http', url, headers: { Authorization: `Bearer ${token}` } },
            },
          },
          null,
          2,
        ),
      };
    case 'Codex':
      return {
        where: 'Fichier ~/.codex/config.toml, avec le jeton dans la variable DEVHUB_TOKEN :',
        code: `[mcp_servers.devhub]\nurl = "${url}"\nbearer_token_env_var = "DEVHUB_TOKEN"\n\n# puis, dans ton terminal :\n# export DEVHUB_TOKEN=${token}`,
      };
    case 'Windsurf':
      return {
        where: 'Fichier ~/.codeium/windsurf/mcp_config.json :',
        code: JSON.stringify(
          {
            mcpServers: {
              devhub: { serverUrl: url, headers: { Authorization: `Bearer ${token}` } },
            },
          },
          null,
          2,
        ),
      };
    case 'GitHub Actions':
      return {
        where:
          'Fichier .github/workflows/prevol.yml ; jeton « Pré-vol seulement » dans le secret DEVHUB_TOKEN du dépôt :',
        code: `name: Pré-vol
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
          token: \${{ secrets.DEVHUB_TOKEN }}
          url: https://monapp.sn
          api-url: ${origin}
          fail-on: fix`,
      };
  }
}

/* ---------------- Page ---------------- */

export default function Mcp() {
  const user = useSession((s) => s.user);
  const [fresh, setFresh] = useState<string | null>(null);
  const [client, setClient] = useState<Client>('Claude Code');
  const origin = window.location.origin;
  const s = snippet(client, origin, fresh ?? PLACEHOLDER);

  // Retour de la connexion (« Se connecter pour créer mon jeton ») : on revient sur les jetons.
  useEffect(() => {
    if (window.location.hash === '#jeton')
      window.setTimeout(
        () => document.getElementById('jeton')?.scrollIntoView({ behavior: 'smooth' }),
        200,
      );
  }, []);

  return (
    <Page>
      {/* En-tête */}
      <section className="pt-2">
        <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent-text">
          <Plug className="size-4" /> Serveur MCP
        </p>
        <h1 className="mt-2 max-w-[760px] text-[32px] leading-[1.08] font-bold tracking-[-0.03em] text-fg sm:text-[44px]">
          Ton agent IA, branché sur DevHub.
        </h1>
        <p className="mt-3 max-w-[720px] text-[16px] leading-relaxed text-muted">
          Avec une ligne de configuration, Claude Code, Cursor, Codex ou Copilot agissent sur DevHub
          en ton nom, sans quitter l’éditeur : pré-vol et corrections, offres et candidatures,
          questions d’entraide, publications, projets, messages. Le protocole est MCP (Model Context
          Protocol), le standard ouvert des agents IA.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="accent">43 outils</Badge>
          <Badge tone="neutral">Mêmes droits que toi, jamais ton compte</Badge>
          <Badge tone="neutral">Jeton révocable en un clic</Badge>
          <Badge tone="neutral">Gratuit</Badge>
        </div>
      </section>

      {/* Trois étapes */}
      <ol className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          {
            n: 1,
            title: 'Crée ton jeton',
            text: 'Connecté à DevHub, choisis « Toute la plateforme » et copie le jeton : il n’est montré qu’une fois.',
          },
          {
            n: 2,
            title: 'Branche ton agent',
            text: 'Colle la commande ou le fichier de configuration de ton outil : Claude Code, Cursor, VS Code, Codex, Windsurf.',
          },
          {
            n: 3,
            title: 'Demande-lui',
            text: 'En français, comme à un collègue : « lance un pré-vol et corrige », « trouve-moi une mission React ».',
          },
        ].map((st) => (
          <li key={st.n}>
            <Card className="h-full p-5">
              <span className="grid size-8 place-items-center rounded-full bg-accent-strong text-[14px] font-bold text-on-accent">
                {st.n}
              </span>
              <p className="mt-3 text-[16px] font-semibold text-fg">{st.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{st.text}</p>
            </Card>
          </li>
        ))}
      </ol>

      {/* 1. Jeton */}
      <section id="jeton" className="mt-10 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold text-fg">
          <KeyRound className="size-5" /> 1. Ton jeton d’accès
        </h2>
        {user ? (
          <TokenManager onCreated={setFresh} fresh={fresh} />
        ) : (
          <Card className="mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
              <Lock className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-fg">
                Un jeton se crée depuis ton compte DevHub
              </p>
              <p className="mt-0.5 text-[13.5px] text-muted">
                Il agit en ton nom : connecte-toi (GitHub ou e-mail, gratuit), tu reviendras ici
                pour le créer.
              </p>
            </div>
            <ButtonLink
              to={`/connexion?next=${encodeURIComponent('/mcp#jeton')}`}
              variant="primary"
            >
              Se connecter pour créer mon jeton
            </ButtonLink>
          </Card>
        )}
      </section>

      {/* 2. Brancher */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold text-fg">
          <Terminal className="size-5" /> 2. Brancher ton agent
        </h2>
        <Card className="mt-3 min-w-0 p-5">
          <div role="tablist" aria-label="Outil" className="mb-3 flex flex-wrap gap-2">
            {CLIENTS.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={client === c}
                onClick={() => setClient(c)}
                className={cn(
                  'rounded-full px-3 py-1 text-[13px] transition-colors',
                  client === c ? 'bg-accent-soft text-accent-text' : 'text-muted hover:text-fg',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[13px] text-muted">{s.where}</p>
          <CodeBlock code={s.code} />
          <p className="mt-2 text-xs text-subtle">
            {fresh
              ? 'Ton nouveau jeton est déjà inséré. Ne le partage pas et ne le committe pas.'
              : `Remplace ${PLACEHOLDER} par ton jeton. Ne le committe jamais dans un dépôt.`}
          </p>
        </Card>
      </section>

      {/* 3. Demander */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold text-fg">
          <Bot className="size-5" /> 3. Demander
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(e)
                    .then(() => toast.success('Demande copiée. Colle-la dans ton agent.'))
                }
                className="flex w-full items-start gap-2 rounded-[10px] border border-line bg-surface-1 p-3 text-left text-[14px] text-fg transition-colors hover:border-line-strong"
              >
                <span className="text-accent-text">›</span>
                {e}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-muted">
          Avant de publier, répondre, postuler ou envoyer un message, l’agent te montre le texte et
          attend ton accord.
        </p>
      </section>

      {/* Outils */}
      <section className="mt-10">
        <h2 className="text-[20px] font-semibold text-fg">Les 43 outils</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOL_GROUPS.map((g) => (
            <Card key={g.title} className="p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-fg">
                <g.icon className="size-4 text-accent-text" /> {g.title}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {g.tools.map((t) => (
                  <li key={t}>
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] text-muted">
                      {t}
                    </code>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted">
          <code className="font-mono text-[12px]">call_api</code> appelle n’importe quelle route de
          l’API DevHub (/api/v1) avec tes droits, pour tout ce que les autres outils ne couvrent
          pas.
        </p>
      </section>

      {/* Sécurité */}
      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <ShieldCheck className="size-4 text-success" /> Ce que ton jeton peut faire
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-[13.5px] text-muted">
            {[
              'Agir en ton nom, avec exactement tes droits et tes limites',
              'Passer par les mêmes validations, quotas et modération que l’application',
              'Lancer 10 pré-vols par heure, comme toi',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Lock className="size-4 text-danger" /> Ce qu’il ne pourra jamais faire
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-[13.5px] text-muted">
            {[
              'Créer, lire ou supprimer tes jetons',
              'Supprimer ton compte ou changer ta connexion',
              'Entrer dans l’administration ou le portail entreprise',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-danger" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* FAQ */}
      <section className="mt-10 mb-6">
        <h2 className="text-[20px] font-semibold text-fg">Questions fréquentes</h2>
        <div className="mt-3 flex flex-col gap-2">
          {[
            [
              'C’est quoi, MCP ?',
              'Le Model Context Protocol est un standard ouvert qui permet à un agent IA d’utiliser des outils externes. DevHub expose ses services en serveur MCP distant (transport HTTP) : ton agent les découvre seul.',
            ],
            [
              '« Toute la plateforme » ou « Pré-vol seulement » ?',
              'Pour ton agent IA : « Toute la plateforme ». Pour une CI (GitHub Actions) qui ne fait que lancer le pré-vol : « Pré-vol seulement », c’est plus prudent.',
            ],
            [
              'Mon jeton a fuité, que faire ?',
              'Supprime-le ici, il est refusé immédiatement. Crée-en un autre. DevHub ne garde que son empreinte, jamais le jeton lui-même.',
            ],
            [
              'Combien ça coûte ?',
              'Rien. Le serveur MCP est gratuit, dans les mêmes limites que l’application (5 jetons au plus, 10 pré-vols par heure).',
            ],
          ].map(([q, a]) => (
            <details key={q} className="rounded-[10px] border border-line bg-surface-1 p-4">
              <summary className="cursor-pointer text-[14.5px] font-medium text-fg">{q}</summary>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-muted">
          Le pré-vol, le label DevHub Ready et les correctifs prêts :{' '}
          <Link to="/prevol" className="font-medium text-accent-text hover:underline">
            page Pré-vol
          </Link>
          .
        </p>
      </section>
    </Page>
  );
}

/* ---------------- Jetons (connecté) ---------------- */

function TokenManager({
  fresh,
  onCreated,
}: {
  fresh: string | null;
  onCreated: (token: string) => void;
}) {
  const tokens = useQuery(TOKENS_KEY, () => tokensApi.list());
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ApiTokenScope>('platform');
  const [busy, setBusy] = useState(false);
  const items = tokens.data?.items ?? [];

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await tokensApi.create(
        name.trim() || (scope === 'platform' ? 'Mon agent IA' : 'Ma CI'),
        scope,
      );
      onCreated(created.token);
      setName('');
      setQueryData<ListApiTokensResponse>(TOKENS_KEY, (old) => ({
        items: [created, ...(old?.items ?? [])],
      }));
    } catch (err) {
      const code = err instanceof DomainError ? err.code : '';
      toast.error(
        code === 'api_token.limit'
          ? 'Cinq jetons au plus : supprime-en un avant d’en créer un autre.'
          : 'Création du jeton impossible. Réessaie.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(t: ApiTokenItem) {
    if (
      !confirm(`Supprimer le jeton « ${t.name} » ? Les agents qui l’utilisent seront déconnectés.`)
    )
      return;
    try {
      await tokensApi.revoke(t.id);
      setQueryData<ListApiTokensResponse>(TOKENS_KEY, (old) => ({
        items: (old?.items ?? []).filter((i) => i.id !== t.id),
      }));
      toast.success(`Jeton « ${t.name} » supprimé.`);
    } catch {
      toast.error('Suppression impossible. Réessaie.');
    }
  }

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="flex min-w-0 flex-col gap-3 p-5">
        <p className="text-[14px] font-semibold text-fg">Nouveau jeton</p>
        <div role="radiogroup" aria-label="Portée du jeton" className="flex flex-col gap-1.5">
          {(
            [
              [
                'platform',
                'Toute la plateforme',
                'Pour ton agent IA : pré-vol, entraide, fil, emplois, projets, messages.',
              ],
              ['preflight', 'Pré-vol seulement', 'Pour ta CI : lancer et lire des pré-vols.'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              onClick={() => setScope(value)}
              className={cn(
                'rounded-[8px] border px-3 py-2 text-left transition-colors',
                scope === value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-line-strong',
              )}
            >
              <span className="block text-[13.5px] font-medium text-fg">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </button>
          ))}
        </div>
        <form onSubmit={create} className="flex gap-2">
          <Input
            aria-label="Nom du jeton"
            placeholder="Claude Code, Cursor, CI…"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
          <Button type="submit" variant="primary" size="md" disabled={busy}>
            {busy ? <Spinner /> : 'Créer'}
          </Button>
        </form>
        {fresh && (
          <div className="rounded-[8px] border border-warning/40 bg-warning-soft p-3">
            <p className="mb-1 text-xs font-medium text-fg">
              Copie-le maintenant : il ne sera plus affiché. Il est aussi inséré dans la
              configuration ci-dessous.
            </p>
            <CodeBlock code={fresh} wrap />
          </div>
        )}
      </Card>

      <Card className="flex min-w-0 flex-col gap-3 p-5">
        <p className="text-[14px] font-semibold text-fg">Tes jetons ({items.length}/5)</p>
        {!tokens.data ? (
          <Skeleton className="h-10 rounded-[8px]" />
        ) : items.length === 0 ? (
          <p className="text-[13px] text-subtle">Aucun jeton pour l’instant.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-fg">{t.name}</span>
                <TokenScope scope={t.scope} />
                <span className="font-mono text-xs text-subtle">…{t.hint}</span>
                <span className="hidden text-xs text-subtle sm:inline">
                  {t.lastUsedAt
                    ? `utilisé le ${new Date(t.lastUsedAt).toLocaleDateString('fr-FR')}`
                    : 'jamais utilisé'}
                </span>
                <button
                  type="button"
                  aria-label={`Supprimer le jeton ${t.name}`}
                  onClick={() => void revoke(t)}
                  className="rounded p-1 text-muted hover:text-danger [&_svg]:size-3.5"
                >
                  <Trash2 />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto text-xs text-subtle">
          Seule l’empreinte est gardée. Un jeton supprimé est refusé aussitôt.
        </p>
      </Card>
    </div>
  );
}

function TokenScope({ scope }: { scope: ApiTokenScope }): ReactNode {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium',
        scope === 'platform' ? 'bg-accent-soft text-accent-text' : 'bg-surface-2 text-muted',
      )}
    >
      {scope === 'platform' ? 'Plateforme' : 'Pré-vol'}
    </span>
  );
}
