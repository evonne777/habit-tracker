import type { AppSnapshot, CheckIn, Habit } from './types'

export function activeHabits(snapshot: AppSnapshot): Habit[] {
  return snapshot.habits.filter((habit) => habit.deletedAt === null)
}

export function compareUpdatedAt(left: string, right: string): number {
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return left.localeCompare(right)
  }

  return leftTime - rightTime
}

function mergeRecords<T>(
  localRecords: T[],
  remoteRecords: T[],
  getKey: (record: T) => string,
  getUpdatedAt: (record: T) => string
): T[] {
  const merged = new Map<string, T>()

  for (const record of remoteRecords) {
    merged.set(getKey(record), record)
  }

  for (const record of localRecords) {
    const key = getKey(record)
    const remote = merged.get(key)
    if (!remote || compareUpdatedAt(getUpdatedAt(record), getUpdatedAt(remote)) >= 0) {
      merged.set(key, record)
    }
  }

  return [...merged.values()]
}

export function mergeSnapshots(local: AppSnapshot, remote: AppSnapshot): AppSnapshot {
  return {
    habits: mergeRecords(
      local.habits,
      remote.habits,
      (habit) => habit.id,
      (habit) => habit.updatedAt
    ),
    checkIns: mergeRecords(
      local.checkIns,
      remote.checkIns,
      (checkIn) => `${checkIn.habitId}:${checkIn.date}`,
      (checkIn) => checkIn.updatedAt
    )
  }
}

export function upsertHabit(snapshot: AppSnapshot, habit: Habit): AppSnapshot {
  const habits = snapshot.habits.filter((item) => item.id !== habit.id)
  return { ...snapshot, habits: [...habits, habit] }
}

export function upsertCheckIn(snapshot: AppSnapshot, checkIn: CheckIn): AppSnapshot {
  const checkIns = snapshot.checkIns.filter(
    (item) => !(item.habitId === checkIn.habitId && item.date === checkIn.date)
  )
  return { ...snapshot, checkIns: [...checkIns, checkIn] }
}

export function getCheckIn(
  snapshot: AppSnapshot,
  habitId: string,
  date: string
): CheckIn | undefined {
  return snapshot.checkIns.find((item) => item.habitId === habitId && item.date === date)
}

export function isCompleted(
  snapshot: AppSnapshot,
  habitId: string,
  date: string
): boolean {
  return getCheckIn(snapshot, habitId, date)?.completed === true
}

export function completedCount(
  snapshot: AppSnapshot,
  habitIds: string[],
  date: string
): number {
  return habitIds.filter((habitId) => isCompleted(snapshot, habitId, date)).length
}

export function getCompletedDates(snapshot: AppSnapshot, habitId: string): Set<string> {
  return new Set(
    snapshot.checkIns
      .filter((checkIn) => checkIn.habitId === habitId && checkIn.completed)
      .map((checkIn) => checkIn.date)
  )
}
