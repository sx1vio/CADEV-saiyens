import type {
  ListPreflightResponse,
  PreflightCheck,
  PreflightReport,
  PreflightVerdict,
} from '@devhub/contracts';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Download,
  Gauge,
  GitBranch,
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
import { Link, useNavigate, useParams } from 'react-router';
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

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
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
  return (await res.json()) as T;
}

const preflightApi = {
  run: (url: string | null, repo: string | null) =>
    call<PreflightReport>('POST', '/preflight', { url, repo }),
  get: (id: string) => call<PreflightReport>('GET', `/preflight/${id}`),
  mine: () => call<ListPreflightResponse>('GET', '/preflight'),
  markdownUrl: (id: string) => `/api/v1/preflight/${id}/report.md`,
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
  const [url, setUrl] = useState('');
  const [repo, setRepo] = useState('');
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
    setRunning(true);
    try {
      const report = await preflightApi.run(normalized || null, r || null);
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
                  Analyse du site, de ses fichiers et du dépôt : jusqu’à 45 secondes.
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <p className="label-caps">Ce qui est vérifié</p>
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
              [Scale, 'Licences', 'licence du dépôt, dépendances GPL ou AGPL'],
              [Server, 'Hébergement', 'en Afrique chez Systalink ou non'],
            ] as const
          ).map(([Icon, title, text]) => (
            <div key={title} className="flex gap-3">
              <IconChip tone="blue">
                <Icon />
              </IconChip>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-fg">{title}</p>
                <p className="text-xs text-muted">{text}</p>
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
    </Page>
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
      const report = await preflightApi.run(data!.url, data!.repo);
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
            L’estimation 3G est un calcul, pas une mesure sur un vrai téléphone. Les failles
            viennent de la base publique OSV.
          </p>
        </aside>
      </div>
    </Page>
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
