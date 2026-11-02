import type { AgentTool, InstallSnippet } from '../../types';

/**
 * Commandes d'installation générées à partir de la définition d'un serveur MCP, pour que chaque
 * outil reçoive la syntaxe documentée par son éditeur :
 * - Claude Code : `claude mcp add` (https://docs.claude.com/en/docs/claude-code/mcp)
 * - Codex : `~/.codex/config.toml`, table `[mcp_servers.<nom>]` (https://developers.openai.com/codex/mcp)
 * - Cursor : `.cursor/mcp.json` ou `~/.cursor/mcp.json` (https://docs.cursor.com/context/mcp)
 * - Antigravity : configuration MCP brute de l'agent, même format `mcpServers` (serveurs locaux)
 */

export interface LocalServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface RemoteServer {
  name: string;
  url: string;
}

const json = (v: unknown) => JSON.stringify(v, null, 2);

export function localMcp(s: LocalServer): Partial<Record<AgentTool, InstallSnippet[]>> {
  const envFlags = Object.entries(s.env ?? {})
    .map(([k, v]) => ` -e ${k}=${v}`)
    .join('');
  const entry = { command: s.command, args: s.args, ...(s.env ? { env: s.env } : {}) };
  const toml = [
    `[mcp_servers.${s.name}]`,
    `command = "${s.command}"`,
    `args = [${s.args.map((a) => `"${a}"`).join(', ')}]`,
    ...(s.env
      ? [
          `env = { ${Object.entries(s.env)
            .map(([k, v]) => `"${k}" = "${v}"`)
            .join(', ')} }`,
        ]
      : []),
  ].join('\n');
  return {
    claude: [
      {
        where: 'Terminal, dans ton projet',
        code: `claude mcp add ${s.name}${envFlags} -- ${s.command} ${s.args.join(' ')}`,
        lang: 'bash',
      },
    ],
    codex: [{ where: '~/.codex/config.toml', code: toml, lang: 'toml' }],
    cursor: [
      { where: '.cursor/mcp.json', code: json({ mcpServers: { [s.name]: entry } }), lang: 'json' },
    ],
    antigravity: [
      {
        where: 'Agent › MCP Servers › Manage MCP Servers › View raw config',
        code: json({ mcpServers: { [s.name]: entry } }),
        lang: 'json',
      },
    ],
  };
}

export function remoteMcp(s: RemoteServer): Partial<Record<AgentTool, InstallSnippet[]>> {
  return {
    claude: [
      {
        where: 'Terminal, puis /mcp dans Claude Code pour te connecter',
        code: `claude mcp add --transport http ${s.name} ${s.url}`,
        lang: 'bash',
      },
    ],
    codex: [
      {
        where: '~/.codex/config.toml (serveur distant, connexion au premier usage)',
        code: `[mcp_servers.${s.name}]\nurl = "${s.url}"`,
        lang: 'toml',
      },
    ],
    cursor: [
      {
        where: '.cursor/mcp.json',
        code: json({ mcpServers: { [s.name]: { url: s.url } } }),
        lang: 'json',
      },
    ],
  };
}

/** Skill au format SKILL.md : dossier de skills de Claude Code, ou AGENTS.md pour les autres. */
export function skillInstall(name: string): Partial<Record<AgentTool, InstallSnippet[]>> {
  const agents = {
    where: 'AGENTS.md, à la racine du projet',
    code: `## ${name}\n\n<colle ici le contenu de SKILL.md, sans l'en-tête --->`,
    lang: 'markdown',
  };
  return {
    claude: [
      {
        where: 'Terminal, à la racine du projet (ou ~/.claude/skills pour tous tes projets)',
        code: `mkdir -p .claude/skills/${name}\n# puis enregistre le fichier SKILL.md téléchargé dans ce dossier`,
        lang: 'bash',
      },
    ],
    codex: [agents],
    cursor: [agents],
  };
}

/** Règles pour Cursor (.mdc) et AGENTS.md pour Codex. */
export function rulesInstall(name: string): Partial<Record<AgentTool, InstallSnippet[]>> {
  return {
    cursor: [
      {
        where: `.cursor/rules/${name}.mdc`,
        code: `---\ndescription: ${name}\nalwaysApply: true\n---\n\n<colle ici les règles>`,
        lang: 'markdown',
      },
    ],
    codex: [
      {
        where: 'AGENTS.md, à la racine du projet',
        code: `## ${name}\n\n<colle ici les règles>`,
        lang: 'markdown',
      },
    ],
    claude: [
      {
        where: 'CLAUDE.md, à la racine du projet',
        code: `## ${name}\n\n<colle ici les règles>`,
        lang: 'markdown',
      },
    ],
  };
}
