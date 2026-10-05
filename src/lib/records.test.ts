import { describe, expect, it } from 'vitest'
import {
  activeHabits,
  completedCount,
  getCompletedDates,
  isCompleted,
  mergeSnapshots,
  upsertCheckIn,
  upsertHabit
} from './records'
import type { AppSnapshot, CheckIn, Habit } from './types'

const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'habit-1',
  userId: 'user-1',
  name: '阅读',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  deletedAt: null,
  ...overrides
})

const checkIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  habitId: 'habit-1',
  userId: 'user-1',
  date: '2026-10-05',
  completed: true,
  updatedAt: '2026-10-05T01:00:00.000Z',
  ...overrides
})

describe('record rules', () => {
  it('filters deleted habits and replaces records by entity key', () => {
    const snapshot = upsertHabit(
      { habits: [habit()], checkIns: [] },
      habit({ name: '夜间阅读', updatedAt: '2026-10-03T00:00:00.000Z' })
    )
    expect(snapshot.habits).toHaveLength(1)
    expect(snapshot.habits[0].name).toBe('夜间阅读')

    expect(activeHabits({ habits: [habit({ deletedAt: '2026-10-04T00:00:00.000Z' })], checkIns: [] })).toHaveLength(0)
  })

  it('uses last-write-wins for remote and local records', () => {
    const local: AppSnapshot = {
      habits: [habit({ name: '本地名称', updatedAt: '2026-10-05T03:00:00.000Z' })],
      checkIns: [checkIn({ updatedAt: '2026-10-05T03:00:00.000Z' })]
    }
    const remote: AppSnapshot = {
      habits: [habit({ name: '云端名称', updatedAt: '2026-10-05T02:00:00.000Z' })],
      checkIns: [checkIn({ completed: false, updatedAt: '2026-10-05T04:00:00.000Z' })]
    }

    const merged = mergeSnapshots(local, remote)
    expect(merged.habits[0].name).toBe('本地名称')
    expect(merged.checkIns[0].completed).toBe(false)
  })

  it('keeps uncheck tombstones instead of deleting records', () => {
    const initial: AppSnapshot = { habits: [habit()], checkIns: [checkIn()] }
    const updated = upsertCheckIn(initial, checkIn({ completed: false, updatedAt: '2026-10-05T05:00:00.000Z' }))

    expect(updated.checkIns).toHaveLength(1)
    expect(isCompleted(updated, 'habit-1', '2026-10-05')).toBe(false)
    expect(getCompletedDates(updated, 'habit-1').size).toBe(0)
  })

  it('counts completed habits for one date', () => {
    const snapshot: AppSnapshot = {
      habits: [habit(), habit({ id: 'habit-2' })],
      checkIns: [checkIn()]
    }
    expect(completedCount(snapshot, ['habit-1', 'habit-2'], '2026-10-05')).toBe(1)
  })
})
