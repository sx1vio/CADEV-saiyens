import '@fontsource-variable/jetbrains-mono/wght.css';
import { Check, Copy } from 'lucide-react';
import { Highlight, type PrismTheme } from 'prism-react-renderer';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';

/** Thème Prism branché sur les tokens : suit le thème clair/sombre. */
const theme: PrismTheme = {
  plain: { color: 'var(--code-fg)', backgroundColor: 'transparent' },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: 'var(--code-comment)', fontStyle: 'italic' },
    },
    {
      types: ['keyword', 'operator', 'important', 'atrule'],
      style: { color: 'var(--code-keyword)' },
    },
    { types: ['string', 'char', 'attr-value', 'inserted'], style: { color: 'var(--code-string)' } },
    { types: ['number', 'boolean', 'constant', 'symbol'], style: { color: 'var(--code-number)' } },
    { types: ['function', 'class-name', 'builtin'], style: { color: 'var(--code-function)' } },
    { types: ['tag', 'selector', 'property', 'attr-name'], style: { color: 'var(--code-tag)' } },
    { types: ['punctuation'], style: { color: 'var(--code-punct)' } },
    { types: ['variable', 'parameter'], style: { color: 'var(--code-fg)' } },
    { types: ['deleted'], style: { color: 'var(--danger)' } },
  ],
};

const LANG_ALIAS: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  py: 'python',
  kt: 'kotlin',
  nginx: 'bash',
  dart: 'clike',
  php: 'markup',
  rust: 'rust',
  text: 'markup',
};

export function CodeBlock({
  code,
  lang = 'text',
  className,
  compact,
}: {
  code: string;
  lang?: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const language = LANG_ALIAS[lang] ?? lang;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[10px] border border-line bg-[var(--code-bg)]',
        className,
      )}
    >
      <div className="flex h-9 items-center justify-between border-b border-line px-3.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-subtle">
          {lang}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
          className="grid size-7 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-3 hover:text-fg"
          aria-label={copied ? 'Copié' : 'Copier le code'}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <Highlight theme={theme} code={code.trimEnd()} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(
              'overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-[1.65]',
              compact && 'max-h-56',
            )}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, k) => (
                  <span key={k} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

/** Markdown assaini (CDC §9) ; les blocs de code passent par CodeBlock. Le code n'est jamais exécuté. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('dh-prose', className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          pre: ({ children: c }) => <>{c}</>,
          code: ({ className: cls, children: c }) => {
            const match = /language-(\w+)/.exec(cls ?? '');
            const text = String(c ?? '');
            if (match || text.includes('\n'))
              return <CodeBlock code={text} lang={match?.[1] ?? 'text'} className="my-3" />;
            return (
              <code className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[0.86em] text-fg">
                {c}
              </code>
            );
          },
          a: ({ href, children: c }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium text-blue-text underline decoration-1 underline-offset-2 hover:decoration-2"
            >
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
