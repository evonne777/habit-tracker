import { beforeEach, describe, expect, it } from 'vitest'
import { LocalDatabase } from './local-database'
import type { CheckIn, Habit } from '../lib/types'

const habit: Habit = {
  id: 'habit-1',
  userId: 'user-1',
  name: '喝水',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  deletedAt: null
}

const checkIn: CheckIn = {
  habitId: 'habit-1',
  userId: 'user-1',
  date: '2026-10-05',
  completed: true,
  updatedAt: '2026-10-05T01:00:00.000Z'
}

describe('local database', () => {
  let database: LocalDatabase

  beforeEach(async () => {
    database = new LocalDatabase()
    await database.clear()
  })

  it('stores habits and check-ins with an outbox', async () => {
    await database.saveHabit(habit)
    await database.saveCheckIn(checkIn)

    const snapshot = await database.loadSnapshot()
    const operations = await database.getOutbox()

    expect(snapshot.habits).toHaveLength(1)
    expect(snapshot.checkIns).toHaveLength(1)
    expect(operations.map((operation) => operation.entity).sort()).toEqual(['checkin', 'habit'])
  })

  it('coalesces repeated operations for the same habit and date', async () => {
    await database.saveCheckIn(checkIn)
    await database.saveCheckIn({
      ...checkIn,
      completed: false,
      updatedAt: '2026-10-05T02:00:00.000Z'
    })

    const operations = await database.getOutbox()
    expect(operations).toHaveLength(1)
    expect((operations[0].payload as CheckIn).completed).toBe(false)
  })

  it('replaces the snapshot and clears old queued work on import', async () => {
    await database.saveHabit(habit)
    await database.replaceSnapshot({ habits: [{ ...habit, name: '晨跑' }], checkIns: [] }, true)

    const snapshot = await database.loadSnapshot()
    const operations = await database.getOutbox()
    expect(snapshot.habits[0].name).toBe('晨跑')
    expect(operations).toHaveLength(1)
    expect(operations[0].entity).toBe('habit')
  })
})
