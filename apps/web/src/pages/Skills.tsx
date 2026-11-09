import {
  ArrowLeft,
  BadgeCheck,
  BookText,
  Bookmark,
  Cable,
  Download,
  ExternalLink,
  FileCode2,
  MessageSquareText,
  Plug,
  Puzzle,
  ScrollText,
  Search,
  SquareTerminal,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { GitHubIcon } from '@/components/icons';
import { CodeBlock, Markdown } from '@/components/ui/code';
import { cn } from '@/lib/utils';
import { KIND_LABEL, SKILLS, TOOL_LABEL } from '@/platform/data/skills';
import { LiveBoard } from '@/platform/LiveBoard';
import { BrandLogo } from '@/platform/logos';
import { usePlatform } from '@/platform/store';
import type { AgentSkill, AgentTool, SkillKind } from '@/platform/types';
import { SERVICE_COLORS, ServiceHeader } from '@/platform/ui';
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

const TOOLS: AgentTool[] = ['claude', 'codex', 'cursor', 'antigravity'];
const KINDS: SkillKind[] = ['mcp', 'skill', 'plugin', 'rules'];

/** Hub des skills, plugins, serveurs MCP et règles pour agents de code. */
export default function Skills() {
  const [params, setParams] = useSearchParams();
  const tool = (params.get('outil') as AgentTool | null) ?? null;
  const kind = (params.get('type') as SkillKind | null) ?? null;
  const source = params.get('source') as 'officiel' | 'devhub' | null;
  const [q, setQ] = useState('');
  const saved = usePlatform((s) => s.starredSkills);

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
        (!source || (source === 'officiel') === s.official) &&
        (!t || `${s.name} ${s.summary} ${s.category} ${s.publisher}`.toLowerCase().includes(t)),
    );
  }, [q, tool, kind, source]);

  const facet = (
    label: string,
    active: boolean,
    onClick: () => void,
    count?: number,
    dot?: AgentTool,
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
      {dot && <ToolLogo tool={dot} size={14} />}
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[12px] text-subtle tabular-nums">{count}</span>}
    </button>
  );

  return (
    <div className="dh-page mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={Puzzle}
        color={SERVICE_COLORS.skills}
        title="Skills & plugins IA"
        subtitle="Serveurs MCP, skills, plugins et règles pour Claude Code, Codex, Cursor et Antigravity : les sources officielles, avec la vraie commande d’installation pour chaque outil."
      />

      <div className="mt-6 flex gap-6">
        <aside className="hidden w-[220px] shrink-0 flex-col gap-5 md:flex">
          <div>
            <h2 className="mb-1.5 px-2.5 text-[12px] font-semibold tracking-wide text-subtle uppercase">
              Outil
            </h2>
            {facet('Tous les outils', !tool, () => set('outil', null), SKILLS.length)}
            {TOOLS.map((t) =>
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
            {KINDS.map((k) =>
              facet(
                KIND_LABEL[k],
                kind === k,
                () => set('type', k),
                SKILLS.filter((s) => s.kind === k).length,
              ),
            )}
          </div>
          <div>
            <h2 className="mb-1.5 px-2.5 text-[12px] font-semibold tracking-wide text-subtle uppercase">
              Source
            </h2>
            {facet('Toutes', !source, () => set('source', null))}
            {facet(
              'Éditeurs officiels',
              source === 'officiel',
              () => set('source', 'officiel'),
              SKILLS.filter((s) => s.official).length,
            )}
            {facet(
              'Rédigés par DevHub',
              source === 'devhub',
              () => set('source', 'devhub'),
              SKILLS.filter((s) => !s.official).length,
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <label className="flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-canvas px-4 focus-within:border-fg">
            <Search className="size-4 shrink-0 text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chercher : Playwright, base de données, revue de code…"
              aria-label="Chercher un skill, un serveur MCP ou un plugin"
              className="w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-subtle"
            />
          </label>
          {/* Filtres sur mobile */}
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto md:hidden">
            {TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tool === t}
                onClick={() => set('outil', tool === t ? null : t)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium',
                  tool === t ? 'lg-tint' : 'lg-clear text-fg',
                )}
              >
                <ToolLogo tool={t} />
                {TOOL_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-subtle">
            {list.length} résultat{list.length > 1 ? 's' : ''}
            {saved.length > 0 && ` · ${saved.length} enregistré${saved.length > 1 ? 's' : ''}`}
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((s) => (
              <li key={s.id}>
                <SkillCard skill={s} />
              </li>
            ))}
          </ul>
          {list.length === 0 && (
            <p className="mt-2 rounded-[10px] bg-surface-1 p-8 text-center text-muted">
              Rien ne correspond. Retire un filtre ou cherche autrement.
            </p>
          )}
        </div>
      </div>

      <LiveBoard kind="skill" title="Nouveautés sur GitHub, collectées en direct" />
    </div>
  );
}

function SkillCard({ skill }: { skill: AgentSkill }) {
  const Icon = KIND_ICON[skill.kind];
  return (
    <Link
      to={`/skills/${skill.id}`}
      className="group flex h-full flex-col gap-2.5 rounded-[10px] bg-surface-1 p-4 transition-colors hover:bg-surface-2"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-canvas text-accent-text">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-mono text-[14.5px] font-semibold text-fg group-hover:underline">
            {skill.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
            {skill.official && (
              <BadgeCheck className="size-3.5 text-accent-text" aria-label="Éditeur officiel" />
            )}
            {skill.publisher} · {KIND_LABEL[skill.kind]} · {skill.category}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 text-[13.5px] text-muted">{skill.summary}</p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {skill.tools.map((t) => (
          <ToolBadge key={t} tool={t} />
        ))}
      </div>
    </Link>
  );
}

