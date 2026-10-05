import { useEffect, useState, type FormEvent } from 'react'
import { Check, Plus, Save } from 'lucide-react'
import { Modal } from './Modal'

interface HabitDialogProps {
  mode: 'add' | 'rename'
  initialName?: string
  validate: (name: string) => string | null
  onSubmit: (name: string) => Promise<void> | void
  onClose: () => void
}

export function HabitDialog({
  mode,
  initialName = '',
  validate,
  onSubmit,
  onClose
}: HabitDialogProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(initialName)
    setError(null)
  }, [initialName])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationError = validate(name)

    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(name.trim().replace(/\s+/g, ' '))
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={mode === 'add' ? '添加习惯' : '修改习惯'}
      onClose={onClose}
      footer={
        <>
          <button className="button button-secondary" type="button" onClick={onClose}>
            取消
          </button>
          <button className="button button-primary" disabled={submitting} form="habit-form" type="submit">
            {mode === 'add' ? <Plus aria-hidden="true" size={18} /> : <Save aria-hidden="true" size={18} />}
            {submitting ? '保存中' : mode === 'add' ? '添加' : '保存'}
          </button>
        </>
      }
    >
      <form id="habit-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="habit-name">
          习惯名称
        </label>
        <div className={`text-field ${error ? 'text-field-error' : ''}`}>
          <Check aria-hidden="true" size={18} />
          <input
            autoComplete="off"
            autoFocus
            id="habit-name"
            maxLength={31}
            placeholder="例如：阅读 20 分钟"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) {
                setError(null)
              }
            }}
          />
        </div>
        <div className="field-meta">
          <span className="field-error" role="alert">
            {error}
          </span>
          <span>{name.trim().length}/30</span>
        </div>
      </form>
    </Modal>
  )
}
