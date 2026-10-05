import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
import { getAuthErrorMessage, getAuthRedirectUrl, supabase } from '../lib/config'

type AuthMode = 'sign-in' | 'sign-up' | 'reset'

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!supabase) {
    return null
  }
  const client = supabase

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      if (mode === 'reset') {
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl()
        })
        if (resetError) {
          throw resetError
        }
        setMessage('重设密码邮件已发送，请检查邮箱')
      } else if (mode === 'sign-up') {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl()
          }
        })
        if (signUpError) {
          throw signUpError
        }
        if (data.session) {
          setMessage('账号已创建')
        } else {
          setMessage('账号已创建，请打开邮箱完成确认')
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password })
        if (signInError) {
          throw signInError
        }
      }
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError instanceof Error ? submitError.message : ''))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Check aria-hidden="true" size={24} strokeWidth={3} />
          </span>
          <div>
            <p className="eyebrow">同步你的每一天</p>
            <h1>习惯打卡</h1>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="账号操作">
          <button
            aria-selected={mode === 'sign-in'}
            className={mode === 'sign-in' ? 'active' : undefined}
            role="tab"
            type="button"
            onClick={() => setMode('sign-in')}
          >
            登录
          </button>
          <button
            aria-selected={mode === 'sign-up'}
            className={mode === 'sign-up' ? 'active' : undefined}
            role="tab"
            type="button"
            onClick={() => setMode('sign-up')}
          >
            注册
          </button>
        </div>

        {mode === 'reset' ? (
          <button className="back-link" type="button" onClick={() => setMode('sign-in')}>
            <ArrowLeft aria-hidden="true" size={17} />
            返回登录
          </button>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          <label className="field-label" htmlFor="auth-email">
            邮箱
          </label>
          <div className="text-field">
            <Mail aria-hidden="true" size={18} />
            <input
              autoComplete="email"
              id="auth-email"
              inputMode="email"
              placeholder="you@example.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {mode !== 'reset' ? (
            <>
              <label className="field-label" htmlFor="auth-password">
                密码
              </label>
              <div className="text-field">
                <KeyRound aria-hidden="true" size={18} />
                <input
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  id="auth-password"
                  minLength={6}
                  placeholder="至少 6 位"
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </>
          ) : null}

          {error ? <p className="form-message form-error">{error}</p> : null}
          {message ? <p className="form-message form-success">{message}</p> : null}

          <button className="button button-primary auth-submit" disabled={submitting} type="submit">
            {mode === 'sign-up' ? <UserPlus aria-hidden="true" size={18} /> : <LogIn aria-hidden="true" size={18} />}
            {submitting ? '请稍候' : mode === 'sign-up' ? '创建账号' : mode === 'reset' ? '发送重设邮件' : '登录'}
          </button>
        </form>

        {mode === 'sign-in' ? (
          <button className="text-button" type="button" onClick={() => setMode('reset')}>
            忘记密码
          </button>
        ) : null}
      </section>
    </main>
  )
}
