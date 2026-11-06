import type {
  ApiTokenItem,
  CreateApiTokenResponse,
  ListApiTokensResponse,
  ListPreflightResponse,
  PreflightCheck,
  PreflightLighthouse,
  PreflightLoadTest,
  PreflightOwnership,
  PreflightReport,
  PreflightVerdict,
} from '@devhub/contracts';
import {
  Accessibility,
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Download,
  Gauge,
  GitBranch,
  KeyRound,
  Plug,
  Trash2,
  Globe,
  Info,
  Package,
  Link2,
  RefreshCw,
  Rocket,
  Scale,
  Server,
  ShieldCheck,
  Timer,
  Weight,
  XCircle,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/domain';
import { Button, ButtonLink, Spinner } from '@/components/ui/button';
import { Badge, Card, Field, IconChip, Input, Skeleton } from '@/components/ui/primitives';
import { setQueryData, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { DomainError } from '@/services/types';
import { useSession } from '@/stores/app';
import { Page } from './_layout';

/* ---------------- Client de l'API du pré-vol ---------------- */

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

const preflightApi = {
  run: (url: string | null, repo: string | null, loadTest = false) =>
    call<PreflightReport>('POST', '/preflight', { url, repo, loadTest }),
  ownership: (url: string) =>
    call<PreflightOwnership>('GET', `/preflight/ownership?url=${encodeURIComponent(url)}`),
  get: (id: string) => call<PreflightReport>('GET', `/preflight/${id}`),
  mine: () => call<ListPreflightResponse>('GET', '/preflight'),
  markdownUrl: (id: string) => `/api/v1/preflight/${id}/report.md`,
  tokens: () => call<ListApiTokensResponse>('GET', '/me/tokens'),
  createToken: (name: string) => call<CreateApiTokenResponse>('POST', '/me/tokens', { name }),
  revokeToken: (id: string) => call<void>('DELETE', `/me/tokens/${id}`),
};

function preflightError(e: unknown): string {
  const code = e instanceof DomainError ? e.code : '';
  if (code === 'auth.required' || code === 'http.401')
    return 'Connecte-toi pour lancer un pré-vol.';
  if (code === 'preflight.quota')
    return 'Tu as atteint la limite de 10 pré-vols par heure. Réessaie un peu plus tard.';
  if (code === 'preflight.in_progress') return 'Un pré-vol est déjà en cours sur ton compte.';
  if (code === 'preflight.site_unreachable')
    return 'L’application n’a pas répondu. Vérifie l’adresse : elle doit être publique et en HTTPS.';
  if (code === 'preflight.repo_not_found')
    return 'Dépôt introuvable. Il doit être public, au format owner/repo.';
  if (code === 'preflight.github_rate_limited')
    return 'GitHub limite les requêtes pour le moment. Réessaie dans quelques minutes.';
  if (code === 'preflight.ownership_required')
    return 'Test de charge refusé : le domaine n’est pas encore prouvé. Crée le fichier ou l’enregistrement DNS indiqué, puis clique sur « Vérifier ».';
  if (code === 'preflight.load_quota')
    return 'Tu as atteint la limite de 3 tests de charge par heure. Lance le pré-vol sans test de charge, ou réessaie plus tard.';
  if (code === 'preflight.load_busy')
    return 'Un autre test de charge tourne en ce moment. Réessaie dans une minute.';
  if (code === 'preflight.load_needs_url')
    return 'Le test de charge a besoin de l’adresse de l’application.';
  if (code === 'validation.failed' || code === 'http.400')
    return 'Indique une adresse en https:// ou un dépôt GitHub (owner/repo).';
  if (code === 'network.offline') return 'Pas de connexion. Réessaie quand le réseau revient.';
  return 'Le pré-vol a échoué. Réessaie dans un instant.';
}

/* ---------------- Présentation ---------------- */

const VERDICT: Record<PreflightVerdict, { label: string; tone: 'success' | 'warning' | 'danger' }> =
  {
    ready: { label: 'Prêt pour la production', tone: 'success' },
    review: { label: 'À améliorer avant le lancement', tone: 'warning' },
    fix: { label: 'À corriger avant le lancement', tone: 'danger' },
  };

const CATEGORY: Record<PreflightCheck['category'], { label: string; icon: typeof ShieldCheck }> = {
  security: { label: 'Sécurité', icon: ShieldCheck },
  network: { label: 'Réseau lent', icon: Gauge },
  performance: { label: 'Performance', icon: Gauge },
  accessibility: { label: 'Accessibilité', icon: Accessibility },
  load: { label: 'Tenue à la charge', icon: Activity },
  dependencies: { label: 'Dépendances', icon: Package },
  licences: { label: 'Licences', icon: Scale },
  hosting: { label: 'Hébergement', icon: Server },
};

const STATUS = {
  fail: { icon: XCircle, tone: 'danger', label: 'À corriger' },
  warn: { icon: AlertTriangle, tone: 'warning', label: 'À améliorer' },
  info: { icon: Info, tone: 'neutral', label: 'Pour information' },
  pass: { icon: CheckCircle2, tone: 'success', label: 'OK' },
} as const;

const fmtBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.round(n / 1024)} Ko`
    : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
const fmtMs = (ms: number) =>
  ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const target = (r: { url: string | null; repo: string | null }) =>
  [r.url?.replace(/^https:\/\//, ''), r.repo].filter(Boolean).join(' · ');

function ScoreRing({ score, tone }: { score: number; tone: 'success' | 'warning' | 'danger' }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  }[tone];
  return (
    <div className="relative grid size-[88px] shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
        />
      </svg>
      <span className="text-[26px] font-semibold tabular tracking-tight text-fg">
        {score}
        <span className="sr-only"> sur 100</span>
      </span>
    </div>
  );
}

/* ---------------- Page : lancer un pré-vol ---------------- */

export default function Preflight() {
  const { id } = useParams();
  return id ? <ReportView id={id} /> : <Launcher />;
}

function Launcher() {
  const user = useSession((s) => s.user);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Lien « Lancer un pré-vol » depuis le Banc d'essai : l'adresse arrive pré-remplie.
  const [url, setUrl] = useState(() => params.get('url') ?? '');
  const [repo, setRepo] = useState('');
  const [loadTest, setLoadTest] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useQuery(user ? 'preflight:mine' : null, () => preflightApi.mine());

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const u = url.trim();
    const r = repo.trim();
    if (!u && !r)
      return setError('Indique au moins l’adresse de l’application ou le dépôt GitHub.');
    const normalized = u && !/^https?:\/\//i.test(u) ? `https://${u}` : u;
    if (loadTest && !normalized)
      return setError('Le test de charge a besoin de l’adresse de l’application.');
    setRunning(true);
    try {
      const report = await preflightApi.run(normalized || null, r || null, loadTest);
      setQueryData<PreflightReport>(`preflight:${report.id}`, () => report);
      setQueryData<ListPreflightResponse>('preflight:mine', (old) => ({
        items: [report, ...(old?.items ?? [])].slice(0, 20),
      }));
      navigate(`/prevol/${report.id}`);
    } catch (err) {
      setError(preflightError(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Du prompt à la prod vérifiée"
        title="Pré-vol"
        subtitle="Ton IA a écrit le code. Avant de lancer, vérifie qu’il tient en vrai : secrets exposés, chargement en 3G, failles des dépendances, licences, hébergement. Le rapport se colle tel quel dans Claude Code, Codex ou Cursor, qui corrige."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field
              label="Adresse de l’application en ligne"
              htmlFor="pf-url"
              hint="Publique et en HTTPS. Exemple : https://monapp.sn"
            >
              <Input
                id="pf-url"
                inputMode="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={running}
              />
            </Field>
            <Field
              label="Dépôt GitHub public"
              htmlFor="pf-repo"
              optional="facultatif"
              hint="owner/repo ou l’adresse complète. Analyse des secrets publiés, des failles et des licences."
            >
              <Input
                id="pf-repo"
                placeholder="owner/repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={running}
              />
            </Field>
            {user && (
              <LoadTestOption
                url={
                  url.trim() && !/^https?:\/\//i.test(url.trim())
                    ? `https://${url.trim()}`
                    : url.trim()
                }
                on={loadTest}
                onChange={setLoadTest}
                disabled={running}
              />
            )}
            {error && (
              <p
                role="alert"
                className="rounded-[8px] bg-danger-soft px-3 py-2 text-[13px] text-danger"
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={running}
                  icon={running ? <Spinner /> : <Rocket />}
                >
                  {running ? 'Pré-vol en cours…' : 'Lancer le pré-vol'}
                </Button>
              ) : (
                <ButtonLink
                  to="/connexion?next=%2Fprevol"
                  variant="primary"
                  size="lg"
                  icon={<Rocket />}
                >
                  Se connecter pour lancer
                </ButtonLink>
              )}
              {running && (
                <span className="text-[13px] text-muted" aria-live="polite">
                  {loadTest
                    ? 'Audit Lighthouse, analyse du site et du dépôt, puis montée en charge : jusqu’à 2 minutes.'
                    : 'Audit Lighthouse, analyse du site, de ses fichiers et du dépôt : jusqu’à une minute.'}
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <p className="text-[15px] font-semibold text-fg">Ce qui est vérifié</p>
          {(
            [
              [
                ShieldCheck,
                'Sécurité',
                '.env et .git exposés, clés dans le JavaScript, HTTPS, en-têtes',
              ],
              [
                Gauge,
                'Réseau lent',
                'premier affichage estimé en 3G, poids, compression, cache, mobile',
              ],
              [
                Package,
                'Dépendances',
                'failles connues (base OSV) et version corrigée, fichiers de secrets',
              ],
              [
                Gauge,
                'Lighthouse mobile réel',
                'performance, accessibilité, référencement, Core Web Vitals (Google)',
              ],
              [
                Activity,
                'Tenue à la charge',
                'montée de 2 à 50 visiteurs simultanés, point de rupture',
              ],
              [Scale, 'Licences', 'licence du dépôt, dépendances GPL ou AGPL'],
              [Server, 'Hébergement', 'en Afrique chez Systalink ou non'],
            ] as const
          ).map(([Icon, title, text]) => (
            <div key={title} className="flex gap-3">
              <IconChip tone="blue">
                <Icon />
              </IconChip>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-fg">{title}</p>
                <p className="text-[13px] text-muted">{text}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {user && (
        <section className="mt-8">
          <h2 className="label-caps mb-3">Mes pré-vols</h2>
          {!history.data ? (
            <Skeleton className="h-16 rounded-[10px]" />
          ) : history.data.items.length === 0 ? (
            <p className="text-[13px] text-muted">Aucun pré-vol pour l’instant.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.data.items.map((r) => (
                <Link
                  key={r.id}
                  to={`/prevol/${r.id}`}
                  className="flex items-center gap-3 rounded-[10px] border border-line bg-surface-1 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="w-10 text-[18px] font-semibold tabular text-fg">{r.score}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{target(r)}</span>
                  <Badge tone={VERDICT[r.verdict].tone} size="sm">
                    {r.counts.fail
                      ? `${r.counts.fail} à corriger`
                      : r.counts.warn
                        ? `${r.counts.warn} à améliorer`
                        : 'Prêt'}
                  </Badge>
                  <span className="hidden text-xs text-subtle sm:inline">
                    {new Date(r.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {user && <ConnectAgents />}
    </Page>
  );
}

/* ---------------- Brancher l'agent IA et la CI ---------------- */

const AGENT_TABS = ['Claude Code', 'Cursor et autres', 'GitHub Actions'] as const;

function ConnectAgents() {
  const tokens = useQuery('preflight:tokens', () => preflightApi.tokens());
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof AGENT_TABS)[number]>('Claude Code');
  const origin = window.location.origin;
  const token = fresh ?? 'dh_pat_TON_JETON';
  const items = tokens.data?.items ?? [];

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await preflightApi.createToken(name.trim() || 'Mon agent');
      setFresh(created.token);
      setName('');
      setQueryData<ListApiTokensResponse>('preflight:tokens', (old) => ({
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
    try {
      await preflightApi.revokeToken(t.id);
      setQueryData<ListApiTokensResponse>('preflight:tokens', (old) => ({
        items: (old?.items ?? []).filter((i) => i.id !== t.id),
      }));
      toast.success(`Jeton « ${t.name} » supprimé.`);
    } catch {
      toast.error('Suppression impossible. Réessaie.');
    }
  }

  const snippets: Record<(typeof AGENT_TABS)[number], { intro: string; code: string }> = {
    'Claude Code': {
      intro: 'Dans le terminal de ton projet, puis demande : « lance un pré-vol et corrige ».',
      code: `claude mcp add --transport http devhub ${origin}/api/v1/mcp \\\n  --header "Authorization: Bearer ${token}"`,
    },
    'Cursor et autres': {
      intro:
        'Dans .cursor/mcp.json (ou la configuration MCP de ton éditeur : Windsurf, VS Code, Codex…).',
      code: JSON.stringify(
        {
          mcpServers: {
            devhub: {
              url: `${origin}/api/v1/mcp`,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      ),
    },
    'GitHub Actions': {
      intro:
        'À chaque push : lint, types, tests et build de ton projet, puis le pré-vol, avec le rapport dans le résumé du job. Gratuit sur les dépôts publics. Mets le jeton dans le secret DEVHUB_TOKEN.',
      code: `# .github/workflows/prevol.yml
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
          token: \${{ secrets.DEVHUB_TOKEN }}
          url: https://monapp.sn      # ton application en ligne
          api-url: ${origin}
          fail-on: fix                # fix | review | never`,
    },
  };

  return (
    <section className="mt-8">
      <h2 className="label-caps mb-1 flex items-center gap-2 [&_svg]:size-4">
        <Plug /> Brancher ton agent IA et ta CI
      </h2>
      <p className="mb-3 text-[13px] text-muted">
        Ton agent lance le pré-vol lui-même, lit le rapport et corrige (serveur MCP). Ta CI contrôle
        le code et refuse une mise en production qui casse quelque chose.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 p-5">
          <div role="tablist" className="mb-3 flex flex-wrap gap-2">
            {AGENT_TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-full px-3 py-1 text-[13px] transition-colors',
                  tab === t ? 'bg-accent-soft text-accent-text' : 'text-muted hover:text-fg',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[13px] text-muted">{snippets[tab].intro}</p>
          <CodeBlock code={snippets[tab].code} />
          {!fresh && (
            <p className="mt-2 text-xs text-subtle">
              Remplace dh_pat_TON_JETON par un jeton créé dans « Jetons d’accès ».
            </p>
          )}
        </Card>

        <Card className="flex min-w-0 flex-col gap-3 p-5">
          <p className="label-caps flex items-center gap-2 [&_svg]:size-4">
            <KeyRound /> Jetons d’accès
          </p>
          <p className="text-xs text-muted">
            Un jeton ne sert qu’au pré-vol, au nom de ton compte, dans la limite de 10 par heure.
          </p>
          <form onSubmit={create} className="flex gap-2">
            <Input
              aria-label="Nom du jeton"
              placeholder="Claude Code, CI…"
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
                Copie-le maintenant : il ne sera plus affiché.
              </p>
              <CodeBlock code={fresh} wrap />
            </div>
          )}
          {!tokens.data ? (
            <Skeleton className="h-10 rounded-[8px]" />
          ) : items.length === 0 ? (
            <p className="text-xs text-subtle">Aucun jeton.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-fg">{t.name}</span>
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
        </Card>
      </div>
    </section>
  );
}

function CodeBlock({ code, wrap = false }: { code: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0 rounded-[8px] border border-line bg-surface-1">
      <div className="flex justify-end border-b border-line px-2 py-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted hover:text-fg [&_svg]:size-3.5"
          onClick={() =>
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            })
          }
        >
          {copied ? <ClipboardCheck /> : <Clipboard />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre
        className={cn(
          'p-3 font-mono text-[11.5px] leading-relaxed text-fg',
          wrap ? 'whitespace-pre-wrap break-all' : 'overflow-x-auto',
        )}
      >
        {code}
      </pre>
    </div>
  );
}

/* ---------------- Page : un rapport ---------------- */

function ReportView({ id }: { id: string }) {
  const { data, error, refresh } = useQuery(`preflight:${id}`, () => preflightApi.get(id));
  const user = useSession((s) => s.user);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [rerunning, setRerunning] = useState(false);

  if (error) {
    return (
      <Page>
        <Card className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="size-6 text-danger" />
          <p className="text-sm text-fg">
            {error instanceof DomainError && error.code === 'not_found'
              ? 'Ce rapport n’existe pas.'
              : preflightError(error)}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => void refresh()}>Réessayer</Button>
            <ButtonLink to="/prevol">Nouveau pré-vol</ButtonLink>
          </div>
        </Card>
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <Skeleton className="mt-6 h-36 rounded-[10px]" />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[10px]" />
          ))}
        </div>
      </Page>
    );
  }

  const verdict = VERDICT[data.verdict];
  const mdUrl = preflightApi.markdownUrl(data.id);
  const absoluteMd = `${window.location.origin}${mdUrl}`;

  async function copyForAi() {
    try {
      const text = await fetch(mdUrl).then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Rapport copié. Colle-le dans ton agent IA.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible. Télécharge le fichier .md à la place.');
    }
  }

  async function rerun() {
    setRerunning(true);
    try {
      const report = await preflightApi.run(data!.url, data!.repo, !!data!.loadTest);
      setQueryData<PreflightReport>(`preflight:${report.id}`, () => report);
      navigate(`/prevol/${report.id}`);
    } catch (err) {
      toast.error(preflightError(err));
    } finally {
      setRerunning(false);
    }
  }

  const groups = (['fail', 'warn', 'info', 'pass'] as const)
    .map((s) => ({ status: s, checks: data.checks.filter((c) => c.status === s) }))
    .filter((g) => g.checks.length);

  return (
    <Page>
      <Link to="/prevol" className="text-[13px] text-muted hover:text-fg">
        ← Pré-vol
      </Link>

      <Card className="mt-3 flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <ScoreRing score={data.score} tone={verdict.tone} />
        <div className="min-w-0 flex-1">
          <Badge tone={verdict.tone}>{verdict.label}</Badge>
          <h1 className="mt-2 truncate text-[22px] font-semibold tracking-tight text-fg">
            {target(data)}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {data.counts.fail} à corriger · {data.counts.warn} à améliorer · {data.counts.pass} OK ·
            par @{data.author.handle} ·{' '}
            {new Date(data.createdAt).toLocaleString('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            · {fmtMs(data.durationMs)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Button
            variant="primary"
            icon={copied ? <ClipboardCheck /> : <Bot />}
            onClick={() => void copyForAi()}
          >
            Copier pour mon IA
          </Button>
          <div className="flex gap-2">
            <a
              href={mdUrl}
              download={`prevol-${data.id.slice(0, 8)}.md`}
              className="lg-clear inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium [&_svg]:size-4"
            >
              <Download /> .md
            </a>
            <Button
              icon={<Link2 />}
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => toast.success('Lien du rapport copié.'))
              }
            >
              Lien
            </Button>
            {user && (
              <Button
                icon={rerunning ? <Spinner /> : <RefreshCw />}
                disabled={rerunning}
                onClick={() => void rerun()}
                aria-label="Relancer le pré-vol"
              />
            )}
          </div>
        </div>
      </Card>

      {data.metrics && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            icon={<Timer />}
            label="Premier affichage en 3G"
            value={`≈ ${fmtMs(data.metrics.estimated3gMs)}`}
            hint="estimation, profil 3G rapide"
          />
          <Metric
            icon={<Weight />}
            label="Poids de la page"
            value={fmtBytes(data.metrics.totalBytes)}
            hint={`${data.metrics.requests} requêtes`}
          />
          <Metric
            icon={<Gauge />}
            label="Réponse du serveur"
            value={fmtMs(data.metrics.ttfbMs)}
            hint={`HTTP ${data.metrics.status}`}
          />
          <Metric
            icon={<Globe />}
            label="Hébergement"
            value={data.metrics.hostedOnSystalink ? 'Systalink' : 'Hors Systalink'}
            hint={data.metrics.hostIps[0] ?? ''}
          />
        </div>
      )}

      {data.lighthouse && <LighthouseCard lh={data.lighthouse} />}
      {data.loadTest && <LoadCard lt={data.loadTest} />}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          {groups.map((g) => (
            <CheckGroup key={g.status} status={g.status} checks={g.checks} />
          ))}
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <Card className="p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
              <Bot className="size-4" /> Faire corriger par ton agent
            </p>
            <p className="mt-1.5 text-xs text-muted">
              Copie le rapport, ou donne directement ce lien à Claude Code, Codex ou Cursor. Il
              contient une consigne, les corrections dans l’ordre et l’identifiant de chaque
              contrôle.
            </p>
            <PromptBox
              text={`Lis ${absoluteMd} et corrige mon projet en suivant la consigne du rapport.`}
            />
          </Card>
          {data.repoSummary && (
            <Card className="p-4 text-[13px]">
              <p className="flex items-center gap-1.5 font-medium text-fg">
                <GitBranch className="size-4" /> Dépôt
              </p>
              <a
                href={`https://github.com/${data.repoSummary.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-blue-text hover:underline"
              >
                github.com/{data.repoSummary.fullName}
              </a>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-muted">Licence</dt>
                <dd className="text-fg">{data.repoSummary.licence ?? 'aucune'}</dd>
                <dt className="text-muted">Dépendances</dt>
                <dd className="tabular text-fg">{data.repoSummary.dependencies}</dd>
                <dt className="text-muted">Avec failles</dt>
                <dd className="tabular text-fg">{data.repoSummary.vulnerablePackages}</dd>
              </dl>
            </Card>
          )}
          <p className="px-1 text-xs text-subtle">
            L’estimation 3G est un calcul ; l’audit Lighthouse est une vraie mesure faite par Google
            PageSpeed Insights. Les failles viennent de la base publique OSV.
          </p>
        </aside>
      </div>
    </Page>
  );
}

/* ---------------- Test de charge : option et preuve de propriété ---------------- */

function LoadTestOption({
  url,
  on,
  onChange,
  disabled,
}: {
  url: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  const valid = /^https:\/\/[^/\s]+\.[^/\s]+/i.test(url);
  const proof = useQuery(on && valid ? `preflight:ownership:${url}` : null, () =>
    preflightApi.ownership(url),
  );
  const [checking, setChecking] = useState(false);
  return (
    <div className="rounded-[12px] border border-line p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-[18px] accent-[var(--accent)]"
        />
        <span>
          <span className="block text-[15px] font-medium text-fg">Ajouter un test de charge</span>
          <span className="block text-[13.5px] text-muted">
            Montée de 2 à 50 visiteurs simultanés, 30 secondes au plus, pour trouver le point où
            l’application cède. Réservé aux domaines dont tu prouves être le propriétaire.
          </span>
        </span>
      </label>
      {on && !valid && (
        <p className="mt-3 text-[13.5px] text-fg">
          Indique d’abord l’adresse https:// de l’application.
        </p>
      )}
      {on && valid && !proof.data && !proof.error && (
        <Skeleton className="mt-3 h-24 rounded-[10px]" />
      )}
      {on && proof.data && (
        <div className="mt-3 flex flex-col gap-3">
          {proof.data.verified ? (
            <p className="flex items-center gap-2 rounded-[10px] bg-success-soft px-3 py-2.5 text-[14px] font-medium text-fg">
              <CheckCircle2 className="size-4 text-success" />
              {proof.data.host} est prouvé : le test de charge est autorisé.
            </p>
          ) : (
            <>
              <p className="text-[14px] text-fg">
                Prouve que tu contrôles <strong>{proof.data.host}</strong> d’une de ces deux façons
                :
              </p>
              <div>
                <p className="text-[13px] font-medium text-fg">
                  1. Publier ce fichier à l’adresse{' '}
                  <span className="font-mono text-[12.5px]">{proof.data.fileUrl}</span>
                </p>
                <CodeBlock code={proof.data.fileContent} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-fg">
                  2. Ou ajouter un enregistrement DNS TXT sur{' '}
                  <span className="font-mono text-[12.5px]">{proof.data.dnsName}</span>
                </p>
                <CodeBlock code={proof.data.dnsValue} />
              </div>
              <div>
                <Button
                  icon={checking ? <Spinner /> : <RefreshCw />}
                  disabled={checking}
                  onClick={async () => {
                    setChecking(true);
                    try {
                      await proof.refresh();
                    } finally {
                      setChecking(false);
                    }
                  }}
                >
                  Vérifier
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {on && !!proof.error && (
        <p className="mt-3 text-[13.5px] text-danger">{preflightError(proof.error)}</p>
      )}
    </div>
  );
}

/* ---------------- Lighthouse et test de charge dans le rapport ---------------- */

const lhTone = (v: number | null) =>
  v === null ? 'warning' : v >= 90 ? 'success' : v >= 50 ? 'warning' : 'danger';

function SmallRing({ label, value }: { label: string; value: number | null }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const color = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  }[lhTone(value)];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid size-[68px] place-items-center">
        <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="var(--color-surface-3)"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(c * (value ?? 0)) / 100} ${c}`}
          />
        </svg>
        <span className="text-[20px] font-semibold tabular text-fg">{value ?? '–'}</span>
      </div>
      <span className="text-center text-[13px] font-medium text-fg">{label}</span>
    </div>
  );
}

function LighthouseCard({ lh }: { lh: PreflightLighthouse }) {
  const lab: [string, string][] = [
    ['Premier contenu', lh.lab.fcpMs !== null ? fmtMs(lh.lab.fcpMs) : '–'],
    ['Contenu principal (LCP)', lh.lab.lcpMs !== null ? fmtMs(lh.lab.lcpMs) : '–'],
    ['Blocage (TBT)', lh.lab.tbtMs !== null ? fmtMs(lh.lab.tbtMs) : '–'],
    ['Stabilité (CLS)', lh.lab.cls !== null ? lh.lab.cls.toFixed(2) : '–'],
  ];
  return (
    <Card className="mt-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold text-fg">Lighthouse mobile</h2>
        <span className="text-[13px] text-muted">Mesuré par Google PageSpeed Insights</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SmallRing label="Performance" value={lh.scores.performance} />
        <SmallRing label="Accessibilité" value={lh.scores.accessibility} />
        <SmallRing label="Bonnes pratiques" value={lh.scores.bestPractices} />
        <SmallRing label="Référencement" value={lh.scores.seo} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
        {lab.map(([k, v]) => (
          <div key={k} className="bg-surface-1 px-3 py-2.5">
            <dt className="text-[12.5px] text-muted">{k}</dt>
            <dd className="text-[16px] font-semibold tabular text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {lh.field && (
        <p className="mt-3 text-[13.5px] text-fg">
          Vrais visiteurs Chrome (28 jours) : contenu principal{' '}
          <strong>{lh.field.lcpMs !== null ? fmtMs(lh.field.lcpMs) : '–'}</strong>, réactivité{' '}
          <strong>{lh.field.inpMs !== null ? fmtMs(lh.field.inpMs) : '–'}</strong>, stabilité{' '}
          <strong>{lh.field.cls !== null ? lh.field.cls.toFixed(2) : '–'}</strong>.
        </p>
      )}
    </Card>
  );
}

/** Courbe du test de charge : débit en barres, p95 en ligne, seuil de 2 s, palier de rupture. */
function LoadCard({ lt }: { lt: PreflightLoadTest }) {
  const W = 960;
  const H = 260;
  const pad = { l: 44, r: 44, t: 16, b: 34 };
  const n = lt.stages.length;
  const slot = (W - pad.l - pad.r) / Math.max(1, n);
  const maxRps = Math.max(1, ...lt.stages.map((s) => s.rps));
  const maxMs = Math.max(2_500, ...lt.stages.map((s) => s.p95Ms));
  const y = (v: number, max: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const x = (i: number) => pad.l + slot * i + slot / 2;
  const line = lt.stages.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s.p95Ms, maxMs)}`).join(' ');
  const verdict =
    lt.breakingConcurrency === null
      ? `Tient ${lt.maxStableConcurrency} visiteurs simultanés`
      : lt.maxStableConcurrency
        ? `Tient ${lt.maxStableConcurrency} visiteurs simultanés, cède à ${lt.breakingConcurrency}`
        : `Cède dès ${lt.breakingConcurrency} visiteurs simultanés`;
  return (
    <Card className="mt-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold text-fg">Test de charge</h2>
        <span className="text-[13px] text-muted">
          {lt.totalRequests} requêtes en {fmtMs(lt.durationMs)} · domaine prouvé par{' '}
          {lt.proof === 'dns' ? 'DNS' : 'fichier .well-known'}
        </span>
      </div>
      <p
        className={cn(
          'mt-1 text-[16px] font-medium',
          lt.breakingConcurrency === null
            ? 'text-success'
            : lt.breakingConcurrency <= 10
              ? 'text-danger'
              : 'text-warning',
        )}
      >
        {verdict}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label={verdict}>
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + (H - pad.t - pad.b) * f}
            y2={pad.t + (H - pad.t - pad.b) * f}
            stroke="var(--color-line)"
          />
        ))}
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={y(2_000, maxMs)}
          y2={y(2_000, maxMs)}
          stroke="var(--color-danger)"
          strokeDasharray="4 4"
        />
        <text x={W - pad.r + 4} y={y(2_000, maxMs) + 4} fontSize="11" fill="var(--color-danger)">
          2 s
        </text>
        {lt.stages.map((s, i) => {
          const broke = s.concurrency === lt.breakingConcurrency;
          const top = y(s.rps, maxRps);
          return (
            <g key={s.concurrency}>
              <rect
                x={x(i) - slot * 0.28}
                y={top}
                width={slot * 0.56}
                height={H - pad.b - top}
                rx="4"
                fill={broke ? 'var(--color-danger)' : 'var(--color-accent)'}
                opacity={broke ? 0.35 : 0.22}
              />
              <text x={x(i)} y={H - 12} fontSize="12" textAnchor="middle" fill="var(--color-fg)">
                {s.concurrency}
              </text>
            </g>
          );
        })}
        <path d={line} fill="none" stroke="var(--color-fg)" strokeWidth="2" />
        {lt.stages.map((s, i) => (
          <circle
            key={s.concurrency}
            cx={x(i)}
            cy={y(s.p95Ms, maxMs)}
            r="4"
            fill={
              s.concurrency === lt.breakingConcurrency ? 'var(--color-danger)' : 'var(--color-fg)'
            }
          />
        ))}
        <text x={pad.l - 6} y={pad.t + 4} fontSize="11" textAnchor="end" fill="var(--color-muted)">
          {fmtMs(maxMs)}
        </text>
        <text x={W - pad.r + 4} y={pad.t + 4} fontSize="11" fill="var(--color-muted)">
          {Math.round(maxRps)}/s
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-fg" /> temps de réponse de 95 % des visiteurs
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-accent/30" /> requêtes par seconde
        </span>
        <span>Axe du bas : visiteurs simultanés</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-muted">
              {['Simultanés', 'Requêtes', 'Req/s', 'Médiane', 'p95', 'p99', 'Erreurs'].map((h) => (
                <th key={h} className="py-2 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lt.stages.map((s) => (
              <tr
                key={s.concurrency}
                className={cn(
                  'border-b border-line/70 tabular text-fg',
                  s.concurrency === lt.breakingConcurrency && 'bg-danger-soft',
                )}
              >
                <td className="py-2 pr-3 font-medium">{s.concurrency}</td>
                <td className="py-2 pr-3">{s.requests}</td>
                <td className="py-2 pr-3">{s.rps}</td>
                <td className="py-2 pr-3">{fmtMs(s.p50Ms)}</td>
                <td className="py-2 pr-3">{fmtMs(s.p95Ms)}</td>
                <td className="py-2 pr-3">{fmtMs(s.p99Ms)}</td>
                <td className="py-2 pr-3">{s.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tabular tracking-tight text-fg">{value}</p>
      <p className="truncate text-xs text-subtle">{hint}</p>
    </Card>
  );
}

function CheckGroup({ status, checks }: { status: keyof typeof STATUS; checks: PreflightCheck[] }) {
  const [open, setOpen] = useState(status !== 'pass');
  const s = STATUS[status];
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <h2 className="label-caps">
          {s.label} ({checks.length})
        </h2>
        <ChevronDown
          className={cn('size-4 text-subtle transition-transform', !open && '-rotate-90')}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2.5">
          {checks.map((c) => (
            <CheckCard key={c.id} check={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function CheckCard({ check }: { check: PreflightCheck }) {
  const s = STATUS[check.status];
  const cat = CATEGORY[check.category];
  const [copied, setCopied] = useState(false);
  const compact = check.status === 'pass';
  return (
    <Card className={cn('p-4', compact && 'py-3')}>
      <div className="flex items-start gap-3">
        <IconChip tone={s.tone}>
          <s.icon />
        </IconChip>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[14px] font-medium text-fg">{check.title}</p>
            <Badge size="sm" tone="outline">
              <cat.icon /> {cat.label}
            </Badge>
          </div>
          {!compact && (
            <p className="mt-1 text-[13px] text-muted">
              <Inline text={check.detail} />
            </p>
          )}
          {!compact && check.evidence.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {check.evidence.map((e) => (
                <li
                  key={e}
                  className="break-all rounded-[6px] bg-surface-2 px-2 py-1 font-mono text-[11.5px] text-fg"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}
          {check.fix && (
            <div className="mt-3 rounded-[8px] border border-line bg-surface-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-fg">Correction</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg [&_svg]:size-3.5"
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(
                        `[${check.id}] ${check.title}\n${check.detail}\n\nCorrection :\n${check.fix}`,
                      )
                      .then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1400);
                      })
                  }
                >
                  {copied ? <ClipboardCheck /> : <Clipboard />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              {check.fix.includes('\n') ? (
                <pre className="mt-2 overflow-x-auto rounded-[6px] bg-surface-2 p-2.5 font-mono text-[11.5px] text-fg">
                  {check.fix}
                </pre>
              ) : (
                <p className="mt-1 text-[13px] text-muted">
                  <Inline text={check.fix} />
                </p>
              )}
            </div>
          )}
          <p className="mt-2 font-mono text-[11px] text-subtle">{check.id}</p>
        </div>
      </div>
    </Card>
  );
}

/** Texte avec des `extraits de code` entre accents graves. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code
            key={i}
            className="rounded-[4px] bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-fg"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function PromptBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-[8px] border border-line bg-surface-1 p-3">
      <p className="break-all font-mono text-[11.5px] text-fg">{text}</p>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg [&_svg]:size-3.5"
        onClick={() =>
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          })
        }
      >
        {copied ? <ClipboardCheck /> : <Clipboard />}
        {copied ? 'Copié' : 'Copier la consigne'}
      </button>
    </div>
  );
}
