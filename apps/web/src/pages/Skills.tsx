import {
  ArrowLeft,
  BadgeCheck,
  BookText,
  Cable,
  Check,
  Download,
  FileCode2,
  Info,
  MessageSquareText,
  Plug,
  Puzzle,
  ScrollText,
  Search,
  SquareTerminal,
  Star,
} from 'lucide-react';
import { BrandLogo } from '@/platform/logos';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code';
import { KIND_LABEL, SKILLS, TOOL_LABEL, installHint } from '@/platform/data/skills';
import { usePlatform } from '@/platform/store';
import type { AgentSkill, AgentTool, SkillKind } from '@/platform/types';
import {
  Ago,
  DemoTag,
  PersonAvatar,
  PersonLink,
  SERVICE_COLORS,
  ServiceHeader,
  compact,
} from '@/platform/ui';
import { person } from '@/platform/data/people';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';

/** Logo de l'outil : officiel quand il existe (Claude, Cursor, Google), icône terminal pour Codex. */
export function ToolLogo({ tool, size = 13 }: { tool: AgentTool; size?: number }) {
  if (tool === 'codex')
    return <SquareTerminal style={{ width: size, height: size }} className="text-muted" />;
  return <BrandLogo name={tool === 'antigravity' ? 'Google' : tool} size={size} />;
}

export function ToolBadge({ tool }: { tool: AgentTool }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[6px] bg-canvas px-2 text-[12px] font-medium text-muted">
      <ToolLogo tool={tool} />
      {TOOL_LABEL[tool]}
    </span>
  );
}

const KIND_ICON: Record<SkillKind, typeof FileCode2> = {
  skill: BookText,
  plugin: Plug,
  mcp: Cable,
  rules: ScrollText,
  prompt: MessageSquareText,
};

