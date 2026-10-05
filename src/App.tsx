import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CalendarDays, Check, Database, Plus, RotateCw } from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DataDialog } from './components/DataDialog'
import { HabitDialog } from './components/HabitDialog'
import { HabitRow } from './components/HabitRow'
import { HistoryMatrix } from './components/HistoryMatrix'
import { ProgressRing } from './components/ProgressRing'
import { RecoveryScreen } from './components/RecoveryScreen'
import { SyncBadge } from './components/SyncBadge'
import { LocalDatabase } from './data/local-database'
import { createImportSnapshot, downloadBackup } from './lib/backup'
import { getAuthErrorMessage, isCloudConfigured, supabase } from './lib/config'
import { formatFullDate, getDateSwitchDelay, toLocalIsoDate } from './lib/date'
import {
  activeHabits,
  completedCount,
  getCheckIn,
  upsertCheckIn,
  upsertHabit
} from './lib/records'
import type { AppSnapshot, CheckIn, Habit, HabitTrackerBackup, SyncState } from './lib/types'
import { EMPTY_SNAPSHOT } from './lib/types'
import { normalizeHabitName, parseBackup, validateHabitName } from './lib/validation'
import { SyncEngine } from './sync/sync-engine'

const LOCAL_USER_ID = 'local-user'

interface HabitDialogState {
  mode: 'add' | 'rename'
  habitId?: string
}

