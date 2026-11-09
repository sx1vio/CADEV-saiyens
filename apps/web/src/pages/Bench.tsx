import {
  BENCH_DEVICES,
  BENCH_NETWORKS,
  type BenchDetail,
  type BenchDevice,
  type BenchFinding,
  type BenchItem,
  type BenchNetwork,
  type BenchReportView,
  type BenchSeverity,
  type BenchVerdict,
} from '@devhub/contracts';
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  GitBranch,
  Lock,
  Plus,
  Rocket,
  Smartphone,
  Trash2,
  XCircle,
  Server,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/domain';
import { DeployToSystalink } from '@/components/systalink';
import { Button, ButtonLink, Spinner } from '@/components/ui/button';
import { Avatar, Badge, Card, Field, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { invalidate, useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { benchApi, benchMarkdown, DEVICE_LABEL, NETWORK_LABEL } from '@/platform/bench';
import { Ago, Chips } from '@/platform/ui';
import { useSession } from '@/stores/app';
import { Page } from './_layout';

/* ---------------- Client de l'API ---------------- */

const DEVICE_SHORT: Record<BenchDevice, string> = {
  android_low: 'Android 1er prix',
  android: 'Android',
  iphone: 'iPhone',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
};
const VERDICT: Record<BenchVerdict, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  works: { label: 'Tout marche', tone: 'success' },
  issues: { label: 'Des problèmes', tone: 'warning' },
  broken: { label: 'Inutilisable', tone: 'danger' },
};
const SEVERITY: Record<BenchSeverity, { label: string; tone: 'danger' | 'warning' | 'neutral' }> = {
  blocking: { label: 'Bloquant', tone: 'danger' },
  major: { label: 'Important', tone: 'warning' },
  minor: { label: 'Mineur', tone: 'neutral' },
};

const ERRORS: Record<string, string> = {
  'bench.own_request': 'Tu ne peux pas tester ta propre application.',
  'bench.closed': 'Cette demande est fermée.',
  'bench.full': 'Toutes les places de testeur sont prises.',
  'bench.already_reported': 'Tu as déjà rendu un rapport sur cette demande.',
  'bench.device_not_requested': 'Cet appareil ne fait pas partie de ceux demandés.',
  'bench.network_not_requested': 'Ce réseau ne fait pas partie de ceux demandés.',
  'bench.not_requester': 'Seul l’auteur de la demande peut juger un rapport.',
  'bench.already_reviewed': 'Ce rapport a déjà été jugé.',
  'bench.open_limit': 'Tu as déjà 3 demandes ouvertes : ferme-en une d’abord.',
  'bench.daily_limit': 'Tu as rendu 10 rapports en 24 h : reviens demain.',
  'bench.account_too_new': 'Ton compte doit avoir au moins une heure pour publier une demande.',
  'network.offline': 'Pas de connexion : réessaie quand le réseau revient.',
  'http.400': 'Un champ n’est pas valide : vérifie l’adresse (https://) et les textes.',
  'http.401': 'Connecte-toi pour continuer.',
};
const errorMessage = (e: unknown) =>
  ERRORS[(e as { code?: string })?.code ?? ''] ?? 'Une erreur est survenue, réessaie.';

const host = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/* ---------------- Page ---------------- */

export default function Bench() {
  const { id } = useParams();
  if (id === 'nouvelle') return <NewRequest />;
  return id ? <Detail id={id} /> : <List />;
}

type Scope = 'open' | 'mine' | 'tested';

function List() {
  const user = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const scope = (params.get('vue') as Scope) || 'open';
  const device = params.get('appareil') as BenchDevice | null;
  const network = params.get('reseau') as BenchNetwork | null;
  const systalink = params.get('systalink') === '1';
  const q = new URLSearchParams();
  if (scope !== 'open') q.set('scope', scope);
  if (device) q.set('device', device);
  if (network) q.set('network', network);
  if (systalink) q.set('systalink', 'true');
  const { data, error } = useQuery(`bench:list:${q.toString()}`, () => benchApi.list(q));
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <Page wide>
      <PageHeader
        eyebrow="Livrer"
        title="Banc d’essai"
        subtitle="Ton app marche sur ton ordinateur et ta fibre. Et sur un Android à 60 000 F en 3G, dans un taxi ? Demande à d’autres devs de la tester sur leurs vrais appareils. Chaque rapport confirmé leur rapporte des Proof XP."
        actions={
          user ? (
            <ButtonLink to="/banc/nouvelle" variant="primary" size="lg" icon={<Plus />}>
              Demander un test
            </ButtonLink>
          ) : (
            <ButtonLink
              to="/connexion?next=%2Fbanc%2Fnouvelle"
              variant="primary"
              size="lg"
              icon={<Plus />}
            >
              Se connecter pour demander
            </ButtonLink>
          )
        }
      />

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat value={data?.stats.open} label="demandes ouvertes" />
        <Stat value={data?.stats.reports} label="rapports rendus" />
        <Stat value={data?.stats.confirmed} label="rapports confirmés" />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Chips
          value={scope}
          onChange={(v) => set('vue', v === 'open' ? null : v)}
          items={[
            { id: 'open', label: 'À tester' },
            ...(user
              ? ([
                  { id: 'mine', label: 'Mes demandes' },
                  { id: 'tested', label: 'Mes tests' },
                ] as const)
              : []),
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Appareil"
            value={device}
            options={BENCH_DEVICES.map((d) => [d, DEVICE_LABEL[d]])}
            onChange={(v) => set('appareil', v)}
          />
          <FilterSelect
            label="Réseau"
            value={network}
            options={BENCH_NETWORKS.map((n) => [n, NETWORK_LABEL[n]])}
            onChange={(v) => set('reseau', v)}
          />
          <button
            type="button"
            aria-pressed={systalink}
            onClick={() => set('systalink', systalink ? null : '1')}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium [&_svg]:size-4',
              systalink ? 'lg-tint' : 'lg-clear text-fg',
            )}
          >
            <Server /> Hébergées chez Systalink
          </button>
        </div>
      </div>

      <div className="mt-5">
        {error ? (
          <p className="rounded-[10px] bg-danger-soft p-4 text-[14px] text-danger">
            {errorMessage(error)}
          </p>
        ) : !data ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-[14px]" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <Empty scope={scope} filtered={Boolean(device || network || systalink)} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.data.map((b) => (
              <RequestCard key={b.id} item={b} />
            ))}
          </div>
        )}
      </div>

      <HowItWorks />
    </Page>
  );
}

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <Card className="px-3 py-3 sm:px-5 sm:py-4">
      <p className="text-[22px] leading-none font-bold tabular text-fg sm:text-[28px]">
        {value === undefined ? '…' : value}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-muted sm:text-[14px]">{label}</p>
    </Card>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: Array<[T, string]>;
  onChange: (v: T | null) => void;
}) {
  return (
    <label className="lg-clear inline-flex h-9 items-center gap-2 rounded-full pr-2 pl-4 text-[13px] font-medium text-fg">
      {label}
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        className="h-7 rounded-full bg-transparent pr-1 text-[13px] font-semibold text-fg outline-none"
      >
        <option value="">Tous</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Empty({ scope, filtered }: { scope: Scope; filtered: boolean }) {
  const text =
    scope === 'mine'
      ? 'Tu n’as encore demandé aucun test. Publie ta première demande : quelques minutes suffisent.'
      : scope === 'tested'
        ? 'Tu n’as encore testé aucune application. Choisis une demande dans « À tester ».'
        : filtered
          ? 'Aucune demande ouverte pour ce filtre.'
          : 'Aucune demande ouverte pour l’instant. Sois le premier à faire tester ton app.';
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Smartphone className="size-8 text-muted" />
      <p className="max-w-md text-[15px] text-fg">{text}</p>
      {scope !== 'tested' && (
        <ButtonLink to="/banc/nouvelle" variant="primary" icon={<Plus />}>
          Demander un test
        </ButtonLink>
      )}
    </Card>
  );
}

function RequestCard({ item }: { item: BenchItem }) {
  const full = item.testers >= item.maxTesters;
  return (
    <Link
      to={`/banc/${item.id}`}
      className="surface-card group flex min-w-0 flex-col gap-3 p-5 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={item.author.displayName} src={item.author.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] leading-snug font-semibold text-fg group-hover:underline">
            {item.title}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {item.author.displayName} · {host(item.appUrl)} · <Ago iso={item.createdAt} />
          </p>
        </div>
        {item.status === 'closed' ? (
          <Badge tone="neutral">Fermée</Badge>
        ) : item.reported ? (
          <Badge tone="success">Testée</Badge>
        ) : full ? (
          <Badge tone="warning">Complète</Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.hostedOnSystalink && (
          <Badge tone="mint">
            <Server /> Systalink
          </Badge>
        )}
        {item.devices.map((d) => (
          <Badge key={d} tone="blue">
            {DEVICE_SHORT[d]}
          </Badge>
        ))}
        {item.networks.map((n) => (
          <Badge key={n} tone="outline">
            {NETWORK_LABEL[n]}
          </Badge>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent-strong"
            style={{ width: `${Math.min(100, (item.testers / item.maxTesters) * 100)}%` }}
          />
        </div>
        <span className="text-[13px] font-medium tabular text-fg">
          {item.testers}/{item.maxTesters} testeurs
        </span>
      </div>
    </Link>
  );
}

function HowItWorks() {
  return (
    <section className="mt-10">
      <h2 className="text-[18px] font-semibold text-fg">Comment ça marche</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {[
          [
            'Tu publies ta demande',
            'L’adresse de ton app, ce qu’il faut tester, les appareils et les réseaux visés (Android d’entrée de gamme, 3G, hors ligne…).',
          ],
          [
            'Des devs testent en vrai',
            'Chacun rend un rapport : son modèle de téléphone, son réseau, un verdict et les problèmes trouvés, avec les étapes pour les reproduire.',
          ],
          [
            'Tu confirmes, ils gagnent',
            'Un rapport utile confirmé rapporte 8 Proof XP au testeur. Tu copies les problèmes en un clic pour ton agent IA, qui corrige.',
          ],
        ].map(([title, text], i) => (
          <li key={title} className="surface-card flex gap-3 p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-text tabular">
              {i + 1}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-fg">{title}</p>
              <p className="mt-1 text-[14px] text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
        <Lock className="size-3.5" />
        Les rapports ne sont visibles que par l’auteur de la demande et le testeur : ils peuvent
        décrire une faille.
      </p>
    </section>
  );
}

/* ---------------- Nouvelle demande ---------------- */

function Toggle<T extends string>({
  values,
  selected,
  label,
  onChange,
}: {
  values: readonly T[];
  selected: T[];
  label: (v: T) => string;
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== v) : [...selected, v])}
            className={cn(
              'h-9 rounded-full px-4 text-[13px] font-medium transition-colors',
              on ? 'lg-tint' : 'lg-clear text-fg',
            )}
          >
            {label(v)}
          </button>
        );
      })}
    </div>
  );
}

function NewRequest() {
  const user = useSession((s) => s.user);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [devices, setDevices] = useState<BenchDevice[]>(['android_low']);
  const [networks, setNetworks] = useState<BenchNetwork[]>(['3g']);
  const [maxTesters, setMaxTesters] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Page>
        <Card className="p-6 text-center">
          <h1 className="text-[15px] font-normal text-fg">Connecte-toi pour demander un test.</h1>
          <ButtonLink to="/connexion?next=%2Fbanc%2Fnouvelle" variant="primary" className="mt-4">
            Se connecter
          </ButtonLink>
        </Card>
      </Page>
    );
  }

  const withScheme = (u: string) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 8) return setError('Donne un titre d’au moins 8 caractères.');
    if (instructions.trim().length < 20)
      return setError('Décris ce qu’il faut tester (au moins 20 caractères).');
    if (devices.length === 0 || networks.length === 0)
      return setError('Choisis au moins un appareil et un réseau.');
    setBusy(true);
    try {
      const { id } = await benchApi.create({
        title: title.trim(),
        appUrl: withScheme(appUrl.trim()),
        repoUrl: repoUrl.trim() ? withScheme(repoUrl.trim()) : null,
        instructions: instructions.trim(),
        devices,
        networks,
        maxTesters,
      });
      invalidate('bench:');
      toast.success('Demande publiée : les testeurs peuvent commencer.');
      navigate(`/banc/${id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Link
        to="/banc"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Banc d’essai
      </Link>
      <PageHeader className="mt-3" title="Demander un test" />
      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field
            label="Titre"
            htmlFor="b-title"
            hint="Exemple : « Boutique Paylink : paiement Wave »"
          >
            <Input
              id="b-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Adresse de l’app en ligne" htmlFor="b-url" hint="Publique, en HTTPS.">
              <Input
                id="b-url"
                inputMode="url"
                placeholder="https://"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
              />
            </Field>
            <Field label="Dépôt" htmlFor="b-repo" optional="facultatif">
              <Input
                id="b-repo"
                inputMode="url"
                placeholder="https://github.com/…"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Ce qu’il faut tester"
            htmlFor="b-instr"
            hint="Les parcours à suivre, un compte de test si besoin, ce qui t’inquiète. Ne mets jamais de vrai mot de passe."
          >
            <Textarea
              id="b-instr"
              rows={6}
              maxLength={4000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                '1. Ouvrir l’accueil et créer un compte\n2. Ajouter un article au panier\n3. Payer avec Wave (mode test)\nCe qui m’inquiète : le chargement en 3G et le hors ligne.'
              }
            />
          </Field>
          <Field label="Appareils visés">
            <Toggle
              values={BENCH_DEVICES}
              selected={devices}
              label={(d) => DEVICE_LABEL[d]}
              onChange={setDevices}
            />
          </Field>
          <Field label="Réseaux visés">
            <Toggle
              values={BENCH_NETWORKS}
              selected={networks}
              label={(n) => NETWORK_LABEL[n]}
              onChange={setNetworks}
            />
          </Field>
          <Field
            label="Nombre de testeurs"
            htmlFor="b-max"
            hint="Chaque rapport confirmé rapporte 8 Proof XP au testeur. Un rapport refusé libère sa place."
          >
            <Input
              id="b-max"
              type="number"
              min={1}
              max={20}
              value={maxTesters}
              onChange={(e) => setMaxTesters(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-28"
            />
          </Field>
          {error && (
            <p
              role="alert"
              className="rounded-[8px] bg-danger-soft px-3 py-2 text-[14px] text-danger"
            >
              {error}
            </p>
          )}
          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={busy}
              icon={busy ? <Spinner /> : <Rocket />}
            >
              Publier la demande
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}

/* ---------------- Détail ---------------- */

function Detail({ id }: { id: string }) {
  const user = useSession((s) => s.user);
  const { data, error, refresh } = useQuery(`bench:${id}`, () => benchApi.detail(id));

  if (error) {
    return (
      <Page>
        <Card className="p-6 text-center">
          <p className="text-[15px] text-fg">
            {(error as { code?: string }).code === 'http.404' ||
            (error as { code?: string }).code === 'not_found'
              ? 'Cette demande n’existe pas ou a été retirée.'
              : errorMessage(error)}
          </p>
          <ButtonLink to="/banc" className="mt-4">
            Retour au Banc d’essai
          </ButtonLink>
        </Card>
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <Skeleton className="h-10 w-2/3 rounded-[10px]" />
        <Skeleton className="mt-6 h-64 rounded-[14px]" />
      </Page>
    );
  }

  const reload = () => {
    invalidate('bench:');
    void refresh();
  };
  const canReport =
    !!user &&
    !data.mine &&
    !data.reported &&
    data.status === 'open' &&
    data.testers < data.maxTesters;

  return (
    <Page>
      <Link
        to="/banc"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Banc d’essai
      </Link>
      <PageHeader
        className="mt-3"
        title={data.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/u/${data.author.handle}`} className="font-medium text-fg hover:underline">
              {data.author.displayName}
            </Link>
            · <Ago iso={data.createdAt} /> ·{' '}
            {data.status === 'closed' ? 'fermée' : `${data.testers}/${data.maxTesters} testeurs`}
            {data.hostedOnSystalink && (
              <Badge tone="mint">
                <Server /> Hébergée chez Systalink
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            <a
              href={data.appUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="lg-tint inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold"
            >
              <ExternalLink className="size-4" /> Ouvrir l’app
            </a>
            {data.repoUrl && (
              <a
                href={data.repoUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="lg-clear inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold"
              >
                <GitBranch className="size-4" /> Dépôt
              </a>
            )}
          </>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-[16px] font-semibold text-fg">Ce qu’il faut tester</h2>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-fg">
              {data.instructions}
            </p>
          </Card>

          {data.mine && <OwnerReports detail={data} onChange={reload} />}
          {!data.mine && data.reports.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[16px] font-semibold text-fg">Mon rapport</h2>
              {data.reports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </section>
          )}
          {canReport && <ReportForm detail={data} onDone={reload} />}
          {!user && data.status === 'open' && (
            <Card className="p-5">
              <p className="text-[15px] text-fg">
                Connecte-toi pour tester cette app et gagner 8 Proof XP par rapport confirmé.
              </p>
              <ButtonLink
                to={`/connexion?next=${encodeURIComponent(`/banc/${data.id}`)}`}
                variant="primary"
                className="mt-3"
              >
                Se connecter
              </ButtonLink>
            </Card>
          )}
          {user && !data.mine && !data.reported && !canReport && (
            <Card className="p-5 text-[15px] text-fg">
              {data.status === 'closed'
                ? 'Cette demande est fermée : elle ne reçoit plus de rapports.'
                : 'Toutes les places de testeur sont prises pour le moment.'}
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Coverage detail={data} />
          {data.mine && (
            <Card className="flex flex-col gap-2 p-5">
              <p className="text-[15px] font-semibold text-fg">Ma demande</p>
              <ButtonLink
                to={`/prevol?url=${encodeURIComponent(data.appUrl)}`}
                icon={<Rocket />}
                className="justify-start"
              >
                Lancer un pré-vol sur l’app
              </ButtonLink>
              <OpenToggle detail={data} onChange={reload} />
            </Card>
          )}
          {data.mine && !data.hostedOnSystalink && (
            <Card className="flex flex-col gap-2 p-5">
              <p className="text-[15px] font-semibold text-fg">Héberger à Dakar</p>
              <p className="text-[13px] text-muted">
                Un serveur Systalink à Dakar rapproche ton app de ses utilisateurs en Afrique de
                l’Ouest. Le pré-vol te dit ensuite quelle taille prendre.
              </p>
              <DeployToSystalink from="bench" to="server" className="justify-start" />
            </Card>
          )}
        </aside>
      </div>
    </Page>
  );
}

function OpenToggle({ detail, onChange }: { detail: BenchDetail; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const open = detail.status === 'open';
  return (
    <Button
      variant={open ? 'ghost' : 'secondary'}
      disabled={busy}
      icon={busy ? <Spinner /> : open ? <XCircle /> : <CheckCircle2 />}
      className="justify-start"
      onClick={async () => {
        setBusy(true);
        try {
          await benchApi.setOpen(detail.id, !open);
          toast.success(open ? 'Demande fermée.' : 'Demande rouverte.');
          onChange();
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {open ? 'Fermer la demande' : 'Rouvrir la demande'}
    </Button>
  );
}

/** Matrice appareils × réseaux : ce qui a été couvert, avec le pire verdict reçu. */
function Coverage({ detail }: { detail: BenchDetail }) {
  const cell = (d: BenchDevice, n: BenchNetwork) =>
    detail.coverage.find((c) => c.device === d && c.network === n);
  const tone: Record<BenchVerdict, string> = {
    works: 'bg-success text-canvas',
    issues: 'bg-warning text-canvas',
    broken: 'bg-danger text-canvas',
  };
  return (
    <Card className="p-5">
      <p className="text-[15px] font-semibold text-fg">Couverture</p>
      <p className="mt-0.5 text-[13px] text-muted">Appareils et réseaux déjà testés.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-[12px]">
          <thead>
            <tr>
              <th className="sr-only">Appareil</th>
              {detail.networks.map((n) => (
                <th key={n} scope="col" className="px-1 pb-1 font-semibold text-muted">
                  {NETWORK_LABEL[n]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.devices.map((d) => (
              <tr key={d}>
                <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap text-fg">
                  {DEVICE_SHORT[d]}
                </th>
                {detail.networks.map((n) => {
                  const c = cell(d, n);
                  return (
                    <td
                      key={n}
                      title={
                        c
                          ? `${c.reports} rapport(s) : ${VERDICT[c.worst].label}`
                          : 'Pas encore testé'
                      }
                      className={cn(
                        'h-9 min-w-10 rounded-[8px] text-center font-semibold tabular',
                        c ? tone[c.worst] : 'bg-surface-3 text-muted',
                      )}
                    >
                      {c ? c.reports : '–'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
        {(Object.keys(VERDICT) as BenchVerdict[]).map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-[3px]', tone[v])} />
            {VERDICT[v].label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function ReportCard({ report, actions }: { report: BenchReportView; actions?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <Avatar name={report.tester.displayName} src={report.tester.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-fg">
            <Link to={`/u/${report.tester.handle}`} className="hover:underline">
              {report.tester.displayName}
            </Link>
          </p>
          <p className="text-[13px] text-muted">
            {report.model} · {report.os} · {report.browser} · {NETWORK_LABEL[report.network]}
            {report.country ? ` · ${report.country}` : ''} · <Ago iso={report.createdAt} />
          </p>
        </div>
        <Badge tone={VERDICT[report.verdict].tone}>{VERDICT[report.verdict].label}</Badge>
      </div>
      {report.findings.length > 0 && (
        <ul className="flex flex-col gap-2">
          {report.findings.map((f, i) => (
            <li key={i} className="rounded-[10px] bg-surface-2 p-3">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-fg">
                <Badge tone={SEVERITY[f.severity].tone} size="sm">
                  {SEVERITY[f.severity].label}
                </Badge>
                {f.title}
              </p>
              {f.details && (
                <p className="mt-1 text-[14px] whitespace-pre-wrap text-fg">{f.details}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {report.notes && <p className="text-[14px] whitespace-pre-wrap text-fg">{report.notes}</p>}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {report.status === 'confirmed' ? (
          <Badge tone="success">
            Confirmé{report.points ? ` · +${report.points} Proof XP` : ''}
          </Badge>
        ) : report.status === 'rejected' ? (
          <Badge tone="neutral">Refusé</Badge>
        ) : (
          <Badge tone="outline">En attente de l’auteur</Badge>
        )}
        <div className="ml-auto flex gap-2">{actions}</div>
      </div>
    </Card>
  );
}

function OwnerReports({ detail, onChange }: { detail: BenchDetail; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const findings = detail.reports
    .filter((r) => r.status !== 'rejected')
    .reduce((s, r) => s + r.findings.length, 0);

  async function review(r: BenchReportView, decision: 'confirm' | 'reject') {
    setBusy(r.id);
    try {
      const res = await benchApi.review(r.id, decision);
      toast.success(
        decision === 'confirm'
          ? res.points
            ? `Rapport confirmé : +${res.points} Proof XP pour ${r.tester.displayName}.`
            : 'Rapport confirmé (plafond de Proof XP du jour atteint pour ce testeur).'
          : 'Rapport refusé : sa place est libérée.',
      );
      onChange();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-[16px] font-semibold text-fg">
          Rapports reçus · {detail.reports.length}
        </h2>
        {findings > 0 && (
          <Button
            size="sm"
            icon={<Clipboard />}
            onClick={() => {
              void navigator.clipboard
                .writeText(benchMarkdown(detail))
                .then(() => toast.success('Copié : colle-le dans ton agent IA.'))
                .catch(() => toast.error('Copie impossible dans ce navigateur.'));
            }}
          >
            Copier pour mon agent IA
          </Button>
        )}
      </div>
      {detail.reports.length === 0 ? (
        <Card className="p-5 text-[15px] text-fg">
          Pas encore de rapport. Partage le lien de cette page à des devs qui ont les appareils
          visés.
        </Card>
      ) : (
        detail.reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            actions={
              r.status === 'submitted' ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === r.id}
                    icon={<XCircle />}
                    onClick={() => review(r, 'reject')}
                  >
                    Refuser
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy === r.id}
                    icon={busy === r.id ? <Spinner /> : <CheckCircle2 />}
                    onClick={() => review(r, 'confirm')}
                  >
                    Confirmer (+8 XP)
                  </Button>
                </>
              ) : null
            }
          />
        ))
      )}
    </section>
  );
}

/* ---------------- Rapport de test ---------------- */

function ReportForm({ detail, onDone }: { detail: BenchDetail; onDone: () => void }) {
  const [device, setDevice] = useState<BenchDevice>(detail.devices[0]!);
  const [network, setNetwork] = useState<BenchNetwork>(detail.networks[0]!);
  const [model, setModel] = useState('');
  const [os, setOs] = useState('');
  const [browser, setBrowser] = useState('');
  const [country, setCountry] = useState('');
  const [verdict, setVerdict] = useState<BenchVerdict>('works');
  const [findings, setFindings] = useState<BenchFinding[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<BenchFinding>) =>
    setFindings((all) => all.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (model.trim().length < 2 || os.trim().length < 2 || browser.trim().length < 2)
      return setError('Indique le modèle, le système et le navigateur utilisés.');
    if (verdict !== 'works' && findings.length === 0)
      return setError('Décris au moins un problème trouvé.');
    if (findings.some((f) => f.title.trim().length < 3))
      return setError('Chaque problème a besoin d’un titre (3 caractères au moins).');
    if (country && !/^[A-Za-z]{2}$/.test(country.trim()))
      return setError('Le pays s’écrit en deux lettres : BJ, SN, CI, CM…');
    setBusy(true);
    try {
      await benchApi.report(detail.id, {
        device,
        network,
        model: model.trim(),
        os: os.trim(),
        browser: browser.trim(),
        country: country.trim() ? country.trim().toUpperCase() : null,
        verdict,
        findings: findings.map((f) => ({ ...f, title: f.title.trim(), details: f.details.trim() })),
        notes: notes.trim(),
      });
      toast.success('Rapport envoyé. Tu gagnes 8 Proof XP quand l’auteur le confirme.');
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[18px] font-semibold text-fg">Rendre mon rapport</h2>
      <p className="mt-1 text-[14px] text-muted">
        Ouvre l’app sur ton appareil, suis les étapes demandées, puis décris ce que tu as vu.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Appareil" htmlFor="r-device">
            <select
              id="r-device"
              value={device}
              onChange={(e) => setDevice(e.target.value as BenchDevice)}
              className="lg-clear h-10 rounded-[10px] px-3 text-[14px] text-fg"
            >
              {detail.devices.map((d) => (
                <option key={d} value={d}>
                  {DEVICE_LABEL[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Réseau" htmlFor="r-net">
            <select
              id="r-net"
              value={network}
              onChange={(e) => setNetwork(e.target.value as BenchNetwork)}
              className="lg-clear h-10 rounded-[10px] px-3 text-[14px] text-fg"
            >
              {detail.networks.map((n) => (
                <option key={n} value={n}>
                  {NETWORK_LABEL[n]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modèle exact" htmlFor="r-model" hint="Exemple : Tecno Spark 10, iPhone 11">
            <Input
              id="r-model"
              maxLength={80}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </Field>
          <Field label="Système" htmlFor="r-os" hint="Exemple : Android 13, iOS 18">
            <Input id="r-os" maxLength={40} value={os} onChange={(e) => setOs(e.target.value)} />
          </Field>
          <Field label="Navigateur" htmlFor="r-browser" hint="Exemple : Chrome 131, Opera Mini">
            <Input
              id="r-browser"
              maxLength={40}
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
            />
          </Field>
          <Field
            label="Pays"
            htmlFor="r-country"
            optional="facultatif"
            hint="Deux lettres : BJ, SN…"
          >
            <Input
              id="r-country"
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-24 uppercase"
            />
          </Field>
        </div>

        <Field label="Verdict">
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(Object.keys(VERDICT) as BenchVerdict[]).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={verdict === v}
                onClick={() => {
                  setVerdict(v);
                  if (v !== 'works' && findings.length === 0)
                    setFindings([
                      { severity: v === 'broken' ? 'blocking' : 'major', title: '', details: '' },
                    ]);
                }}
                className={cn(
                  'h-9 rounded-full px-4 text-[13px] font-medium',
                  verdict === v ? 'lg-tint' : 'lg-clear text-fg',
                )}
              >
                {VERDICT[v].label}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-fg">Problèmes trouvés</p>
          {findings.map((f, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[12px] bg-surface-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Gravité"
                  value={f.severity}
                  onChange={(e) => update(i, { severity: e.target.value as BenchSeverity })}
                  className="lg-clear h-9 rounded-full px-3 text-[13px] font-medium text-fg"
                >
                  {(Object.keys(SEVERITY) as BenchSeverity[]).map((s) => (
                    <option key={s} value={s}>
                      {SEVERITY[s].label}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="Titre du problème"
                  placeholder="Le bouton Payer ne répond pas"
                  maxLength={160}
                  value={f.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  className="min-w-0 flex-1"
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Retirer ce problème"
                  icon={<Trash2 />}
                  onClick={() => setFindings((all) => all.filter((_, j) => j !== i))}
                />
              </div>
              <Textarea
                aria-label="Étapes pour reproduire"
                rows={3}
                maxLength={2000}
                placeholder={'Étapes pour reproduire, ce qui était attendu, ce qui s’est passé.'}
                value={f.details}
                onChange={(e) => update(i, { details: e.target.value })}
              />
            </div>
          ))}
          {findings.length < 20 && (
            <div>
              <Button
                size="sm"
                icon={<Plus />}
                onClick={() =>
                  setFindings((all) => [...all, { severity: 'major', title: '', details: '' }])
                }
              >
                Ajouter un problème
              </Button>
            </div>
          )}
        </div>

        <Field label="Remarques" htmlFor="r-notes" optional="facultatif">
          <Textarea
            id="r-notes"
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Temps de chargement ressenti, conditions du test, idées d’amélioration…"
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-[8px] bg-danger-soft px-3 py-2 text-[14px] text-danger"
          >
            {error}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={busy}
            icon={busy ? <Spinner /> : <CheckCircle2 />}
          >
            Envoyer mon rapport
          </Button>
        </div>
      </form>
    </Card>
  );
}
