import { Check } from 'lucide-react'
import { formatShortDate, getRecentDates, isDateBefore, toLocalIsoDate } from '../lib/date'
import { activeHabits, isCompleted } from '../lib/records'
import type { AppSnapshot } from '../lib/types'

interface HistoryMatrixProps {
  snapshot: AppSnapshot
  today: string
}

export function HistoryMatrix({ snapshot, today }: HistoryMatrixProps) {
  const habits = activeHabits(snapshot)
  const dates = getRecentDates(7, new Date(`${today}T12:00:00`))

  if (habits.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="history-title" className="panel history-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">最近 7 天</p>
          <h2 id="history-title">完成记录</h2>
        </div>
      </div>
      <div className="history-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th scope="col">习惯</th>
              {dates.map((date) => (
                <th className={date === today ? 'history-today' : undefined} key={date} scope="col">
                  {date === today ? '今天' : formatShortDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => {
              const createdAt = toLocalIsoDate(new Date(habit.createdAt))
              return (
                <tr key={habit.id}>
                  <th scope="row">{habit.name}</th>
                  {dates.map((date) => {
                    const beforeCreation = isDateBefore(date, createdAt)
                    const completed = !beforeCreation && isCompleted(snapshot, habit.id, date)
                    const label = beforeCreation
                      ? `${habit.name}，${date}，尚未创建`
                      : `${habit.name}，${date}，${completed ? '已完成' : '未完成'}`
                    return (
                      <td className={date === today ? 'history-today' : undefined} key={date}>
                        <span
                          aria-label={label}
                          className={`history-mark ${completed ? 'history-mark-completed' : ''} ${
                            beforeCreation ? 'history-mark-created' : ''
                          }`}
                          role="img"
                          title={label}
                        >
                          {completed ? <Check aria-hidden="true" size={14} strokeWidth={3} /> : null}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