interface ConfirmationState {
  title: string
  message: string
  confirmLabel: string
  dangerous?: boolean
  onConfirm: () => void | Promise<void>
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function LoadingScreen() {
  return (
    <main className="loading-page">
      <span className="loading-mark">
        <Check aria-hidden="true" size={28} strokeWidth={3} />
      </span>
      <span className="loading-text">正在准备你的习惯</span>
    </main>
  )
}

export default function App() {
  const database = useMemo(() => new LocalDatabase(), [])
  const syncEngineRef = useRef<SyncEngine | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isCloudConfigured)
  const [recoveringPassword, setRecoveringPassword] = useState(false)
  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY_SNAPSHOT)
  const [today, setToday] = useState(toLocalIsoDate())
  const [syncState, setSyncState] = useState<SyncState>(isCloudConfigured ? 'syncing' : 'local')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [habitDialog, setHabitDialog] = useState<HabitDialogState | null>(null)
  const [dataDialogOpen, setDataDialogOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  const [pendingImport, setPendingImport] = useState<HabitTrackerBackup | null>(null)

  const userId = session?.user.id ?? LOCAL_USER_ID
  const email = session?.user.email
  const habits = activeHabits(snapshot).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  const completedHabitIds = habits.filter(
    (habit) => getCheckIn(snapshot, habit.id, today)?.completed === true
  )
  const pendingHabits = habits.filter(
    (habit) => getCheckIn(snapshot, habit.id, today)?.completed !== true
  )
  const completedToday = completedCount(
    snapshot,
    habits.map((habit) => habit.id),
    today
  )

  const runSync = useCallback(async () => {
    if (!session || !syncEngineRef.current) {
      return
    }

    try {
      setErrorMessage(null)
      await syncEngineRef.current.sync(session.user.id)
      setSnapshot(await database.loadSnapshot())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '同步失败，请稍后重试')
    }
  }, [database, session])

  const scheduleSync = useCallback(() => {
    if (!session || !syncEngineRef.current) {
      return
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
    }
    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null
      void runSync()
    }, 450)
  }, [runSync, session])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveringPassword(true)
      }
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (authLoading || (isCloudConfigured && !session)) {
      return
    }

    let cancelled = false
    const loadUserData = async () => {
      const previousUserId = await database.getMeta('currentUserId')

      if (previousUserId && previousUserId !== userId) {
        await database.clear()
      }
      await database.setMeta('currentUserId', userId)

      const localSnapshot = await database.loadSnapshot()
      if (!cancelled) {
        setSnapshot(localSnapshot)
      }

      if (!supabase || !session) {
        syncEngineRef.current = null
        setSyncState('local')
        return
      }

      const engine = new SyncEngine(database, supabase, setSyncState)
      syncEngineRef.current = engine
      await engine.sync(userId)
      const mergedSnapshot = await database.loadSnapshot()
      if (!cancelled) {
        setSnapshot(mergedSnapshot)
      }
    }

    void loadUserData().catch((error) => {
      if (!cancelled) {
        setSyncState('error')
        setErrorMessage(error instanceof Error ? error.message : '读取数据失败')
      }
    })

    return () => {
      cancelled = true
    }
  }, [authLoading, database, session, userId])

  useEffect(() => {
    if (!session) {
      return
    }

    const handleOnline = () => void runSync()
    const handleFocus = () => void runSync()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runSync()
      }
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runSync()
      }
    }, 30_000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(interval)
    }
  }, [runSync, session])

  useEffect(() => {
    let timeoutId = 0
    const scheduleDateSwitch = () => {
      setToday(toLocalIsoDate())
      timeoutId = window.setTimeout(scheduleDateSwitch, getDateSwitchDelay())
    }

    scheduleDateSwitch()
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    const handleFocus = () => setToday(toLocalIsoDate())
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const saveHabit = useCallback(
    async (habit: Habit) => {
      const nextSnapshot = upsertHabit(snapshot, habit)
      await database.saveHabit(habit)
      setSnapshot(nextSnapshot)
      scheduleSync()
    },
    [database, scheduleSync, snapshot]
  )

  const handleAddHabit = async (rawName: string) => {
    const name = normalizeHabitName(rawName)
    const validationError = validateHabitName(name, snapshot)
    if (validationError) {
      throw new Error(validationError)
    }

    const now = new Date().toISOString()
    await saveHabit({
      id: createId(),
      userId,
      name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    })
  }

  const handleRenameHabit = async (habit: Habit, rawName: string) => {
    const name = normalizeHabitName(rawName)
    const validationError = validateHabitName(name, snapshot, habit.id)
    if (validationError) {
      throw new Error(validationError)
    }

    await saveHabit({ ...habit, name, updatedAt: new Date().toISOString() })
  }

  const handleDeleteHabit = (habit: Habit) => {
    setConfirmation({
      title: '删除这个习惯？',
      message: `“${habit.name}”以及它的全部打卡记录都会被删除，此操作无法撤销。`,
      confirmLabel: '确认删除',
      dangerous: true,
      onConfirm: async () => {
        const now = new Date().toISOString()
        await saveHabit({ ...habit, deletedAt: now, updatedAt: now })
      }
    })
  }

  const handleToggleToday = async (habit: Habit) => {
    const existing = getCheckIn(snapshot, habit.id, today)
    const checkIn: CheckIn = {
      habitId: habit.id,
      userId,
      date: today,
      completed: !existing?.completed,
      updatedAt: new Date().toISOString()
    }
    await database.saveCheckIn(checkIn)
    setSnapshot((current) => upsertCheckIn(current, checkIn))
    scheduleSync()
  }

  const handleExport = () => {
    downloadBackup(snapshot, userId)
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const backup = parseBackup(JSON.parse(await file.text()), userId)
      setPendingImport(backup)
      setConfirmation({
        title: '导入并替换数据？',
        message: '当前习惯和打卡记录会被备份文件替换；若设备上还有未同步的修改，也会被覆盖。',
        confirmLabel: '确认导入',
        onConfirm: () => {
          const importedSnapshot = createImportSnapshot(backup, snapshot, userId)
          setSnapshot(importedSnapshot)
          setPendingImport(null)
          void database
            .replaceSnapshot(importedSnapshot, true)
            .then(() => scheduleSync())
            .catch((error) => setErrorMessage(error instanceof Error ? error.message : '导入失败'))
        }
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '无法读取这个备份文件')
    }
  }

  const handleSignOut = async () => {
    const client = supabase
    if (!client) {
      return
    }

    try {
      const pendingOperations = await database.getOutbox()
      if (pendingOperations.length > 0) {
        setConfirmation({
          title: '还有修改未同步',
          message: `当前有 ${pendingOperations.length} 项修改尚未同步到云端。退出登录会清除本机缓存，这些修改可能无法恢复。`,
          confirmLabel: '仍然退出',
          dangerous: true,
          onConfirm: async () => {
            await database.clear()
            await client.auth.signOut()
          }
        })
        return
      }

      await database.clear()
      await client.auth.signOut()
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error instanceof Error ? error.message : ''))
    }
  }

  const editingHabit =
    habitDialog?.mode === 'rename' && habitDialog.habitId
      ? habits.find((habit) => habit.id === habitDialog.habitId)
      : undefined

  if (authLoading) {
    return <LoadingScreen />
  }

  if (recoveringPassword) {
    return <RecoveryScreen onComplete={() => setRecoveringPassword(false)} />
  }

  if (isCloudConfigured && !session) {
    return <AuthScreen />
  }

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <Check aria-hidden="true" size={21} strokeWidth={3} />
            </span>
            <h1>习惯打卡</h1>
          </div>
          <div className="topbar-actions">
            <SyncBadge state={syncState} />
            <button
              aria-label="数据与账号"
              className="icon-button topbar-button"
              title="数据与账号"
              type="button"
              onClick={() => setDataDialogOpen(true)}
            >
              <Database aria-hidden="true" size={19} />
            </button>
          </div>
        </header>

        <main className="main-content">
          {errorMessage ? (
            <div className="notice notice-error" role="alert">
              <span>{errorMessage}</span>
              {session ? (
                <button aria-label="重新同步" className="icon-button" title="重新同步" type="button" onClick={runSync}>
                  <RotateCw aria-hidden="true" size={17} />
                </button>
              ) : null}
            </div>
          ) : null}

          <section className="summary-panel">
            <div className="summary-copy">
              <p className="eyebrow">
                <CalendarDays aria-hidden="true" size={15} />
                {formatFullDate(today)}
              </p>
              <h2>{habits.length > 0 && completedToday === habits.length ? '今天全部完成' : '今天，继续向前'}</h2>
              <p>
                {habits.length === 0
                  ? '从一个想坚持的小习惯开始'
                  : `已完成 ${completedToday} 项，还剩 ${habits.length - completedToday} 项`}
              </p>
            </div>
            <ProgressRing completed={completedToday} total={habits.length} />
          </section>

          <section aria-labelledby="today-title" className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">今日清单</p>
                <h2 id="today-title">我的习惯</h2>
              </div>
              <button
                aria-label="添加习惯"
                className="icon-button add-button"
                title="添加习惯"
                type="button"
                onClick={() => setHabitDialog({ mode: 'add' })}
              >
                <Plus aria-hidden="true" size={22} />
              </button>
            </div>

            {habits.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">
                  <Plus aria-hidden="true" size={24} />
                </span>
                <h3>还没有习惯</h3>
                <button className="button button-primary" type="button" onClick={() => setHabitDialog({ mode: 'add' })}>
                  <Plus aria-hidden="true" size={18} />
                  添加第一个习惯
                </button>
              </div>
            ) : (
              <div className="habit-groups">
                {pendingHabits.length > 0 ? (
                  <div className="habit-group">
                    <div className="group-label">
                      <span>待完成</span>
                      <span>{pendingHabits.length}</span>
                    </div>
                    {pendingHabits.map((habit) => (
                      <HabitRow
                        completed={false}
                        habit={habit}
                        key={habit.id}
                        onDelete={() => handleDeleteHabit(habit)}
                        onRename={() => setHabitDialog({ mode: 'rename', habitId: habit.id })}
                        onToggle={() => void handleToggleToday(habit)}
                      />
                    ))}
                  </div>
                ) : null}

                {completedHabitIds.length > 0 ? (
                  <div className="habit-group completed-group">
                    <div className="group-label">
                      <span>已完成</span>
                      <span>{completedHabitIds.length}</span>
                    </div>
                    {completedHabitIds.map((habit) => (
                      <HabitRow
                        completed
                        habit={habit}
                        key={habit.id}
                        onDelete={() => handleDeleteHabit(habit)}
                        onRename={() => setHabitDialog({ mode: 'rename', habitId: habit.id })}
                        onToggle={() => void handleToggleToday(habit)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <HistoryMatrix snapshot={snapshot} today={today} />
        </main>

        {habits.length > 0 && !habitDialog && !dataDialogOpen && !confirmation ? (
          <button
            aria-label="添加习惯"
            className="floating-add"
            title="添加习惯"
            type="button"
            onClick={() => setHabitDialog({ mode: 'add' })}
          >
            <Plus aria-hidden="true" size={24} />
          </button>
        ) : null}
      </div>

      <input
        ref={importInputRef}
        accept="application/json,.json"
        className="visually-hidden"
        type="file"
        onChange={handleImportFile}
      />

      {habitDialog ? (
        <HabitDialog
          initialName={editingHabit?.name}
          mode={habitDialog.mode}
          onClose={() => setHabitDialog(null)}
          onSubmit={(name) =>
            habitDialog.mode === 'add'
              ? handleAddHabit(name)
              : handleRenameHabit(editingHabit as Habit, name)
          }
          validate={(name) => validateHabitName(name, snapshot, editingHabit?.id)}
        />
      ) : null}

      {dataDialogOpen ? (
        <DataDialog
          email={email}
          isLocalMode={!isCloudConfigured}
          onClose={() => setDataDialogOpen(false)}
          onExport={handleExport}
          onImport={() => {
            setDataDialogOpen(false)
            importInputRef.current?.click()
          }}
          onSignOut={() => {
            setDataDialogOpen(false)
            void handleSignOut()
          }}
        />
      ) : null}

      {confirmation ? (
        <ConfirmDialog
          confirmLabel={confirmation.confirmLabel}
          dangerous={confirmation.dangerous}
          message={confirmation.message}
          onClose={() => {
            setConfirmation(null)
            if (pendingImport) {
              setPendingImport(null)
            }
          }}
          onConfirm={confirmation.onConfirm}
          title={confirmation.title}
        />
      ) : null}
    </>
  )
}
