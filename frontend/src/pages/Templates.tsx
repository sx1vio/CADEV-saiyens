import { Check, LayoutTemplate, Star, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/overlay'
import { CodeBlock } from '@/components/ui/code'
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/platform/data/templates'
import { TechChip } from '@/platform/logos'
import { usePlatform } from '@/platform/store'
import type { Template } from '@/platform/types'
import { Chips, DemoTag, PersonLink, SERVICE_COLORS, ServiceHeader, TemplatePreview, compact } from '@/platform/ui'

type Cat = Template['category'] | 'all'

/** Galerie de templates de départ, reliés au guide « Créer avec l'IA ». */
export default function Templates() {
  const [cat, setCat] = useState<Cat>('all')
  const [open, setOpen] = useState<Template | null>(null)
  const list = TEMPLATES.filter((t) => cat === 'all' || t.category === cat)
  return (
    <div className="dh-page mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
      <ServiceHeader icon={LayoutTemplate} color={SERVICE_COLORS.templates} title="Templates" subtitle="Des bases de projets éprouvées, avec leur fichier d’instructions pour agent IA. Pars de là plutôt que d’une page blanche." />
      <Chips className="mt-5" items={TEMPLATE_CATEGORIES} value={cat} onChange={setCat} />
      <div className="mt-5 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <button key={t.id} type="button" onClick={() => setOpen(t)} className="group flex flex-col gap-3 text-left">
            <TemplatePreview tpl={t} className="transition-[border-color] group-" />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-fg group-hover:underline">{t.name}</h3>
                <p className="line-clamp-2 text-[13px] text-muted">{t.summary}</p>
              </div>
              <span className={t.free ? 'rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-success' : 'rounded-full bg-surface-3 px-2 py-0.5 text-[11.5px] font-semibold text-fg'}>{t.free ? 'Gratuit' : 'Premium'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {t.stack.map((s) => (
                <TechChip key={s} label={s} />
              ))}
              <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-subtle">
                <Star className="size-3.5" />
                {compact(t.stars)}
              </span>
            </div>
          </button>
        ))}
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open?.name ?? ''} size="lg">
        {open && <TemplateDetail tpl={open} onClose={() => setOpen(null)} />}
      </Sheet>
    </div>
  )
}

function TemplateDetail({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const nav = useNavigate()
  const setTrack = usePlatform((s) => s.setGuideTrack)
  const cmd = `npx degit devhub-templates/${tpl.id} mon-projet\ncd mon-projet && cp .env.example .env`
  return (
    <div className="flex flex-col gap-5">
      <TemplatePreview tpl={tpl} />
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-subtle">
        <PersonLink handle={tpl.author} size={22} />
        <span>{compact(tpl.uses)} projets créés</span>
        <span className="inline-flex items-center gap-1"><Star className="size-3.5" />{compact(tpl.stars)}</span>
        <DemoTag />
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
        <p className="mb-1.5 text-[13px] font-semibold text-fg">Démarrer en local</p>
        <CodeBlock code={cmd} lang="bash" compact />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(cmd).then(() => toast.success('Commande copiée'))
          }}
        >
          Copier la commande
        </Button>
        <Button
          variant="primary"
          icon={<Wand2 />}
          onClick={() => {
            setTrack(tpl.track)
            onClose()
            nav('/creer?etape=setup')
          }}
        >
          Construire avec le guide IA
        </Button>
      </div>
    </div>
  )
}