function download(path: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = path.split('/').pop() ?? 'SKILL.md';
  a.click();
  URL.revokeObjectURL(url);
}

/** Fiche : présentation, installation par outil, fichiers. */
export function SkillDetail() {
  const { id = '' } = useParams();
  const skill = SKILLS.find((s) => s.id === id);
  const saved = usePlatform((s) => s.starredSkills.includes(id));
  const toggle = usePlatform((s) => s.toggle);
  const tools = skill ? (Object.keys(skill.install) as AgentTool[]) : [];
  const [tool, setTool] = useState<AgentTool | null>(null);
  if (!skill) return <NotFound />;
  const active = tool && skill.install[tool] ? tool : tools[0];
  const Icon = KIND_ICON[skill.kind];

  return (
    <div className="dh-page mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6">
      <Link
        to="/skills"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Skills & plugins IA
      </Link>

      <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-[14px] bg-surface-1 text-accent-text">
          <Icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-[24px] leading-tight font-semibold text-fg">
            {skill.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13.5px] text-muted">
            {skill.official && <BadgeCheck className="size-4 text-accent-text" aria-hidden />}
            <span className="font-semibold text-fg">{skill.publisher}</span>
            {skill.official && <span>· éditeur officiel</span>}
            <span>· {KIND_LABEL[skill.kind]}</span>
            <span>· {skill.category}</span>
          </p>
          <p className="mt-2 max-w-2xl text-[14.5px] text-fg">{skill.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {skill.repo && (
              <a
                href={skill.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold text-fg hover:bg-surface-3"
              >
                <GitHubIcon className="size-4" />
                Dépôt officiel
              </a>
            )}
            {skill.docs && (
              <a
                href={skill.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold text-fg hover:bg-surface-3"
              >
                <ExternalLink className="size-4" />
                Documentation
              </a>
            )}
            <button
              type="button"
              aria-pressed={saved}
              onClick={() => toggle('starredSkills', skill.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold text-fg hover:bg-surface-3"
            >
              <Bookmark className="size-4" fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="install"
        className="mt-8 rounded-[12px] border border-line p-4 sm:p-5"
      >
        <h2 id="install" className="text-[16px] font-semibold text-fg">
          Installer
        </h2>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Outil">
          {tools.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active === t}
              onClick={() => setTool(t)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold',
                active === t ? 'bg-fg text-canvas' : 'bg-surface-2 text-fg hover:bg-surface-3',
              )}
            >
              <ToolLogo tool={t} size={14} />
              {TOOL_LABEL[t]}
            </button>
          ))}
        </div>
        {active &&
          skill.install[active]!.map((snip) => (
            <div key={snip.where} className="mt-4">
              <p className="mb-1.5 text-[13px] font-medium text-muted">{snip.where}</p>
              <CodeBlock code={snip.code} lang={snip.lang} />
            </div>
          ))}
      </section>

      <section aria-labelledby="about" className="mt-8">
        <h2 id="about" className="text-[16px] font-semibold text-fg">
          Présentation
        </h2>
        <div className="mt-2 text-[14.5px] leading-relaxed text-fg">
          <Markdown>{skill.readme}</Markdown>
        </div>
      </section>

      {skill.files.length > 0 && (
        <section aria-labelledby="files" className="mt-8">
          <h2 id="files" className="text-[16px] font-semibold text-fg">
            Fichier{skill.files.length > 1 ? 's' : ''}
          </h2>
          {skill.files.map((f) => (
            <div key={f.path} className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-mono text-[13px] text-muted">{f.path}</p>
                <button
                  type="button"
                  onClick={() => download(f.path, f.content)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12.5px] font-semibold text-white hover:bg-accent-hover"
                >
                  <Download className="size-3.5" />
                  Télécharger
                </button>
              </div>
              <CodeBlock code={f.content} lang="markdown" />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
