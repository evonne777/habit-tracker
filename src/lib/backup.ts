import { toLocalIsoDate } from './date'
import type { AppSnapshot, Habit, HabitTrackerBackup } from './types'

export function createBackup(snapshot: AppSnapshot, userId: string): HabitTrackerBackup {
  const activeHabitIds = new Set(
    snapshot.habits.filter((habit) => habit.deletedAt === null).map((habit) => habit.id)
  )

  return {
    app: 'habit-tracker',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    habits: snapshot.habits.filter((habit) => activeHabitIds.has(habit.id)),
    checkIns: snapshot.checkIns.filter(
      (checkIn) => activeHabitIds.has(checkIn.habitId) && checkIn.completed
    )
  }
}

export function downloadBackup(snapshot: AppSnapshot, userId: string): void {
  const backup = createBackup(snapshot, userId)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `habit-backup-${toLocalIsoDate()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function createImportSnapshot(
  backup: HabitTrackerBackup,
  current: AppSnapshot,
  userId: string,
  now = new Date().toISOString()
): AppSnapshot {
  const importedHabits = backup.habits.map<Habit>((habit) => ({
    ...habit,
    userId,
    updatedAt: now,
    deletedAt: null
  }))
  const importedHabitIds = new Set(importedHabits.map((habit) => habit.id))

  const removedHabits: Habit[] = current.habits
    .filter((habit) => habit.deletedAt === null && !importedHabitIds.has(habit.id))
    .map((habit) => ({
      ...habit,
      userId,
      deletedAt: now,
      updatedAt: now
    }))

  const importedCheckIns = backup.checkIns
    .filter((checkIn) => importedHabitIds.has(checkIn.habitId) && checkIn.completed)
    .map((checkIn) => ({
      ...checkIn,
      userId,
      updatedAt: now
    }))
  const importedCheckInKeys = new Set(importedCheckIns.map((item) => `${item.habitId}:${item.date}`))

  const removedCheckIns = current.checkIns
    .filter(
      (checkIn) =>
        checkIn.completed &&
        !importedCheckInKeys.has(`${checkIn.habitId}:${checkIn.date}`)
    )
    .map((checkIn) => ({
      ...checkIn,
      userId,
      completed: false,
      updatedAt: now
    }))

  return {
    habits: [...importedHabits, ...removedHabits],
    checkIns: [...importedCheckIns, ...removedCheckIns]
  }
}
