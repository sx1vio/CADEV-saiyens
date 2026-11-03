import { Check, ExternalLink, LayoutTemplate, Scale, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { DeployToSystalink } from '@/components/systalink';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/overlay';
import { CodeBlock } from '@/components/ui/code';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/platform/data/templates';
import { TechChip } from '@/platform/logos';
import { usePlatform } from '@/platform/store';
import type { Template } from '@/platform/types';
import { Chips, SERVICE_COLORS, ServiceHeader, TemplatePreview } from '@/platform/ui';

type Cat = Template['category'] | 'all';

/** Galerie de templates de départ, reliés au guide « Créer avec l'IA ». */
export default function Templates() {
  const [cat, setCat] = useState<Cat>('all');
  const [open, setOpen] = useState<Template | null>(null);
  const list = TEMPLATES.filter((t) => cat === 'all' || t.category === cat);
  return (
    <div className="dh-page mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
      <ServiceHeader
        icon={LayoutTemplate}
        color={SERVICE_COLORS.templates}
        title="Templates"
        subtitle="Les starters officiels des frameworks, avec la commande de leur documentation. Pars de là plutôt que d’une page blanche, puis suis le guide « Créer avec l’IA »."
      />
      <Chips className="mt-5" items={TEMPLATE_CATEGORIES} value={cat} onChange={setCat} />
      <div className="mt-5 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpen(t)}
            className="group flex flex-col gap-3 text-left"
          >
            <TemplatePreview tpl={t} className="transition-[border-color] group-" />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-fg group-hover:underline">
                  {t.name}
                </h3>
                <p className="line-clamp-2 text-[13px] text-muted">{t.summary}</p>
              </div>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-success">
                {t.license}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {t.stack.map((s) => (
                <TechChip key={s} label={s} />
              ))}
              <span className="ml-auto text-[12.5px] text-subtle">{t.publisher}</span>
            </div>
          </button>
        ))}
      </div>
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open?.name ?? ''}
        size="lg"
      >
        {open && <TemplateDetail tpl={open} onClose={() => setOpen(null)} />}
      </Sheet>
    </div>
  );
}

function TemplateDetail({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const nav = useNavigate();
  const setTrack = usePlatform((s) => s.setGuideTrack);
  const cmd = tpl.command;
  return (
    <div className="flex flex-col gap-5">
      <TemplatePreview tpl={tpl} />
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-subtle">
        <span className="font-semibold text-fg">{tpl.publisher}</span>
        <span className="inline-flex items-center gap-1">
          <Scale className="size-3.5" />
          Licence {tpl.license}
        </span>
        <a
          href={tpl.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline"
        >
          Documentation officielle
          <ExternalLink className="size-3.5" />
        </a>
        {tpl.repo && (
          <a
            href={tpl.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline"
          >
            Code source
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <p className="text-[14px] text-fg">{tpl.summary}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tpl.features.map((f) => (
          <li key={f} className="flex gap-2 text-[14px] text-muted">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-fg">
          Créer le projet (commande officielle)
        </p>
        <CodeBlock code={cmd} lang="bash" compact />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(cmd).then(() => toast.success('Commande copiée'));
          }}
        >
          Copier la commande
        </Button>
        <DeployToSystalink from="templates" className="h-10" />
        <Button
          variant="primary"
          icon={<Wand2 />}
          onClick={() => {
            setTrack(tpl.track);
            onClose();
            nav('/creer?etape=setup');
          }}
        >
          Construire avec le guide IA
        </Button>
      </div>
    </div>
  );
}
