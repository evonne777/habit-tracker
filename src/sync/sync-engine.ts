import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocalDatabase } from '../data/local-database'
import { mergeSnapshots } from '../lib/records'
import type {
  AppSnapshot,
  CheckIn,
  Habit,
  OutboxOperation,
  SyncResult,
  SyncState
} from '../lib/types'

interface RemoteHabit {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface RemoteCheckIn {
  habit_id: string
  user_id: string
  check_date: string
  completed: boolean
  updated_at: string
}

function toRemoteHabit(habit: Habit) {
  return {
    id: habit.id,
    user_id: habit.userId,
    name: habit.name,
    created_at: habit.createdAt,
    updated_at: habit.updatedAt,
    deleted_at: habit.deletedAt
  }
}

function toRemoteCheckIn(checkIn: CheckIn) {
  return {
    habit_id: checkIn.habitId,
    user_id: checkIn.userId,
    check_date: checkIn.date,
    completed: checkIn.completed,
    updated_at: checkIn.updatedAt
  }
}

function fromRemoteHabit(habit: RemoteHabit): Habit {
  return {
    id: habit.id,
    userId: habit.user_id,
    name: habit.name,
    createdAt: habit.created_at,
    updatedAt: habit.updated_at,
    deletedAt: habit.deleted_at
  }
}

function fromRemoteCheckIn(checkIn: RemoteCheckIn): CheckIn {
  return {
    habitId: checkIn.habit_id,
    userId: checkIn.user_id,
    date: checkIn.check_date,
    completed: checkIn.completed,
    updatedAt: checkIn.updated_at
  }
}

export class SyncEngine {
  private activeSync: Promise<SyncResult> | null = null

  constructor(
    private readonly database: LocalDatabase,
    private readonly client: SupabaseClient,
    private readonly onStateChange: (state: SyncState) => void
  ) {}

  sync(userId: string): Promise<SyncResult> {
    if (!this.activeSync) {
      this.activeSync = this.runSync(userId).finally(() => {
        this.activeSync = null
      })
    }

    return this.activeSync
  }

  private async runSync(userId: string): Promise<SyncResult> {
    if (!navigator.onLine) {
      this.onStateChange('offline')
      return { pulled: 0, pushed: 0 }
    }

    this.onStateChange('syncing')
    try {
      const pushed = await this.pushOutbox(userId)
      const remote = await this.pullRemote(userId)
      const local = await this.database.loadSnapshot()
      const merged = mergeSnapshots(local, remote)
      await this.database.replaceSnapshot(merged)
      await this.database.setMeta(`lastSyncedAt:${userId}`, new Date().toISOString())
      this.onStateChange('synced')
      return { pulled: remote.habits.length + remote.checkIns.length, pushed }
    } catch (error) {
      this.onStateChange('error')
      throw error
    }
  }

  private async pushOutbox(userId: string): Promise<number> {
    const operations = await this.database.getOutbox()
    if (operations.length === 0) {
      return 0
    }

    const habitOperations = operations.filter((operation) => operation.entity === 'habit')
    const checkInOperations = operations.filter((operation) => operation.entity === 'checkin')

    if (habitOperations.length > 0) {
      const { error } = await this.client
        .from('habits')
        .upsert(habitOperations.map((operation) => toRemoteHabit(operation.payload as Habit)))
      if (error) {
        throw error
      }
    }

    if (checkInOperations.length > 0) {
      const { error } = await this.client
        .from('checkins')
        .upsert(checkInOperations.map((operation) => toRemoteCheckIn(operation.payload as CheckIn)))
      if (error) {
        throw error
      }
    }

    const snapshotAfterPush = makeSnapshotForUser(
      operations.map((operation) => operation.payload),
      userId
    )
    await this.database.acknowledgeOperations(operations, snapshotAfterPush)
    return operations.length
  }

  private async pullRemote(userId: string): Promise<AppSnapshot> {
    const [habitsResult, checkInsResult] = await Promise.all([
      this.client.from('habits').select('*').eq('user_id', userId),
      this.client.from('checkins').select('*').eq('user_id', userId)
    ])

    if (habitsResult.error) {
      throw habitsResult.error
    }
    if (checkInsResult.error) {
      throw checkInsResult.error
    }

    return {
      habits: (habitsResult.data as RemoteHabit[]).map(fromRemoteHabit),
      checkIns: (checkInsResult.data as RemoteCheckIn[]).map(fromRemoteCheckIn)
    }
  }
}

function makeSnapshotForUser(payloads: Array<Habit | CheckIn>, userId: string): AppSnapshot {
  const habits: Habit[] = []
  const checkIns: CheckIn[] = []

  for (const payload of payloads) {
    if ('name' in payload) {
      habits.push({ ...payload, userId })
    } else {
      checkIns.push({ ...payload, userId })
    }
  }

  return { habits, checkIns }
}
