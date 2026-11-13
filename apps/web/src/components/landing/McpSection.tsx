import {
  Briefcase,
  ChatsCircle,
  FolderSimple,
  AirplaneTakeoff,
  Plug,
  Newspaper,
} from '@phosphor-icons/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

/* ==================================================================
   Landing : le serveur MCP de DevHub (11/11/2026). L'agent IA du dev (Claude Code, Cursor,
   Codex…) se branche sur la plateforme et agit en son nom. Exemples tirés des vrais outils
   (docs/guides/mcp.md) ; la conversation montrée est une illustration, signalée comme telle.
   ================================================================== */

const CAN = [
  { icon: AirplaneTakeoff, text: 'Lancer un pré-vol et corriger ce qu’il trouve' },
  { icon: Briefcase, text: 'Trouver une offre et préparer ta candidature' },
  { icon: ChatsCircle, text: 'Répondre aux questions que tu sais résoudre' },
  { icon: Newspaper, text: 'Publier ton avancée, suivre l’actu tech' },
  { icon: FolderSimple, text: 'Prendre une tâche d’un projet, livrer la PR' },
];

const AGENTS = ['Claude Code', 'Cursor', 'Codex', 'Windsurf', 'VS Code'];

export function McpSection() {
  return (
    <section aria-labelledby="mcp-title" className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent-text">
            <Plug weight="fill" className="size-4" />
            Agents IA
          </p>
          <h2
            id="mcp-title"
            className="mt-2 text-[34px] leading-[1.06] font-bold tracking-[-0.03em] text-fg sm:text-[48px]"
          >
            DevHub a son serveur MCP.
          </h2>
          <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-fg/80">
            MCP (Model Context Protocol) est le standard qui relie un agent IA à un service. Une
            commande, et ton agent de code agit sur DevHub en ton nom, sans quitter l’éditeur. Il
            voit ce que tu vois, il fait ce que tu ferais, jamais rien sur ton compte ni tes accès.
          </p>
          <ul className="mt-7 flex flex-col gap-3">
            {CAN.map((c) => (
              <li key={c.text} className="flex items-center gap-3 text-[15px] text-fg">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-text">
                  <c.icon weight="fill" className="size-[18px]" />
                </span>
                {c.text}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13.5px] text-fg/65">
            Compatible avec {AGENTS.join(', ')} et tout client MCP. 43 outils, les mêmes droits et
            les mêmes limites que l’application ; tu valides tout ce qui est publié.
          </p>
          <Link
            to="/mcp"
            className="lp-press mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-[15px] font-semibold text-canvas"
          >
            Créer mon jeton
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-[18px] bg-[#0d1117] text-[#e6edf3] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <div className="flex h-9 items-center gap-1.5 border-b border-white/10 px-4">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[12px] text-white/50">terminal</span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed">
              <span className="text-white/45"># 1. Brancher DevHub (une fois)</span>
              {'\n'}
              <span className="text-[#7ee787]">$</span> claude mcp add --transport http devhub \
              {'\n'}
              {'    '}https://devafrica.tech/api/v1/mcp \{'\n'}
              {'    '}--header{' '}
              <span className="text-[#a5d6ff]">"Authorization: Bearer dh_pat_…"</span>
              {'\n\n'}
              <span className="text-white/45"># 2. Demander, en français</span>
              {'\n'}
              <span className="text-[#d2a8ff]">›</span> Lance un pré-vol sur monapp.sn et corrige.
            </pre>
            <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-4 font-mono text-[12.5px] leading-relaxed">
              <p>
                <span className="text-[#79c0ff]">●</span> devhub ·{' '}
                <span className="text-[#ffa657]">run_preflight</span>
                <span className="text-white/50"> {'{ url: "https://monapp.sn" }'}</span>
              </p>
              <p className="pl-4 text-white/75">
                74/100 · 2 à corriger : en-têtes de sécurité, security.txt
              </p>
              <p>
                <span className="text-[#79c0ff]">●</span> Écrit public/_headers et
                public/.well-known/security.txt, puis relance.
              </p>
              <p>
                <span className="text-[#79c0ff]">●</span> devhub ·{' '}
                <span className="text-[#ffa657]">run_preflight</span>
              </p>
              <p className="pl-4 text-[#7ee787]">92/100 · GO · DevHub Ready ✓</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[12.5px] text-fg/55">
            Exemple d’échange avec un agent, outils réels du serveur MCP DevHub.
          </p>
        </div>
      </div>
    </section>
  );
}
