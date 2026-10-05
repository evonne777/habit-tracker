import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  dangerous?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  dangerous = false,
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="button button-secondary" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`button ${dangerous ? 'button-danger' : 'button-primary'}`}
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {dangerous ? <AlertTriangle aria-hidden="true" size={18} /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  )
}
