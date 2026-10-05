import { Database, Download, LogOut, Upload } from 'lucide-react'
import { Modal } from './Modal'

interface DataDialogProps {
  email?: string
  isLocalMode: boolean
  onExport: () => void
  onImport: () => void
  onSignOut: () => void
  onClose: () => void
}

export function DataDialog({
  email,
  isLocalMode,
  onExport,
  onImport,
  onSignOut,
  onClose
}: DataDialogProps) {
  return (
    <Modal title="数据与账号" onClose={onClose}>
      <div className="data-actions">
        <button className="data-action" type="button" onClick={onExport}>
          <span className="data-action-icon data-action-blue">
            <Download aria-hidden="true" size={20} />
          </span>
          <span>
            <strong>导出备份</strong>
            <small>保存为 JSON 文件</small>
          </span>
        </button>
        <button className="data-action" type="button" onClick={onImport}>
          <span className="data-action-icon data-action-green">
            <Upload aria-hidden="true" size={20} />
          </span>
          <span>
            <strong>导入备份</strong>
            <small>替换当前数据</small>
          </span>
        </button>
      </div>
      <div className="account-card">
        <span className="account-icon">
          <Database aria-hidden="true" size={20} />
        </span>
        <div>
          <strong>{isLocalMode ? '本机模式' : email}</strong>
          <small>{isLocalMode ? '配置 Supabase 后可跨设备同步' : '已连接云端同步'}</small>
        </div>
        {!isLocalMode ? (
          <button aria-label="退出登录" className="icon-button" title="退出登录" type="button" onClick={onSignOut}>
            <LogOut aria-hidden="true" size={19} />
          </button>
        ) : null}
      </div>
    </Modal>
  )
}
