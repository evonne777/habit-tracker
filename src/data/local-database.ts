import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSnapshot, CheckIn, Habit, OutboxOperation } from '../lib/types'

interface HabitTrackerDatabase extends DBSchema {
  habits: {
    key: string
    value: Habit
  }
  checkIns: {
    key: string
    value: CheckIn
  }
  outbox: {
    key: string
    value: OutboxOperation
  }
  meta: {
    key: string
    value: string
  }
}

const DATABASE_NAME = 'habit-tracker'
const DATABASE_VERSION = 1

function checkInKey(checkIn: Pick<CheckIn, 'habitId' | 'date'>): string {
  return `${checkIn.habitId}:${checkIn.date}`
}

export class LocalDatabase {
  private dbPromise: Promise<IDBPDatabase<HabitTrackerDatabase>> | null = null

  private getDatabase(): Promise<IDBPDatabase<HabitTrackerDatabase>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<HabitTrackerDatabase>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(database) {
          database.createObjectStore('habits', { keyPath: 'id' })
          database.createObjectStore('checkIns', { keyPath: ['habitId', 'date'] })
          database.createObjectStore('outbox', { keyPath: 'key' })
          database.createObjectStore('meta')
        }
      })
    }

    return this.dbPromise
  }

  async loadSnapshot(): Promise<AppSnapshot> {
    const database = await this.getDatabase()
    const transaction = database.transaction(['habits', 'checkIns'], 'readonly')
    const [habits, checkIns] = await Promise.all([
      transaction.objectStore('habits').getAll(),
      transaction.objectStore('checkIns').getAll()
    ])
    await transaction.done
    return { habits, checkIns }
  }

  async saveHabit(habit: Habit, queue = true): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(['habits', 'outbox'], 'readwrite')
    await transaction.objectStore('habits').put(habit)

    if (queue) {
      await transaction.objectStore('outbox').put({
        key: `habit:${habit.id}`,
        entity: 'habit',
        payload: habit,
        queuedAt: habit.updatedAt
      })
    }

    await transaction.done
  }

  async saveCheckIn(checkIn: CheckIn, queue = true): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(['checkIns', 'outbox'], 'readwrite')
    await transaction.objectStore('checkIns').put(checkIn)

    if (queue) {
      const key = checkInKey(checkIn)
      await transaction.objectStore('outbox').put({
        key: `checkin:${key}`,
        entity: 'checkin',
        payload: checkIn,
        queuedAt: checkIn.updatedAt
      })
    }

    await transaction.done
  }

  async replaceSnapshot(snapshot: AppSnapshot, queueAll = false): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(['habits', 'checkIns', 'outbox'], 'readwrite')
    const habitsStore = transaction.objectStore('habits')
    const checkInsStore = transaction.objectStore('checkIns')
    const outboxStore = transaction.objectStore('outbox')

    const clearTasks = [habitsStore.clear(), checkInsStore.clear()]
    if (queueAll) {
      clearTasks.push(outboxStore.clear())
    }
    await Promise.all(clearTasks)

    for (const habit of snapshot.habits) {
      await habitsStore.put(habit)
      if (queueAll) {
        await outboxStore.put({
          key: `habit:${habit.id}`,
          entity: 'habit',
          payload: habit,
          queuedAt: habit.updatedAt
        })
      }
    }

    for (const checkIn of snapshot.checkIns) {
      await checkInsStore.put(checkIn)
      if (queueAll) {
        const key = checkInKey(checkIn)
        await outboxStore.put({
          key: `checkin:${key}`,
          entity: 'checkin',
          payload: checkIn,
          queuedAt: checkIn.updatedAt
        })
      }
    }

    await transaction.done
  }

  async getOutbox(): Promise<OutboxOperation[]> {
    const database = await this.getDatabase()
    return database.getAll('outbox')
  }

  async acknowledgeOperations(operations: OutboxOperation[], snapshotAfterPush: AppSnapshot): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(['habits', 'checkIns', 'outbox'], 'readwrite')
    const habitsStore = transaction.objectStore('habits')
    const checkInsStore = transaction.objectStore('checkIns')
    const outboxStore = transaction.objectStore('outbox')
    const habitMap = new Map(snapshotAfterPush.habits.map((habit) => [habit.id, habit]))
    const checkInMap = new Map(snapshotAfterPush.checkIns.map((checkIn) => [checkInKey(checkIn), checkIn]))

    for (const operation of operations) {
      const current =
        operation.entity === 'habit'
          ? habitMap.get((operation.payload as Habit).id)
          : checkInMap.get(checkInKey(operation.payload as CheckIn))
      const sameUpdatedAt = current?.updatedAt === operation.payload.updatedAt

      if (sameUpdatedAt) {
        await outboxStore.delete(operation.key)
        if (operation.entity === 'habit') {
          await habitsStore.put({ ...(operation.payload as Habit), userId: current.userId })
        } else {
          await checkInsStore.put({ ...(operation.payload as CheckIn), userId: current.userId })
        }
      }
    }

    await transaction.done
  }

  async getMeta(key: string): Promise<string | undefined> {
    const database = await this.getDatabase()
    return database.get('meta', key)
  }

  async setMeta(key: string, value: string): Promise<void> {
    const database = await this.getDatabase()
    await database.put('meta', value, key)
  }

  async clear(): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(['habits', 'checkIns', 'outbox', 'meta'], 'readwrite')
    await Promise.all([
      transaction.objectStore('habits').clear(),
      transaction.objectStore('checkIns').clear(),
      transaction.objectStore('outbox').clear(),
      transaction.objectStore('meta').clear()
    ])
    await transaction.done
  }
}

export async function deleteLocalDatabase(): Promise<void> {
  await deleteDB(DATABASE_NAME)
}
