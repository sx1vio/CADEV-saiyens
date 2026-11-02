import {
  Award,
  BadgeCheck,
  Bookmark,
  Clock,
  ExternalLink,
  GraduationCap,
  Search,
  Share2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ButtonLink } from '@/components/ui/button';
import { CHECKED_AT, LEVEL_LABEL, MARKET_CERTS, PLATFORM_CERTS } from '@/platform/data/certs';
import { COURSE_META } from '@/platform/data/courses/meta';
import { usePlatform } from '@/platform/store';
import type { CertLevel, MarketCert, PlatformCert } from '@/platform/types';
import { CertBadge, Chips, SERVICE_COLORS, ServiceHeader } from '@/platform/ui';
import { LiveBoard } from '@/platform/LiveBoard';
import { ProviderMark } from '@/platform/logos';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/app';

type View = 'gratuites' | 'payantes' | 'base' | 'direct' | 'mes-badges';

const LEVEL_TONE: Record<CertLevel, string> = {
  debutant: 'bg-success-soft text-success',
  intermediaire: 'bg-[rgba(79,124,255,0.15)] text-blue-text',
  avance: 'bg-warning-soft text-warning',
  expert: 'bg-danger-soft text-danger',
};

export function LevelPill({ level }: { level: CertLevel }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-semibold',
        LEVEL_TONE[level],
      )}
    >
      {LEVEL_LABEL[level]}
    </span>
  );
}

export default function Certifications() {
  const [params, setParams] = useSearchParams();
  const view = (params.get('vue') as View) || 'gratuites';
  const results = usePlatform((s) => s.certResults);
  const passed = PLATFORM_CERTS.filter((c) => results[c.id]?.passed);
  return (
    <div className="dh-page mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Award}
        color={SERVICE_COLORS.certs}
        title="Certifications"
        subtitle="Passe gratuitement les certifications DevHub, prépare celles des éditeurs, et retrouve-les toutes dans une seule base."
      >
        <Chips
          value={view}
          onChange={(v) => setParams(v === 'gratuites' ? {} : { vue: v }, { replace: true })}
          items={[
            { id: 'gratuites', label: 'Gratuites' },
            { id: 'payantes', label: 'Payantes' },
            { id: 'base', label: 'Base de données' },
            { id: 'direct', label: 'En direct' },
            { id: 'mes-badges', label: `Mes badges${passed.length ? ` · ${passed.length}` : ''}` },
          ]}
        />
      </ServiceHeader>
      <div className="mt-6">
        {view === 'gratuites' && <FreeView />}
        {view === 'payantes' && <PaidView />}
        {view === 'base' && <Database />}
        {view === 'direct' && (
          <LiveBoard kind="cert" title="Catalogue officiel Microsoft Learn, mis à jour en direct" />
        )}
        {view === 'mes-badges' && <MyBadges certs={passed} />}
      </div>
    </div>
  );
}

function FreeView() {
  const results = usePlatform((s) => s.certResults);
  return (
    <>
      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: GraduationCap,
            title: 'Prépare-toi',
            text: 'Chaque certification a un parcours gratuit dans Apprendre, avec cours, exercices et quiz.',
          },
          {
            icon: Clock,
            title: 'Passe l’examen en ligne',
            text: '20 questions tirées dans une banque, 25 à 30 minutes chronométrées, 75 % pour réussir. Score détaillé par thème.',
          },
          {
            icon: BadgeCheck,
            title: 'Montre ton badge',
            text: 'Le badge apparaît sur ton Passport avec un code de vérification unique.',
          },
        ].map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-[10px] bg-surface-1 p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-[12px] font-semibold text-muted tabular">
              {i + 1}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-fg">
                <s.icon className="size-4 text-subtle" />
                {s.title}
              </p>
              <p className="mt-1 text-[13px] text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <h2 className="text-[16px] font-semibold text-fg">Certifications DevHub</h2>
      <p className="mt-0.5 text-[14px] text-muted">
        Gratuites, en ligne, chronométrées. En cas d’échec, nouvelle tentative une heure plus tard.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_CERTS.map((c) => (
          <PlatformCertCard
            key={c.id}
            cert={c}
            result={results[c.id]?.score}
            passed={results[c.id]?.passed}
          />
        ))}
      </div>
      <h2 className="mt-10 text-[16px] font-semibold text-fg">Gratuites chez les éditeurs</h2>
      <p className="mt-0.5 text-[14px] text-muted">
        Des certificats reconnus qui ne coûtent rien, chacun avec le lien vers sa page officielle.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_CERTS.filter((c) => c.free).map((c) => (
          <MarketCertCard key={c.id} cert={c} />
        ))}
      </div>
    </>
  );
}

function PaidView() {
  return (
    <>
      <div className="rounded-[10px] bg-surface-1 p-4 text-[14px] text-muted">
        <b className="text-fg">Préparation gratuite, examen payant chez l’éditeur.</b> Fiches
        relevées en {CHECKED_AT} sur les sites officiels. Les prix sont des prix publics indicatifs
        en dollars US : ils varient selon le pays et changent, l’éditeur fait foi avant toute
        inscription.
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_CERTS.filter((c) => !c.free).map((c) => (
          <MarketCertCard key={c.id} cert={c} />
        ))}
      </div>
    </>
  );
}

