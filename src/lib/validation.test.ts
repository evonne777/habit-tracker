import { describe, expect, it } from 'vitest'
import { normalizeHabitName, parseBackup, validateHabitName } from './validation'
import type { AppSnapshot, HabitTrackerBackup } from './types'

const snapshot: AppSnapshot = {
  habits: [
    {
      id: 'habit-1',
      userId: 'user-1',
      name: '阅读',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      deletedAt: null
    }
  ],
  checkIns: []
}

describe('habit validation', () => {
  it('normalizes spaces and rejects empty, long, and duplicate names', () => {
    expect(normalizeHabitName('  阅读   笔记  ')).toBe('阅读 笔记')
    expect(validateHabitName('   ', snapshot)).toBe('请输入习惯名称')
    expect(validateHabitName('一'.repeat(31), snapshot)).toContain('不能超过')
    expect(validateHabitName('阅读', snapshot)).toBe('已经有同名习惯')
    expect(validateHabitName('阅读', snapshot, 'habit-1')).toBeNull()
  })

  it('accepts a valid versioned backup and rejects duplicate check-ins', () => {
    const backup: HabitTrackerBackup = {
      app: 'habit-tracker',
      schemaVersion: 1,
      exportedAt: '2026-10-05T00:00:00.000Z',
      habits: snapshot.habits,
      checkIns: [
        {
          habitId: 'habit-1',
          userId: 'old-user',
          date: '2026-10-05',
          completed: true,
          updatedAt: '2026-10-05T01:00:00.000Z'
        }
      ]
    }

    expect(parseBackup(backup, 'user-2').habits[0].userId).toBe('user-2')
    expect(() =>
      parseBackup({ ...backup, checkIns: [...backup.checkIns, ...backup.checkIns] }, 'user-2')
    ).toThrow('重复')
  })

  it('rejects unsupported files and orphan check-ins', () => {
    expect(() => parseBackup({ app: 'other' }, 'user-2')).toThrow('受支持')
    expect(() =>
      parseBackup(
        {
          app: 'habit-tracker',
          schemaVersion: 1,
          exportedAt: '2026-10-05T00:00:00.000Z',
          habits: [],
          checkIns: [
            {
              habitId: 'missing',
              userId: 'old-user',
              date: '2026-10-05',
              completed: true,
              updatedAt: '2026-10-05T01:00:00.000Z'
            }
          ]
        },
        'user-2'
      )
    ).toThrow('找不到对应习惯')
  })
})
