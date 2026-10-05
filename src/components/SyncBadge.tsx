import { Cloud, CloudOff, LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import type { SyncState } from '../lib/types'

const labels: Record<SyncState, string> = {
  local: '本机模式',
  offline: '离线',
  syncing: '同步中',
  synced: '已同步',
  error: '同步失败'
}

export function SyncBadge({ state }: { state: SyncState }) {
  const Icon =
    state === 'syncing'
      ? LoaderCircle
      : state === 'offline'
        ? WifiOff
        : state === 'error'
          ? TriangleAlert
          : state === 'local'
            ? CloudOff
            : Cloud

  return (
    <span className={`sync-badge sync-${state}`} title={labels[state]}>
      <Icon aria-hidden="true" className={state === 'syncing' ? 'spin' : undefined} size={15} />
      <span>{labels[state]}</span>
    </span>
  )
}
