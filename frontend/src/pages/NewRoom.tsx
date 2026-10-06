import { CheckCircle2, FolderPlus, Loader2, X, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Djeli } from '@/components/djeli'
import { errorText, PageHeader } from '@/components/domain'
import { GitHubIcon } from '@/components/icons'
import { TagPicker } from '@/components/TagPicker'
import { Button } from '@/components/ui/button'
import { Card, Field, Input, Textarea } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/segmented'
import { invalidate } from '@/lib/query'
import { requireNetwork } from '@/offline/network'
import { api, type RoomState } from '@/services'
import { Page } from './_layout'

/** R1 : ouvrir une salle reliée à un dépôt GitHub vérifié. */
export default function NewRoom() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [repo, setRepo] = useState('')
  const [check, setCheck] = useState<'idle' | 'loading' | 'ok' | 'ko' | 'offline'>('idle')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [state, setState] = useState<RoomState>('building')
  const [demoUrl, setDemoUrl] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [role, setRole] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const repoOk = /^[\w.-]+\/[\w.-]+$/.test(repo.trim())
  const errors = {
    repo: submitted && !repoOk ? t('newRoom.errors.repo') : null,
    name: submitted && name.trim().length < 3 ? t('newRoom.errors.name') : null,
    tags: submitted && !tagIds.length ? t('newRoom.errors.tags') : null,
  }

  const verify = async () => {
    const full = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
    setRepo(full)
    if (!/^[\w.-]+\/[\w.-]+$/.test(full)) return
    setCheck('loading')
    try {
      const r = await api.verifyRepo(full)
      setCheck(r.ok ? 'ok' : 'ko')
      if (r.ok) {
        if (!name) setName(full.split('/')[1])
        if (!tagline && r.description) setTagline(r.description.slice(0, 120))
      }
    } catch {
      setCheck('offline')
    }
  }

  const submit = async () => {
    setSubmitted(true)
    if (!repoOk || name.trim().length < 3 || !tagIds.length) return
    setBusy(true)
    try {
      requireNetwork()
      const room = await api.createRoom({ name, tagline, description, state, repoFullName: repo.trim(), demoUrl: demoUrl || undefined, tagIds, wantedRoles: roles })
      invalidate('')
      toast.success(t('newRoom.created'))
      nav(`/p/${room.inviteCode}?tab=tasks`)
    } catch (e) {
      toast.error(errorText(t, e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page className="max-w-3xl">
      <PageHeader title={t('newRoom.title')} subtitle={t('newRoom.subtitle')} />
      <Card className="mt-6 flex flex-col gap-6 p-5 sm:p-7">
        <Field
          label={t('newRoom.repo')}
          htmlFor="nr-repo"
          error={errors.repo}
          hint={
            check === 'ok' ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="size-3.5" /> {t('newRoom.verified')}
              </span>
            ) : check === 'ko' ? (
              <span className="inline-flex items-center gap-1 text-danger">
                <XCircle className="size-3.5" /> {t('newRoom.notVerified')}
              </span>
            ) : check === 'offline' ? (
              t('newRoom.verifyNeedsNetwork')
            ) : undefined
          }
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <GitHubIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
              <Input
                id="nr-repo"
                value={repo}
                onChange={(e) => {
                  setRepo(e.target.value)
                  setCheck('idle')
                }}
                onBlur={() => repo && check === 'idle' && void verify()}
                placeholder={t('newRoom.repoPlaceholder')}
                className="pl-10 font-mono"
                spellCheck={false}
                autoCapitalize="off"
                aria-invalid={!!errors.repo || undefined}
              />
            </div>
            <Button variant="secondary" onClick={verify} disabled={!repo || check === 'loading'}>
              {check === 'loading' ? <Loader2 className="animate-spin" /> : null}
              {check === 'loading' ? t('newRoom.verifying') : t('newRoom.verify')}
            </Button>
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('newRoom.name')} htmlFor="nr-name" error={errors.name}>
            <Input id="nr-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} maxLength={40} />
          </Field>
          <Field label={t('newRoom.state')}>
            <Segmented<RoomState>
              label={t('newRoom.state')}
              value={state}
              onChange={setState}
              size="sm"
              items={(['idea', 'building', 'beta', 'live'] as RoomState[]).map((s) => ({ value: s, label: t(`projects.state.${s}`) }))}
            />
          </Field>
        </div>
        <Field label={t('newRoom.tagline')} htmlFor="nr-tagline">
          <Input id="nr-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder={t('newRoom.taglinePlaceholder')} maxLength={120} />
        </Field>
        <Field label={t('newRoom.description')} htmlFor="nr-desc">
          <Textarea id="nr-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('newRoom.descriptionPlaceholder')} className="min-h-32" />
        </Field>
        <Field label={t('newRoom.tags')} htmlFor="nr-tags" error={errors.tags}>
          <TagPicker id="nr-tags" value={tagIds} onChange={setTagIds} invalid={!!errors.tags} />
        </Field>
        <Field label={t('newRoom.roles')} htmlFor="nr-roles" optional={t('common.optional')}>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <button key={r} type="button" onClick={() => setRoles(roles.filter((x) => x !== r))} className="inline-flex h-7 items-center gap-1 rounded-lg bg-surface-3 pr-1.5 pl-2.5 text-xs font-medium text-fg">
                  {r}
                  <X className="size-3.5 text-subtle" />
                </button>
              ))}
            </div>
          )}
          <Input
            id="nr-roles"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && role.trim()) {
                e.preventDefault()
                if (!roles.includes(role.trim())) setRoles([...roles, role.trim()].slice(0, 6))
                setRole('')
              }
            }}
            placeholder={t('newRoom.rolesPlaceholder')}
          />
        </Field>
        <Field label={t('newRoom.demoUrl')} htmlFor="nr-demo" hint={t('newRoom.demoHint')} optional={t('common.optional')}>
          <Input id="nr-demo" type="url" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://" />
        </Field>
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted">
            <Djeli pose="laptop" size={48} />
            {t('projects.subtitle')}
          </div>
          <Button variant="primary" size="lg" icon={<FolderPlus />} loading={busy} onClick={submit}>
            {t('newRoom.create')}
          </Button>
        </div>
      </Card>
    </Page>
  )
}
