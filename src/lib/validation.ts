import type { AppSnapshot, HabitTrackerBackup } from './types'
import { activeHabits } from './records'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_HABIT_NAME_LENGTH = 30

export function normalizeHabitName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function validateHabitName(name: string, snapshot: AppSnapshot, exceptId?: string): string | null {
  const normalized = normalizeHabitName(name)

  if (!normalized) {
    return '请输入习惯名称'
  }

  if (normalized.length > MAX_HABIT_NAME_LENGTH) {
    return `习惯名称不能超过 ${MAX_HABIT_NAME_LENGTH} 个字符`
  }

  const duplicate = activeHabits(snapshot).some(
    (habit) => habit.id !== exceptId && habit.name.toLocaleLowerCase() === normalized.toLocaleLowerCase()
  )

  if (duplicate) {
    return '已经有同名习惯'
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

export function parseBackup(value: unknown, expectedUserId: string): HabitTrackerBackup {
  if (!isRecord(value) || value.app !== 'habit-tracker' || value.schemaVersion !== 1) {
    throw new Error('这不是受支持的“习惯打卡”备份文件')
  }

  if (!Array.isArray(value.habits) || !Array.isArray(value.checkIns) || !isIsoTimestamp(value.exportedAt)) {
    throw new Error('备份文件结构不完整')
  }

  const habitIds = new Set<string>()
  const habits = value.habits.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      !isIsoTimestamp(item.createdAt) ||
      !isIsoTimestamp(item.updatedAt) ||
      (item.deletedAt !== null && !isIsoTimestamp(item.deletedAt))
    ) {
      throw new Error(`第 ${index + 1} 个习惯的数据无效`)
    }

    const normalizedName = normalizeHabitName(item.name)
    if (!normalizedName || normalizedName.length > MAX_HABIT_NAME_LENGTH) {
      throw new Error(`第 ${index + 1} 个习惯的名称无效`)
    }

    if (habitIds.has(item.id)) {
      throw new Error('备份中存在重复的习惯')
    }

    habitIds.add(item.id)
    return {
      id: item.id,
      userId: expectedUserId,
      name: normalizedName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt
    }
  })

  const checkInKeys = new Set<string>()
  const checkIns = value.checkIns.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.habitId !== 'string' ||
      typeof item.date !== 'string' ||
      !ISO_DATE_PATTERN.test(item.date) ||
      typeof item.completed !== 'boolean' ||
      !isIsoTimestamp(item.updatedAt)
    ) {
      throw new Error(`第 ${index + 1} 条打卡记录无效`)
    }

    if (!habitIds.has(item.habitId)) {
      throw new Error('备份中有打卡记录找不到对应习惯')
    }

    const key = `${item.habitId}:${item.date}`
    if (checkInKeys.has(key)) {
      throw new Error('备份中存在重复的打卡记录')
    }

    checkInKeys.add(key)
    return {
      habitId: item.habitId,
      userId: expectedUserId,
      date: item.date,
      completed: item.completed,
      updatedAt: item.updatedAt
    }
  })

  const activeNames = new Set<string>()
  for (const habit of habits) {
    if (habit.deletedAt !== null) {
      continue
    }

    const key = habit.name.toLocaleLowerCase()
    if (activeNames.has(key)) {
      throw new Error('备份中存在同名习惯')
    }
    activeNames.add(key)
  }

  return {
    app: 'habit-tracker',
    schemaVersion: 1,
    exportedAt: value.exportedAt,
    habits,
    checkIns
  }
}
