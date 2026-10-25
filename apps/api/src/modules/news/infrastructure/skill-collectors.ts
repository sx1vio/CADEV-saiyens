import type { CollectedNews, SkillType } from '../domain/news-item';
import { pool } from '../domain/pool';
import { parseSkillMd } from '../domain/skills';
import { cleanText } from '../domain/text';
import { fetchJson, fetchText } from './http';

// Skills, plugins, serveurs MCP et règles pour agents IA, depuis des sources officielles :
// dépôts d'Anthropic et d'OpenAI, annuaire de plugins Claude Code, registre MCP, et GitHub (par sujet).
// `category` porte le type (skill, plugin, mcp, rules) ; `extra.tools` les outils compatibles.

type Tool = 'claude' | 'codex' | 'cursor' | 'antigravity';
const ALL_TOOLS: Tool[] = ['claude', 'codex', 'cursor', 'antigravity'];
const GH_HEADERS = { Accept: 'application/vnd.github+json' };

const base = (repo: string) => ({
  kind: 'skill' as const,
  lang: 'en' as const,
  image: `https://github.com/${repo.split('/')[0]}.png?size=80`,
  publishedAt: new Date(),
});

/** Dossier de skills d'un dépôt (un dossier par skill, avec un SKILL.md). */
async function collectSkillsDir(
  repo: string,
  dir: string,
  tool: Tool,
  label: string,
): Promise<CollectedNews[]> {
  const entries = await fetchJson<{ name: string; type: string }[]>(
    `https://api.github.com/repos/${repo}/contents/${dir}`,
    GH_HEADERS,
  );
  const res = await pool(
    entries.filter((e) => e.type === 'dir' && !e.name.startsWith('.')),
    6,
    async (e): Promise<CollectedNews> => {
      const md = parseSkillMd(
        await fetchText(`https://raw.githubusercontent.com/${repo}/HEAD/${dir}/${e.name}/SKILL.md`),
      );
      return {
        ...base(repo),
        source: `skills:${repo}`,
        sourceName: label,
        category: 'skill',
        title: md.name ?? e.name,
        summary: cleanText(md.description, 240),
        url: `https://github.com/${repo}/tree/HEAD/${dir}/${e.name}`,
        author: label,
        extra: { tools: [tool], official: true },
      };
    },
  );
  return res.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}

interface Marketplace {
  plugins: {
    name: string;
    description?: string;
    category?: string;
    homepage?: string;
    author?: { name?: string };
    source: string | { url?: string; path?: string; ref?: string };
  }[];
}

/** Plusieurs plugins partagent un même dépôt : le lien vise leur sous-dossier, pour rester unique. */
function pluginUrl(p: Marketplace['plugins'][number], repo: string): string {
  const s = p.source;
  if (typeof s === 'object' && s.url) {
    const url = s.url.replace(/\.git$/, '');
    return s.path ? `${url}/tree/${s.ref ?? 'HEAD'}/${s.path}` : (p.homepage ?? url);
  }
  return p.homepage ?? `https://github.com/${repo}/tree/HEAD/plugins/${p.name}`;
}

/** Annuaire officiel des plugins Claude Code. */
async function collectOfficialPlugins(): Promise<CollectedNews[]> {
  const repo = 'anthropics/claude-plugins-official';
  const m = await fetchJson<Marketplace>(
    `https://raw.githubusercontent.com/${repo}/HEAD/.claude-plugin/marketplace.json`,
  );
  return m.plugins.map((p) => ({
    ...base(repo),
    source: 'claude-plugins-official',
    sourceName: 'Plugins Claude Code',
    category: 'plugin',
    title: p.name,
    summary: cleanText(p.description, 240),
    url: pluginUrl(p, repo),
    author: p.author?.name ?? 'Anthropic',
    extra: { tools: ['claude'], official: true, topic: p.category ?? null },
  }));
}

interface McpServer {
  server: {
    name: string;
    title?: string;
    description: string;
    version: string;
    websiteUrl?: string;
    repository?: { url?: string };
    remotes?: { url: string }[];
  };
  _meta: { 'io.modelcontextprotocol.registry/official'?: { isLatest?: boolean } };
}

/** Registre officiel des serveurs MCP (dernière version de chaque serveur de la première page). */
async function collectMcpRegistry(): Promise<CollectedNews[]> {
  const d = await fetchJson<{ servers: McpServer[] }>(
    'https://registry.modelcontextprotocol.io/v0/servers?limit=100',
  );
  return d.servers
    .filter((s) => s._meta['io.modelcontextprotocol.registry/official']?.isLatest)
    .flatMap(({ server: s }) => {
      const url = s.repository?.url ?? s.websiteUrl ?? s.remotes?.[0]?.url;
      if (!url) return [];
      return [
        {
          ...base('modelcontextprotocol/servers'),
          source: 'mcp-registry',
          sourceName: 'Registre MCP',
          category: 'mcp',
          title: s.title ?? s.name,
          summary: cleanText(s.description, 240),
          url,
          author: s.name.split('/')[0] ?? null,
          extra: { tools: ALL_TOOLS, official: true, version: s.version },
        },
      ];
    });
}

interface GhRepo {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  owner: { login: string; avatar_url: string };
}

/** Dépôts les plus étoilés d'un sujet GitHub. */
async function collectTopic(
  topic: string,
  type: SkillType,
  tools: Tool[],
): Promise<CollectedNews[]> {
  const d = await fetchJson<{ items: GhRepo[] }>(
    `https://api.github.com/search/repositories?q=topic:${topic}&sort=stars&order=desc&per_page=20`,
    GH_HEADERS,
  );
  return d.items.map((r) => ({
    kind: 'skill' as const,
    source: `skills:topic:${topic}`,
    sourceName: 'GitHub',
    category: type,
    lang: 'en' as const,
    title: r.full_name,
    summary: cleanText(r.description ?? '', 240),
    url: r.html_url,
    image: r.owner.avatar_url,
    author: r.owner.login,
    publishedAt: new Date(r.pushed_at),
    score: r.stargazers_count,
    comments: r.forks_count,
    extra: { tools, official: false },
  }));
}

export const collectSkills = () => [
  {
    source: 'skills:anthropics/skills',
    run: () => collectSkillsDir('anthropics/skills', 'skills', 'claude', 'Anthropic'),
  },
  {
    source: 'skills:openai/skills',
    run: () => collectSkillsDir('openai/skills', 'skills/.curated', 'codex', 'OpenAI'),
  },
  { source: 'claude-plugins-official', run: collectOfficialPlugins },
  { source: 'mcp-registry', run: collectMcpRegistry },
  {
    source: 'skills:topic:claude-code-skills',
    run: () => collectTopic('claude-code-skills', 'skill', ['claude']),
  },
  {
    source: 'skills:topic:agent-skills',
    run: () => collectTopic('agent-skills', 'skill', ALL_TOOLS),
  },
  { source: 'skills:topic:mcp-server', run: () => collectTopic('mcp-server', 'mcp', ALL_TOOLS) },
  {
    source: 'skills:topic:cursor-rules',
    run: () => collectTopic('cursor-rules', 'rules', ['cursor']),
  },
];