function PlatformCertCard({
  cert,
  result,
  passed,
}: {
  cert: PlatformCert;
  result?: number;
  passed?: boolean;
}) {
  return (
    <Link
      to={`/certifications/${cert.id}`}
      className="group flex flex-col gap-3 rounded-[10px] bg-surface-1 p-4 transition-colors "
    >
      <div className="flex items-start gap-3.5">
        <CertBadge color={cert.color} logo={cert.logo} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <LevelPill level={cert.level} />
            <span className="text-[12px] text-subtle">{cert.track}</span>
          </div>
          <h3 className="mt-1 text-[15px] leading-snug font-semibold tracking-[-0.01em] text-fg group-hover:underline">
            {cert.title}
          </h3>
        </div>
      </div>
      <p className="line-clamp-2 text-[13px] text-muted">{cert.description}</p>
      <ul className="flex flex-wrap gap-1">
        {cert.syllabus.slice(0, 4).map((s) => (
          <li key={s} className="rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[11.5px] text-muted">
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center gap-3 border-t border-line pt-3 text-[12px] text-subtle">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {cert.minutes} min · {Math.min(cert.draw, cert.quiz.length)} questions
        </span>
        {passed ? (
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-success">
            <BadgeCheck className="size-4" />
            Obtenue
          </span>
        ) : result !== undefined ? (
          <span className="ml-auto font-medium text-warning">{result} %</span>
        ) : (
          <span className="ml-auto font-medium text-success">Gratuit</span>
        )}
      </div>
    </Link>
  );
}

const COURSE_IDS = new Set(COURSE_META.map((c) => c.id));

function MarketCertCard({ cert }: { cert: MarketCert }) {
  const saved = usePlatform((s) => s.savedCerts.includes(cert.id));
  const toggle = usePlatform((s) => s.toggle);
  const setCourse = usePlatform((s) => s.setCourse);
  return (
    <article className="flex flex-col gap-2 rounded-[10px] bg-surface-1 p-4">
      <div className="flex items-center gap-2.5">
        <ProviderMark name={cert.provider} size={34} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">
          {cert.provider}
        </span>
        <button
          type="button"
          aria-pressed={saved}
          aria-label="Enregistrer"
          onClick={() => toggle('savedCerts', cert.id)}
          className={cn(
            'grid size-8 place-items-center rounded-full hover:bg-surface-3',
            saved ? 'text-[#f0b232]' : 'text-subtle',
          )}
        >
          <Bookmark className="size-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3 className="text-[14px] leading-snug font-semibold text-fg">
        {cert.title}
        {cert.code && (
          <span className="ml-1.5 rounded-[5px] bg-surface-3 px-1.5 py-0.5 font-mono text-[11.5px] font-medium text-muted">
            {cert.code}
          </span>
        )}
      </h3>
      <div className="flex flex-wrap items-center gap-1.5">
        <LevelPill level={cert.level} />
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
            cert.free ? 'bg-success-soft text-success' : 'bg-surface-3 text-fg',
          )}
        >
          {cert.free ? 'Gratuit' : cert.price}
        </span>
      </div>
      <p className="text-[13px] text-muted">{cert.description}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-subtle">Format</dt>
        <dd className="text-fg">{cert.format}</dd>
        {cert.passScore && (
          <>
            <dt className="text-subtle">Pour réussir</dt>
            <dd className="text-fg">{cert.passScore}</dd>
          </>
        )}
        <dt className="text-subtle">Validité</dt>
        <dd className="text-fg">{cert.validity}</dd>
      </dl>
      {cert.note && (
        <p className="rounded-[6px] bg-warning-soft px-2 py-1 text-[12px] font-medium text-warning">
          {cert.note}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        {cert.prepPath && (
          <ButtonLink
            to={COURSE_IDS.has(cert.prepPath) ? '/apprendre' : `/apprendre/${cert.prepPath}`}
            onClick={() => COURSE_IDS.has(cert.prepPath!) && setCourse(cert.prepPath!)}
            variant="secondary"
            size="sm"
            icon={<GraduationCap />}
          >
            Se préparer sur DevHub
          </ButtonLink>
        )}
        {cert.prep && (
          <a
            href={cert.prep.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-sm font-semibold text-fg hover:bg-surface-2"
          >
            {cert.prep.label}
            <ExternalLink className="size-3.5" />
          </a>
        )}
        <a
          href={cert.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-sm font-semibold text-accent-text hover:bg-surface-2"
        >
          Site officiel
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </article>
  );
}

function Database() {
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState<'' | 'free' | 'paid'>('');
  const [level, setLevel] = useState<'' | CertLevel>('');
  const rows = useMemo(() => {
    const platform = PLATFORM_CERTS.map((c) => ({
      id: c.id,
      title: c.title,
      provider: 'DevHub',
      domain: c.track,
      level: c.level,
      free: true,
      price: 'Gratuit',
      validity: 'Sans expiration',
      internal: true,
      url: `/certifications/${c.id}`,
    }));
    const market = MARKET_CERTS.map((c) => ({
      id: c.id,
      title: c.code ? `${c.title} (${c.code})` : c.title,
      provider: c.provider,
      domain: c.domain,
      level: c.level,
      free: c.free,
      price: c.free ? 'Gratuit' : (c.price ?? ''),
      validity: c.validity,
      internal: false,
      url: c.url,
    }));
    const t = q.trim().toLowerCase();
    return [...platform, ...market].filter(
      (r) =>
        (!t || `${r.title} ${r.provider} ${r.domain}`.toLowerCase().includes(t)) &&
        (!domain || r.domain === domain) &&
        (!price || (price === 'free') === r.free) &&
        (!level || r.level === level),
    );
  }, [q, domain, price, level]);
  const domains = [
    ...new Set([...PLATFORM_CERTS.map((c) => c.track), ...MARKET_CERTS.map((c) => c.domain)]),
  ].sort();
  const sel =
    'h-10 rounded-full border border-line-strong bg-canvas px-4 text-sm text-fg focus:border-accent focus:outline-none';
  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line-strong bg-canvas px-4 focus-within:border-fg">
          <Search className="size-4 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher une certification, un éditeur…"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            aria-label="Chercher une certification"
          />
        </label>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className={sel}
          aria-label="Domaine"
        >
          <option value="">Tous les domaines</option>
          {domains.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as CertLevel)}
          className={sel}
          aria-label="Niveau"
        >
          <option value="">Tous les niveaux</option>
          {Object.entries(LEVEL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={price}
          onChange={(e) => setPrice(e.target.value as 'free')}
          className={sel}
          aria-label="Prix"
        >
          <option value="">Gratuites et payantes</option>
          <option value="free">Gratuites</option>
          <option value="paid">Payantes</option>
        </select>
      </div>
      <p className="mt-3 text-[13px] text-subtle">
        {rows.length} certifications · prix indicatifs, à vérifier chez l’éditeur
      </p>
      <div className="mt-2 overflow-x-auto rounded-[8px] border border-line">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-surface-1 text-[12px] font-semibold tracking-wide text-subtle uppercase">
            <tr>
              <th className="px-4 py-3">Certification</th>
              <th className="px-4 py-3">Éditeur</th>
              <th className="px-4 py-3">Domaine</th>
              <th className="px-4 py-3">Niveau</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Validité</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-surface-1">
                <td className="px-4 py-3 font-semibold text-fg">
                  {r.internal ? (
                    <Link to={r.url} className="hover:underline">
                      {r.title}
                    </Link>
                  ) : (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {r.title}
                      <ExternalLink className="size-3 text-subtle" />
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  <span className="inline-flex items-center gap-2">
                    <ProviderMark name={r.provider} size={22} />
                    {r.provider}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{r.domain}</td>
                <td className="px-4 py-3">
                  <LevelPill level={r.level} />
                </td>
                <td className={cn('px-4 py-3 font-semibold', r.free ? 'text-success' : 'text-fg')}>
                  {r.price}
                </td>
                <td className="px-4 py-3 text-muted">{r.validity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MyBadges({ certs }: { certs: PlatformCert[] }) {
  const me = useSession((s) => s.user);
  const results = usePlatform((s) => s.certResults);
  if (!certs.length)
    return (
      <div className="rounded-[10px] bg-surface-1 p-10 text-center">
        <Award className="mx-auto size-10 text-subtle" />
        <p className="mt-3 font-semibold text-fg">Pas encore de badge</p>
        <p className="mt-1 text-sm text-muted">
          Passe une certification DevHub gratuite : 20 questions, une demi-heure au plus.
        </p>
        <ButtonLink to="/certifications" variant="primary" className="mt-4">
          Voir les certifications
        </ButtonLink>
      </div>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {certs.map((c) => (
        <div
          key={c.id}
          className="flex flex-col items-center gap-3 rounded-[10px] bg-surface-1 p-6 text-center"
        >
          <CertBadge color={c.color} logo={c.logo} size={80} />
          <div>
            <h3 className="text-[15px] font-semibold text-fg">{c.title}</h3>
            <p className="text-[13px] text-subtle">
              Score {results[c.id]?.score} % ·{' '}
              {new Date(results[c.id]!.at).toLocaleDateString('fr-FR')}
            </p>
            {results[c.id]?.code && (
              <p className="mt-1 font-mono text-[12px] text-muted">{results[c.id]!.code}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(`${location.origin}/u/${me?.handle}?badge=${c.id}`)
                .then(() => toast.success('Lien du badge copié'));
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-3 px-3 text-[13px] font-semibold text-fg hover:bg-surface-2"
          >
            <Share2 className="size-3.5" />
            Partager
          </button>
        </div>
      ))}
    </div>
  );
}
