export interface Habit {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CheckIn {
  habitId: string
  userId: string
  date: string
  completed: boolean
  updatedAt: string
}

export interface AppSnapshot {
  habits: Habit[]
  checkIns: CheckIn[]
}

export interface HabitTrackerBackup {
  app: 'habit-tracker'
  schemaVersion: 1
  exportedAt: string
  habits: Habit[]
  checkIns: CheckIn[]
}

export type OutboxEntity = 'habit' | 'checkin'

export interface OutboxOperation {
  key: string
  entity: OutboxEntity
  payload: Habit | CheckIn
  queuedAt: string
}

export type SyncState = 'local' | 'offline' | 'syncing' | 'synced' | 'error'

export interface SyncResult {
  pulled: number
  pushed: number
}

export const EMPTY_SNAPSHOT: AppSnapshot = {
  habits: [],
  checkIns: []
}
