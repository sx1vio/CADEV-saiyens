import { Clipboard, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Bloc de code avec bouton « Copier » (pré-vol, page des agents IA). */
export function CodeBlock({ code, wrap = false }: { code: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0 rounded-[8px] border border-line bg-surface-1">
      <div className="flex justify-end border-b border-line px-2 py-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted hover:text-fg [&_svg]:size-3.5"
          onClick={() =>
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            })
          }
        >
          {copied ? <ClipboardCheck /> : <Clipboard />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre
        className={cn(
          'p-3 font-mono text-[11.5px] leading-relaxed text-fg',
          wrap ? 'whitespace-pre-wrap break-all' : 'overflow-x-auto',
        )}
      >
        {code}
      </pre>
    </div>
  );
}
