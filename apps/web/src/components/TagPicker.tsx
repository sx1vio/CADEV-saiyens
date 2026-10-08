import { Plus, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@/lib/query';
import { cn } from '@/lib/utils';
import { api, type Tag } from '@/services';
import { Input } from './ui/primitives';

export function useTags() {
  return useQuery('tags', () => api.listTags());
}

/** Sélecteur d'étiquettes : sélection en pastilles, suggestions détectées, recherche. */
export function TagPicker({
  value,
  onChange,
  max = 5,
  detected = [],
  placeholder,
  id,
  invalid,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  /** slugs détectés (S9) */
  detected?: string[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
}) {
  const { t } = useTranslation();
  const { data: tags = [] } = useTags();
  const [q, setQ] = useState('');
  const bySlug = useMemo(() => Object.fromEntries(tags.map((x) => [x.slug, x])), [tags]);
  const selected = value.map((id) => tags.find((x) => x.id === id)).filter(Boolean) as Tag[];
  const detectedTags = detected
    .map((s) => bySlug[s])
    .filter((x): x is Tag => !!x && !value.includes(x.id));
  const matches = q
    ? tags
        .filter(
          (x) =>
            !value.includes(x.id) &&
            (x.label.toLowerCase().includes(q.toLowerCase()) || x.slug.includes(q.toLowerCase())),
        )
        .slice(0, 8)
    : [];
  const full = value.length >= max;
  const add = (tag: Tag) => {
    if (full || value.includes(tag.id)) return;
    onChange([...value, tag.id]);
    setQ('');
  };
  return (
    <div className="flex flex-col gap-2.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag.id))}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-accent-strong pr-1.5 pl-2.5 font-mono text-xs font-medium text-on-accent transition-opacity hover:opacity-85"
              aria-label={`${tag.label} ×`}
            >
              {tag.label}
              <X className="size-3.5" />
            </button>
          ))}
        </div>
      )}
      {detectedTags.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-text">
            <Sparkles className="size-3.5" />
            {t('ask.detected')}
          </span>
          {detectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => add(tag)}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-accent bg-accent-soft px-2 font-mono text-xs font-medium text-accent-text transition-colors hover:bg-accent-strong hover:text-on-accent"
            >
              <Plus className="size-3" />
              {tag.label}
            </button>
          ))}
        </div>
      )}
      {!full && (
        <div className="relative">
          <Input
            id={id}
            value={q}
            aria-invalid={invalid || undefined}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) {
                e.preventDefault();
                add(matches[0]);
              }
            }}
            placeholder={placeholder ?? t('onboarding.skillsSearch')}
            autoComplete="off"
          />
          {matches.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1.5 flex flex-wrap gap-1.5 rounded-[14px] border border-line bg-surface-2 p-2 shadow-lg">
              {matches.map((tag, i) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => add(tag)}
                  className={cn(
                    'h-7 rounded-lg px-2.5 font-mono text-xs font-medium transition-colors',
                    i === 0
                      ? 'bg-surface-3 text-fg'
                      : 'text-muted hover:bg-surface-3 hover:text-fg',
                  )}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Grille de choix (onboarding, filtres) : toutes les étiquettes en pastilles cliquables. */
export function TagGrid({
  value,
  onChange,
  max,
  filter = '',
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  filter?: string;
}) {
  const { data: tags = [] } = useTags();
  const shown = tags.filter((x) => !filter || x.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((tag) => {
        const on = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={on}
            disabled={!on && !!max && value.length >= max}
            onClick={() => onChange(on ? value.filter((v) => v !== tag.id) : [...value, tag.id])}
            className={cn(
              'h-9 rounded-[10px] border px-3 font-mono text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95 disabled:opacity-40',
              on
                ? 'border-transparent bg-accent-strong text-on-accent shadow-accent'
                : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