/** Hub des skills, plugins, serveurs MCP et règles pour agents de code. */
export default function Skills() {
  const [params, setParams] = useSearchParams();
  const tool = (params.get('outil') as AgentTool | null) ?? null;
  const kind = (params.get('type') as SkillKind | null) ?? null;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'installs' | 'stars' | 'recent'>('installs');
  const installed = usePlatform((s) => s.installedSkills);

  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SKILLS.filter(
      (s) =>
        (!tool || s.tools.includes(tool)) &&
        (!kind || s.kind === kind) &&
        (!t || `${s.name} ${s.summary} ${s.category}`.toLowerCase().includes(t)),
    ).sort((a, b) =>
      sort === 'recent'
        ? b.updatedAt.localeCompare(a.updatedAt)
        : sort === 'stars'
          ? b.stars - a.stars
          : b.installs - a.installs,
    );
  }, [q, tool, kind, sort]);

  const facet = (
    label: string,
    active: boolean,
    onClick: () => void,
    count?: number,
    dot?: string,
  ) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[14px] transition-colors',
        active
          ? 'bg-surface-2 font-semibold text-fg'
          : 'text-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      {dot && <ToolLogo tool={dot as AgentTool} size={14} />}
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[12px] text-subtle tabular">{count}</span>}
    </button>
  );

  return (
    <div className="dh-page mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Puzzle}
        color={SERVICE_COLORS.skills}
        title="Skills & plugins IA"
        subtitle="Les skills, plugins, serveurs MCP et règles de la communauté pour Claude Code, Codex, Antigravity et Cursor."
      />

      <div className="mt-6 flex gap-6">
        <aside className="hidden w-[220px] shrink-0 flex-col gap-5 md:flex">
          <div>
            <h2 className="mb-1.5 px-2.5 text-[12px] font-semibold tracking-wide text-subtle uppercase">
              Outil
            </h2>
            {facet('Tous les outils', !tool, () => set('outil', null), SKILLS.length)}
            {(Object.keys(TOOL_LABEL) as AgentTool[]).map((t) =>
              facet(
                TOOL_LABEL[t],
                tool === t,
                () => set('outil', t),
                SKILLS.filter((s) => s.tools.includes(t)).length,
                t,
              ),
            )}
          </div>
          <div>
            <h2 className="mb-1.5 px-2.5 text-[12px] font-semibold tracking-wide text-subtle uppercase">
              Type
            </h2>
            {facet('Tous les types', !kind, () => set('type', null))}
            {(Object.keys(KIND_LABEL) as SkillKind[]).map((k) =>
              facet(
                KIND_LABEL[k],
                kind === k,
                () => set('type', k),
                SKILLS.filter((s) => s.kind === k).length,
              ),
            )}
          </div>
          {installed.length > 0 && (
            <div>
              <h2 className="mb-1.5 px-2.5 text-[12px] font-semibold tracking-wide text-subtle uppercase">
                Installés
              </h2>
              {SKILLS.filter((s) => installed.includes(s.id)).map((s) => (
                <Link
                  key={s.id}
                  to={`/skills/${s.id}`}
                  className="flex h-9 items-center gap-2 rounded-[8px] px-2.5 font-mono text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <Check className="size-3.5 text-success" />
                  <span className="truncate">{s.name}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line-strong bg-canvas px-4 focus-within:border-fg">
              <Search className="size-4 text-subtle" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Chercher : revue de code, paiements, PWA…"
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
                aria-label="Chercher un skill"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'installs')}
              aria-label="Trier"
              className="h-10 rounded-full border border-line-strong bg-canvas px-4 text-sm text-fg"
            >
              <option value="installs">Plus installés</option>
              <option value="stars">Mieux notés</option>
              <option value="recent">Mis à jour récemment</option>
            </select>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto md:hidden">
            {(Object.keys(TOOL_LABEL) as AgentTool[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tool === t}
                onClick={() => set('outil', tool === t ? null : t)}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-3 text-[13px] font-semibold',
                  tool === t ? 'lg-tint border-transparent' : 'border-line-strong text-fg',
                )}
              >
                {TOOL_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-subtle">{list.length} résultats</p>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {list.map((s) => (
              <SkillCard key={s.id} skill={s} installed={installed.includes(s.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillIcon({ kind, size = 38 }: { kind: SkillKind; size?: number }) {
  const I = KIND_ICON[kind];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[9px] bg-canvas text-muted"
      style={{ width: size, height: size }}
    >
      {kind === 'mcp' ? (
        <BrandLogo name="MCP" size={Math.round(size * 0.46)} />
      ) : (
        <I style={{ width: size * 0.46, height: size * 0.46 }} />
      )}
    </span>
  );
}

function SkillCard({ skill, installed }: { skill: AgentSkill; installed: boolean }) {
  return (
    <Link
      to={`/skills/${skill.id}`}
      className="group flex flex-col gap-2.5 rounded-[10px] bg-surface-1 p-4 transition-colors "
    >
      <div className="flex items-start gap-3">
        <SkillIcon kind={skill.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-mono text-[14px] font-semibold text-fg group-hover:underline">
              {skill.name}
            </h3>
            {skill.verified && (
              <BadgeCheck
                className="size-4 shrink-0 text-accent-text"
                aria-label="Vérifié par la modération"
              />
            )}
          </div>
          <p className="text-[12.5px] text-subtle">
            {KIND_LABEL[skill.kind]} · {skill.category} · v{skill.version}
          </p>
        </div>
        {installed && (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-success">
            Installé
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-[14px] text-muted">{skill.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {skill.tools.map((t) => (
          <ToolBadge key={t} tool={t} />
        ))}
      </div>
      <div className="mt-auto flex items-center gap-4 border-t border-line pt-2.5 text-[12.5px] text-subtle">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <PersonAvatar handle={skill.author} size={18} />
          <span className="truncate">{person(skill.author).name}</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Download className="size-3.5" />
          {compact(skill.installs)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5" />
          {compact(skill.stars)}
        </span>
      </div>
    </Link>
  );
}

export function SkillDetail() {
  const { id = '' } = useParams();
  const skill = SKILLS.find((s) => s.id === id);
  const installed = usePlatform((s) => s.installedSkills.includes(id));
  const starred = usePlatform((s) => s.starredSkills.includes(id));
  const toggle = usePlatform((s) => s.toggle);
  const [tool, setTool] = useState<AgentTool | null>(null);
  const [tab, setTab] = useState<'readme' | 'files'>('readme');
  if (!skill) return <NotFound />;
  const current = tool && skill.tools.includes(tool) ? tool : skill.tools[0];
  const hint = installHint(skill.kind, current, skill.name);

  return (
    <div className="dh-page mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <Link
        to="/skills"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Skills & plugins
      </Link>
      <header className="mt-4 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start">
        <SkillIcon kind={skill.kind} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[22px] font-semibold text-fg">{skill.name}</h1>
            {skill.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-text">
                <BadgeCheck className="size-3.5" />
                Vérifié
              </span>
            )}
            <DemoTag />
          </div>
          <p className="mt-1 text-[14px] text-muted">{skill.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-subtle">
            <PersonLink handle={skill.author} size={22} />
            <span>{KIND_LABEL[skill.kind]}</span>
            <span>v{skill.version}</span>
            <span>
              mis à jour <Ago iso={skill.updatedAt} />
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="size-3.5" />
              {compact(skill.installs)} installations
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            icon={<Star fill={starred ? 'currentColor' : 'none'} />}
            onClick={() => toggle('starredSkills', skill.id)}
          >
            {compact(skill.stars + (starred ? 1 : 0))}
          </Button>
          <Button
            variant={installed ? 'success' : 'primary'}
            icon={installed ? <Check /> : <Download />}
            onClick={() => {
              toggle('installedSkills', skill.id);
              if (!installed)
                toast.success('Ajouté à tes skills', {
                  description: 'Copie la commande d’installation pour ton outil.',
                });
            }}
          >
            {installed ? 'Installé' : 'Installer'}
          </Button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex gap-1 border-b border-line" role="tablist">
            {(
              [
                ['readme', 'Présentation'],
                ['files', `Fichiers (${skill.files.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  'rounded-full px-4 py-2 text-[14px] font-semibold',
                  tab === k ? 'lg-tint' : 'lg-ghost text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'readme' ? (
            <div className="py-5">
              <p className="text-[14px] leading-relaxed text-fg">{skill.readme}</p>
              <h2 className="mt-6 text-[15px] font-semibold text-fg">Compatible avec</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {skill.tools.map((t) => (
                  <ToolBadge key={t} tool={t} />
                ))}
              </div>
              <div className="mt-6 flex gap-2.5 rounded-[10px] bg-surface-1 p-4 text-[13px] text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-accent-text" />
                <p>
                  Avant d’installer : lis les fichiers, vérifie les commandes qu’ils exécutent et
                  les droits qu’ils demandent. Un skill ou un serveur MCP agit avec les permissions
                  de ton agent.
                </p>
              </div>
            </div>
          ) : skill.files.length ? (
            <div className="flex flex-col gap-4 py-5">
              {skill.files.map((f) => (
                <div key={f.path}>
                  <p className="mb-1.5 font-mono text-[13px] font-semibold text-muted">{f.path}</p>
                  <CodeBlock code={f.content} lang={f.path.endsWith('.md') ? 'markdown' : 'bash'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              Les fichiers seront publiés avec la version hébergée du hub.
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-[10px] bg-surface-1 p-4">
          <h2 className="text-[14px] font-semibold text-fg">Installation</h2>
          <div className="flex flex-wrap gap-1.5">
            {skill.tools.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={current === t}
                onClick={() => setTool(t)}
                className={cn(
                  'h-8 rounded-[6px] px-2.5 text-[13px] font-semibold',
                  current === t
                    ? 'bg-surface-3 text-fg'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {TOOL_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-muted">{hint.label}</p>
          <CodeBlock code={hint.code} lang="bash" compact />
          <p className="text-[12px] text-subtle">
            Commandes indicatives : la documentation de ton outil fait foi.
          </p>
        </aside>
      </div>
    </div>
  );
}
