import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ShieldAlert, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { detectTags, maskSecrets, questionQuality } from '@/lib/detect'
import { useQuery } from '@/lib/query'
import { cn, uuid } from '@/lib/utils'
import { enqueue, useNetwork } from '@/offline/network'
import { api, type Question, type Urgency } from '@/services'
import { useSession, useUI } from '@/stores/app'
import { errorText } from './domain'
import { TagPicker } from './TagPicker'
import { Button } from './ui/button'
import { Sheet } from './ui/overlay'
import { Field, Input, Textarea } from './ui/primitives'
import { Segmented } from './ui/segmented'

const LANGS = ['text', 'js', 'ts', 'tsx', 'python', 'php', 'java', 'kotlin', 'dart', 'go', 'rust', 'sql', 'bash', 'yaml', 'json', 'nginx', 'css']

function guessLang(code: string) {
  if (/Traceback|def |import \w+$|\.py/m.test(code)) return 'python'
  if (/server \{|proxy_pass|location \//.test(code)) return 'nginx'
  if (/<\?php|\$\w+->|artisan/.test(code)) return 'php'
  if (/fun |val |Kotlin|\.kt/.test(code)) return 'kotlin'
  if (/Widget|dart:|pubspec/.test(code)) return 'dart'
  if (/SELECT |INSERT |SQLSTATE/i.test(code)) return 'sql'
  if (/^\s*[-\w]+:\s*$|^\s+- (uses|run):/m.test(code)) return 'yaml'
  if (/interface |: string|: number|<\w+>\(/.test(code)) return 'ts'
  if (/const |let |=>|require\(|console\./.test(code)) return 'js'
  if (/^\$ |npm |docker |git /m.test(code)) return 'bash'
  return 'text'
}

/** Formulaire « Je suis bloqué » : 2 étapes courtes, jauge de qualité, étiquettes détectées, secrets masqués. */
export function AskDialog() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const open = useUI((s) => s.askOpen)
  const prefill = useUI((s) => s.askPrefill)
  const setOpen = useUI((s) => s.setAsk)
  const me = useSession((s) => s.user)
  const online = useNetwork((s) => s.browserOnline && s.sim !== 'offline')

  const [step, setStep] = useState<0 | 1>(0)
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [codeLang, setCodeLang] = useState('text')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [urgency, setUrgency] = useState<Urgency>('normal')
  const [body, setBody] = useState('')
  const [tried, setTried] = useState('')
  const [expected, setExpected] = useState('')
  const [environment, setEnvironment] = useState('')
  const [reproUrl, setReproUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ignoreSimilar, setIgnoreSimilar] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setSubmitted(false)
    setIgnoreSimilar(false)
    if (prefill?.tagIds) setTagIds(prefill.tagIds)
    if (prefill?.title) setTitle(prefill.title)
  }, [open, prefill])

  const detected = useMemo(() => detectTags(`${title}\n${code}\n${body}`), [title, code, body])
  const secrets = useMemo(() => maskSecrets(`${code}\n${body}\n${tried}`).found, [code, body, tried])
  const quality = questionQuality({ title, body, tried, codeSnippet: code, environment, tagIds })

  // S7 : questions similaires (au plus 3, ignorables)
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebounced(title.length > 12 ? `${title} ${code.slice(0, 200)}` : ''), 400)
    return () => clearTimeout(id)
  }, [title, code])
  const { data: similar } = useQuery(open && debounced ? `similar:${debounced}:${tagIds.join(',')}` : null, () => api.similarQuestions(debounced, tagIds))

  const errors = {
    title: submitted && title.trim().length < 8 ? t('ask.errors.title') : null,
    tags: submitted && !tagIds.length ? t('ask.errors.tags') : null,
  }

  const reset = () => {
    setTitle('')
    setCode('')
    setCodeLang('text')
    setTagIds([])
    setUrgency('normal')
    setBody('')
    setTried('')
    setExpected('')
    setEnvironment('')
    setReproUrl('')
  }

  const next = () => {
    setSubmitted(true)
    if (title.trim().length < 8 || !tagIds.length) return
    setSubmitted(false)
    setStep(1)
  }

  const publish = async () => {
    if (!me) return
    setBusy(true)
    const clientId = uuid()
    try {
      const r = await enqueue(
        {
          type: 'question',
          payload: {
            title,
            body: body || title,
            tried,
            expected,
            environment,
            codeSnippet: code,
            codeLang,
            reproUrl: reproUrl || undefined,
            urgency,
            tagIds,
            roomId: prefill?.roomId ?? null,
          },
        },
        me.id,
        clientId,
      )
      setOpen(false)
      reset()
      if (r.queued) {
        toast(t('network.queued'), { description: title })
      } else {
        toast.success(t('ask.published'))
        nav(`/sos/${(r.result as Question).id}`)
      }
    } catch (err) {
      toast.error(errorText(t, err))
    } finally {
      setBusy(false)
    }
  }

  const gauge = (
    <div className="rounded-[16px] border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-fg">{t('ask.qualityTitle')}</p>
        <span className={cn('text-sm font-bold tabular', quality.score >= 80 ? 'text-success' : quality.score >= 50 ? 'text-warning' : 'text-subtle')}>{quality.score}%</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn('h-full rounded-full transition-[width,background-color] duration-300', quality.score >= 80 ? 'bg-success' : quality.score >= 50 ? 'bg-warning' : 'bg-accent')}
          style={{ width: `${quality.score}%` }}
        />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-1">
        {quality.checks.map((c) => (
          <li key={c.key} className={cn('flex items-center gap-1.5 text-xs', c.ok ? 'text-fg' : 'text-subtle')}>
            {c.ok ? <CheckCircle2 className="size-3.5 text-success" /> : <Circle className="size-3.5" />}
            {t(`ask.quality.${c.key}`)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">{quality.score >= 80 ? t('ask.qualityGood') : quality.score >= 50 ? t('ask.qualityOk') : t('ask.qualityLow')}</p>
    </div>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      size="lg"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-hero text-on-hero">
            <Zap className="size-4" />
          </span>
          {t('ask.title')}
        </span>
      }
      description={t('ask.subtitle')}
      footer={
        <>
          <p className="mr-auto hidden text-xs text-subtle sm:block">{step === 0 ? t('ask.stepProblem') : t('ask.stepDetails')} · {step + 1}/2</p>
          {step === 1 && (
            <Button variant="ghost" icon={<ArrowLeft />} onClick={() => setStep(0)}>
              {t('common.back')}
            </Button>
          )}
          {step === 0 ? (
            <Button variant="primary" onClick={next}>
              {t('common.continue')}
              <ArrowRight />
            </Button>
          ) : (
            <Button variant="hero" loading={busy} onClick={publish} icon={<Zap />}>
              {busy ? t('ask.publishing') : t('ask.publish')}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[1fr_220px]">
        <div className="flex min-w-0 flex-col gap-5">
          {!online && <p className="rounded-[12px] bg-warning-soft px-3 py-2.5 text-[13px] text-fg">{t('ask.offlineNote')}</p>}
          {step === 0 ? (
            <>
              <Field label={t('ask.titleLabel')} htmlFor="ask-title" error={errors.title}>
                <Input id="ask-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('ask.titlePlaceholder')} aria-invalid={!!errors.title || undefined} maxLength={140} />
              </Field>
              <Field label={t('ask.codeLabel')} htmlFor="ask-code" hint={t('ask.codePlaceholder')}>
                <Textarea
                  id="ask-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    if (codeLang === 'text') setCodeLang(guessLang(e.target.value))
                  }}
                  spellCheck={false}
                  className="min-h-36 font-mono text-[12.5px] leading-relaxed"
                  placeholder={'Error: connect ECONNREFUSED 127.0.0.1:5432'}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="ask-lang" className="text-xs text-subtle">
                    {t('ask.codeLang')}
                  </label>
                  <select id="ask-lang" value={codeLang} onChange={(e) => setCodeLang(e.target.value)} className="h-8 rounded-lg border border-line bg-surface-2 px-2 font-mono text-xs text-fg">
                    {LANGS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </Field>
              {secrets.length > 0 && (
                <p className="flex items-start gap-2 rounded-[12px] bg-success-soft px-3 py-2.5 text-[13px] text-fg">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-success" />
                  {t('ask.secretsMasked', { list: secrets.join(', ') })}
                </p>
              )}
              <Field label={t('ask.tagsLabel')} htmlFor="ask-tags" hint={t('ask.tagsHint')} error={errors.tags}>
                <TagPicker id="ask-tags" value={tagIds} onChange={setTagIds} detected={detected} invalid={!!errors.tags} />
              </Field>
              <Field label={t('ask.urgencyLabel')}>
                <Segmented<Urgency>
                  label={t('ask.urgencyLabel')}
                  value={urgency}
                  onChange={setUrgency}
                  size="sm"
                  items={[
                    { value: 'low', label: t('sos.urgency.low') },
                    { value: 'normal', label: t('sos.urgency.normal') },
                    { value: 'high', label: t('sos.urgency.high') },
                  ]}
                />
              </Field>
              {!ignoreSimilar && !!similar?.length && (
                <div className="rounded-[16px] border border-accent/40 bg-accent-soft p-4">
                  <p className="text-[13px] font-semibold text-fg">{t('ask.similarTitle')}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {similar.map((s) => (
                      <li key={s.id}>
                        <Link to={`/sos/${s.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg py-1 text-sm text-fg hover:underline">
                          {s.status === 'resolved' ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-subtle" />}
                          <span className="line-clamp-1">{s.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Button size="xs" variant="ghost" className="mt-2 -ml-2" onClick={() => setIgnoreSimilar(true)}>
                    {t('ask.similarIgnore')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <Field label={t('ask.goalLabel')} htmlFor="ask-goal">
                <Textarea id="ask-goal" autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('ask.goalPlaceholder')} />
              </Field>
              <Field label={t('ask.triedLabel')} htmlFor="ask-tried">
                <Textarea id="ask-tried" value={tried} onChange={(e) => setTried(e.target.value)} placeholder={t('ask.triedPlaceholder')} className="min-h-20" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('ask.expectedLabel')} htmlFor="ask-expected" optional={t('common.optional')}>
                  <Input id="ask-expected" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={t('ask.expectedPlaceholder')} />
                </Field>
                <Field label={t('ask.envLabel')} htmlFor="ask-env">
                  <Input id="ask-env" value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder={t('ask.envPlaceholder')} />
                </Field>
              </div>
              <Field label={t('ask.reproLabel')} htmlFor="ask-repro" optional={t('common.optional')}>
                <Input id="ask-repro" type="url" inputMode="url" value={reproUrl} onChange={(e) => setReproUrl(e.target.value)} placeholder={t('ask.reproPlaceholder')} />
              </Field>
            </>
          )}
        </div>
        <aside className="order-first sm:order-none">{gauge}</aside>
      </div>
    </Sheet>
  )
}
