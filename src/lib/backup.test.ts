import { describe, expect, it } from 'vitest'
import { createBackup, createImportSnapshot } from './backup'
import type { AppSnapshot, HabitTrackerBackup } from './types'

const current: AppSnapshot = {
  habits: [
    {
      id: 'habit-old',
      userId: 'user-1',
      name: '旧习惯',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      deletedAt: null
    }
  ],
  checkIns: [
    {
      habitId: 'habit-old',
      userId: 'user-1',
      date: '2026-10-04',
      completed: true,
      updatedAt: '2026-10-04T01:00:00.000Z'
    }
  ]
}

const backup: HabitTrackerBackup = {
  app: 'habit-tracker',
  schemaVersion: 1,
  exportedAt: '2026-10-05T00:00:00.000Z',
  habits: [
    {
      id: 'habit-new',
      userId: 'user-1',
      name: '新习惯',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      deletedAt: null
    }
  ],
  checkIns: [
    {
      habitId: 'habit-new',
      userId: 'user-1',
      date: '2026-10-03',
      completed: true,
      updatedAt: '2026-10-03T01:00:00.000Z'
    }
  ]
}

describe('backup rules', () => {
  it('exports only active habits and completed check-ins', () => {
    const exported = createBackup(
      {
        habits: [...current.habits, { ...current.habits[0], id: 'deleted', deletedAt: '2026-10-05T00:00:00.000Z' }],
        checkIns: [...current.checkIns, { ...current.checkIns[0], completed: false }]
      },
      'user-1'
    )

    expect(exported.habits.map((habit) => habit.id)).toEqual(['habit-old'])
    expect(exported.checkIns).toHaveLength(1)
  })

  it('replaces current data and creates remote tombstones for removed records', () => {
    const imported = createImportSnapshot(backup, current, 'user-1', '2026-10-05T02:00:00.000Z')

    expect(imported.habits.find((habit) => habit.id === 'habit-new')?.deletedAt).toBeNull()
    expect(imported.habits.find((habit) => habit.id === 'habit-old')?.deletedAt).toBe(
      '2026-10-05T02:00:00.000Z'
    )
    expect(imported.checkIns.find((checkIn) => checkIn.habitId === 'habit-new')?.completed).toBe(true)
    expect(imported.checkIns.find((checkIn) => checkIn.habitId === 'habit-old')?.completed).toBe(false)
  })
})
