import { CloudOff, MessageSquareText, RefreshCw, RotateCw, Signal, Trash2, Wifi, WifiOff, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errorKey, relativeTime, useLang } from '@/i18n'
import { cn } from '@/lib/utils'
import { cancelQueued, flush, retryQueued, useNetwork, type QueueItem, type SimMode } from '@/offline/network'
import { useUI } from '@/stores/app'
import { Button } from '../ui/button'
import { Sheet } from '../ui/overlay'
import { Badge, StatusDot } from '../ui/primitives'
import { Segmented } from '../ui/segmented'

export function useNetStatus() {
  const browserOnline = useNetwork((s) => s.browserOnline)
  const sim = useNetwork((s) => s.sim)
  const queue = useNetwork((s) => s.queue)
  const syncing = useNetwork((s) => s.syncing)
  const online = browserOnline && sim !== 'offline'
  const errors = queue.filter((q) => q.status === 'error').length
  const pending = queue.length
  const state: 'online' | 'offline' | 'syncing' | 'error' = !online ? 'offline' : syncing ? 'syncing' : errors ? 'error' : 'online'
  return { online, sim, pending, errors, state }
}

/** O3 : indicateur toujours visible. En ligne · Hors ligne · N en attente · Synchronisation · Erreur. */
export function NetworkIndicator({ compact, className }: { compact?: boolean; className?: string }) {
  const { t } = useTranslation()
  const { state, pending, sim } = useNetStatus()
  const setSync = useUI((s) => s.setSync)
  const label =
    state === 'offline'
      ? t('network.offline')
      : state === 'syncing'
        ? t('network.syncing')
        : state === 'error'
          ? t('network.error')
          : sim === '2g'
            ? t('network.sim2g')
            : t('network.online')
  const tone = state === 'offline' ? 'warning' : state === 'error' ? 'danger' : state === 'syncing' ? 'accent' : 'success'
  return (
    <button
      type="button"
      onClick={() => setSync(true)}
      data-tour="network"
      aria-label={`${label}${pending ? ` · ${t('network.pending', { count: pending })}` : ''}`}
      className={cn(
        'relative inline-flex h-8 shrink-0 items-center gap-2 rounded-[6px] px-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg',
        compact && 'w-8 justify-center px-0',
        className,
      )}
    >
      {state === 'syncing' ? <RefreshCw className="size-3.5 animate-spin text-accent-text" /> : <StatusDot tone={tone} pulse={state !== 'online'} />}
      {!compact && <span>{label}</span>}
      {!compact && pending > 0 && (
        <Badge tone={state === 'error' ? 'danger' : 'warning'} size="sm" className="tabular">
          {pending}
        </Badge>
      )}
      {compact && pending > 0 && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-badge ring-2 ring-canvas" />}
    </button>
  )
}

/** Bandeau hors ligne, sous la barre du haut. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const { online, sim } = useNetStatus()
  const setSim = useNetwork((s) => s.setSim)
  if (online) return null
  return (
    <div role="status" className="flex items-center gap-3 border-b border-line bg-warning-soft px-4 py-2 text-[13px] text-fg sm:px-6">
      <CloudOff className="size-4 shrink-0 text-warning" />
      <p className="min-w-0 flex-1">{sim === 'offline' ? t('network.bannerSim') : t('network.bannerOffline')}</p>
      {sim === 'offline' && (
        <Button size="xs" variant="secondary" onClick={() => setSim('off')}>
          {t('network.bannerSimAction')}
        </Button>
      )}
    </div>
  )
}

const TYPE_ICON = { question: Zap, answer: MessageSquareText, message: MessageSquareText, 'take-task': Signal }

function preview(item: QueueItem) {
  switch (item.type) {
    case 'question':
      return item.payload.title
    case 'answer':
      return item.payload.questionTitle
    case 'message':
      return `${item.payload.roomName} · ${item.payload.body.slice(0, 60)}`
    case 'take-task':
      return item.payload.taskTitle
  }
}

/** O8 : centre de synchronisation + O5 : simulateur de réseau. */
export function SyncCenter() {
  const { t } = useTranslation()
  const lang = useLang()
  const open = useUI((s) => s.syncOpen)
  const setOpen = useUI((s) => s.setSync)
  const queue = useNetwork((s) => s.queue)
  const sim = useNetwork((s) => s.sim)
  const setSim = useNetwork((s) => s.setSim)
  const last = useNetwork((s) => s.lastSync)
  const { online } = useNetStatus()
  return (
    <Sheet open={open} onOpenChange={setOpen} title={t('network.centerTitle')} description={t('network.centerSubtitle')} side="right" size="sm">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface-2 p-4">
          <div className="flex items-center gap-2">
            {online ? <Wifi className="size-4 text-success" /> : <WifiOff className="size-4 text-warning" />}
            <h3 className="text-sm font-semibold text-fg">{t('network.simulator')}</h3>
          </div>
          <p className="text-[13px] text-muted">{t('network.simHint')}</p>
          <Segmented<SimMode>
            label={t('network.simulator')}
            value={sim}
            onChange={setSim}
            size="sm"
            glow
            items={[
              { value: 'off', label: t('network.simOff') },
              { value: 'offline', label: t('network.simOffline') },
              { value: '2g', label: t('network.sim2gLabel') },
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="label-caps">{t('network.pending', { count: queue.length })}</h3>
            {queue.length > 0 && online && (
              <Button size="xs" variant="pill" icon={<RotateCw />} onClick={() => void flush()}>
                {t('network.syncNow')}
              </Button>
            )}
          </div>
          {queue.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">{t('network.centerEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {queue.map((item) => {
                const Icon = TYPE_ICON[item.type]
                return (
                  <li key={item.id} className="flex items-start gap-3 rounded-[14px] border border-line bg-surface-2 p-3">
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-[10px]', item.status === 'error' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>
                      {item.status === 'syncing' ? <RefreshCw className="size-4 animate-spin" /> : <Icon className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-subtle">
                        {t(`network.type.${item.type}`)} · {relativeTime(item.createdAt, lang)}
                      </p>
                      <p className="truncate text-sm text-fg">{preview(item)}</p>
                      {item.error && <p className="mt-0.5 text-xs text-danger">{t(errorKey(item.error), { defaultValue: t('errors.generic') })}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {item.status === 'error' && (
                        <Button size="icon-sm" variant="ghost" aria-label={t('common.retry')} onClick={() => void retryQueued(item.id)}>
                          <RotateCw />
                        </Button>
                      )}
                      <Button size="icon-sm" variant="ghost" aria-label={t('common.cancel')} onClick={() => void cancelQueued(item.id)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {last && <p className="text-xs text-subtle">{t('network.lastSync', { sent: last.sent, failed: last.failed })}</p>}
        </section>
      </div>
    </Sheet>
  )
}
