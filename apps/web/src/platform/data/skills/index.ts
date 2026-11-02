import type { AgentTool, SkillKind } from '../../types';
import { DEVHUB_SKILLS } from './devhub';
import { ECOSYSTEM } from './ecosystem';

/** Écosystème officiel d'abord, puis les skills rédigés par DevHub. */
export const SKILLS = [...ECOSYSTEM, ...DEVHUB_SKILLS];

export const KIND_LABEL: Record<SkillKind, string> = {
  skill: 'Skill',
  plugin: 'Plugin',
  mcp: 'Serveur MCP',
  rules: 'Règles',
  prompt: 'Prompt',
};

export const TOOL_LABEL: Record<AgentTool, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  antigravity: 'Antigravity',
  cursor: 'Cursor',
};
