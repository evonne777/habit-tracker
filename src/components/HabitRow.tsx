import { Check, Pencil, Trash2 } from 'lucide-react'
import type { Habit } from '../lib/types'

interface HabitRowProps {
  habit: Habit
  completed: boolean
  onToggle: () => void
  onRename: () => void
  onDelete: () => void
  disabled?: boolean
}

export function HabitRow({
  habit,
  completed,
  onToggle,
  onRename,
  onDelete,
  disabled = false
}: HabitRowProps) {
  return (
    <article className={`habit-row ${completed ? 'habit-row-completed' : ''}`}>
      <button
        aria-label={`${completed ? '撤销' : '完成'}“${habit.name}”的今日打卡`}
        aria-pressed={completed}
        className="check-button"
        disabled={disabled}
        title={completed ? '撤销打卡' : '完成打卡'}
        type="button"
        onClick={onToggle}
      >
        {completed ? <Check aria-hidden="true" size={21} strokeWidth={3} /> : null}
      </button>
      <div className="habit-name">
        <strong>{habit.name}</strong>
        <span>{completed ? '今日已完成' : '等待完成'}</span>
      </div>
      <div className="habit-actions">
        <button aria-label={`修改“${habit.name}”`} className="icon-button" title="修改" type="button" onClick={onRename}>
          <Pencil aria-hidden="true" size={17} />
        </button>
        <button
          aria-label={`删除“${habit.name}”`}
          className="icon-button icon-button-danger"
          title="删除"
          type="button"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" size={17} />
        </button>
      </div>
    </article>
  )
}
