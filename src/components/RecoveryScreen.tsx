import { useState, type FormEvent } from 'react'
import { Check, KeyRound, Save } from 'lucide-react'
import { getAuthErrorMessage, supabase } from '../lib/config'

interface RecoveryScreenProps {
  onComplete: () => void
}

export function RecoveryScreen({ onComplete }: RecoveryScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!supabase) {
    return null
  }
  const client = supabase

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await client.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError(getAuthErrorMessage(updateError.message))
      return
    }

    await client.auth.signOut()
    window.history.replaceState({}, '', import.meta.env.BASE_URL)
    onComplete()
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Check aria-hidden="true" size={24} strokeWidth={3} />
          </span>
          <div>
            <p className="eyebrow">账号安全</p>
            <h1>设置新密码</h1>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label className="field-label" htmlFor="new-password">
            新密码
          </label>
          <div className="text-field">
            <KeyRound aria-hidden="true" size={18} />
            <input
              autoComplete="new-password"
              id="new-password"
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className="form-message form-error">{error}</p> : null}
          <button className="button button-primary auth-submit" disabled={submitting} type="submit">
            <Save aria-hidden="true" size={18} />
            {submitting ? '保存中' : '保存新密码'}
          </button>
        </form>
      </section>
    </main>
  )
}
