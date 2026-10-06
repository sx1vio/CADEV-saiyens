import {
  siAndroid,
  siAnthropic,
  siAstro,
  siClaude,
  siCisco,
  siComptia,
  siCoursera,
  siCursor,
  siDart,
  siDjango,
  siDocker,
  siExpo,
  siFastapi,
  siFirebase,
  siFlutter,
  siFreecodecamp,
  siGit,
  siGithub,
  siGithubactions,
  siGitlab,
  siGo,
  siGoogle,
  siGooglecloud,
  siGooglegemini,
  siHashicorp,
  siJavascript,
  siKaggle,
  siKotlin,
  siKubernetes,
  siLaravel,
  siLinux,
  siLinuxfoundation,
  siMeta,
  siModelcontextprotocol,
  siMongodb,
  siMysql,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPhp,
  siPostgresql,
  siPrisma,
  siPython,
  siReact,
  siRust,
  siScrumalliance,
  siSqlite,
  siSupabase,
  siTailwindcss,
  siTerraform,
  siTypescript,
  siVite,
  siVuedotjs,
  siHtml5,
  siCss,
  siPandas,
  siSpringboot,
  type SimpleIcon,
} from 'simple-icons'
import { cn } from '@/lib/utils'

/**
 * Logos officiels (Simple Icons, CC0) pour les technos, éditeurs et outils.
 * Clé = libellé tel qu'affiché, normalisé (minuscules, sans espaces ni points).
 */
const MAP: Record<string, SimpleIcon> = {
  react: siReact,
  reactnative: siReact,
  docker: siDocker,
  dockercompose: siDocker,
  nodejs: siNodedotjs,
  node: siNodedotjs,
  typescript: siTypescript,
  javascript: siJavascript,
  python: siPython,
  flutter: siFlutter,
  dart: siDart,
  kotlin: siKotlin,
  android: siAndroid,
  laravel: siLaravel,
  php: siPhp,
  vue: siVuedotjs,
  postgresql: siPostgresql,
  mongodb: siMongodb,
  mysql: siMysql,
  sqlite: siSqlite,
  drift: siSqlite,
  kubernetes: siKubernetes,
  k8s: siKubernetes,
  nginx: siNginx,
  rust: siRust,
  go: siGo,
  nextjs: siNextdotjs,
  nestjs: siNestjs,
  fastapi: siFastapi,
  django: siDjango,
  firebase: siFirebase,
  expo: siExpo,
  supabase: siSupabase,
  prisma: siPrisma,
  tailwind: siTailwindcss,
  tailwindcss: siTailwindcss,
  astro: siAstro,
  vite: siVite,
  terraform: siTerraform,
  git: siGit,
  github: siGithub,
  githubactions: siGithubactions,
  cicd: siGithubactions,
  gitlab: siGitlab,
  google: siGoogle,
  googlecloud: siGooglecloud,
  gemini: siGooglegemini,
  antigravity: siGooglegemini,
  claude: siClaude,
  claudecode: siClaude,
  anthropic: siAnthropic,
  cursor: siCursor,
  mcp: siModelcontextprotocol,
  linux: siLinux,
  linuxfoundationcncf: siLinuxfoundation,
  linuxfoundation: siLinuxfoundation,
  hashicorp: siHashicorp,
  freecodecamp: siFreecodecamp,
  kaggle: siKaggle,
  metaviacoursera: siMeta,
  meta: siMeta,
  googleviacoursera: siGoogle,
  coursera: siCoursera,
  scrumorg: siScrumalliance,
  comptia: siComptia,
  cisco: siCisco,
  html: siHtml5,
  css: siCss,
  pandas: siPandas,
  spring: siSpringboot,
}

const key = (label: string) => label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

export function logoFor(label: string): SimpleIcon | undefined {
  return MAP[key(label)]
}

/** Couleur de marque, sauf si elle est trop sombre pour un fond sombre (on suit alors le texte). */
function brandColor(hex: string) {
  const n = parseInt(hex, 16)
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l < 0.28 ? 'currentColor' : `#${hex}`
}

export function BrandLogo({ name, size = 16, className, mono }: { name: string; size?: number; className?: string; mono?: boolean }) {
  const icon = logoFor(name)
  if (!icon) return null
  return (
    <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" width={size} height={size} className={cn('shrink-0', className)} fill={mono ? 'currentColor' : brandColor(icon.hex)}>
      <path d={icon.path} />
    </svg>
  )
}

/** Marque d'un éditeur : logo officiel s'il existe, sinon monogramme sobre. */
export function ProviderMark({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const icon = logoFor(name)
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-[10px] bg-canvas text-fg shadow-sm', className)} style={{ width: size, height: size }}>
      {icon ? (
        <BrandLogo name={name} size={Math.round(size * 0.5)} />
      ) : (
        <span className="font-semibold tracking-tight text-muted" style={{ fontSize: size * 0.32 }}>
          {name
            .split(/[\s/]+/)
            .filter((w) => /^[A-Za-z]/.test(w))
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()}
        </span>
      )}
    </span>
  )
}

/** Étiquette de techno avec son logo (façon GitHub topics, en plus sobre). */
export function TechChip({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 text-[12px] font-medium text-muted', className)}>
      <BrandLogo name={label} size={12} />
      {label}
    </span>
  )
}
