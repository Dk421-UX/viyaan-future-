'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'
import * as ga from '../lib/analytics'

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({ success: false }))
  return { response, data }
}

export function LoginForm({ nextPath = '/dashboard', reset = false }: { nextPath?: string; reset?: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await postJson('/api/auth', { action: 'login', email, password })
      if (!data.success) throw new Error(data.error || 'Unable to sign in.')
      ga.event('login_success')
      const destination = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'
      window.location.assign(destination)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {reset && <div className="form-notice success" role="status">Password updated. You can sign in now.</div>}
      <form onSubmit={submit} className="auth-form">
        <Field label="Email" id="email">
          <input id="email" className="form-field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password" id="password" action={<Link href="/forgot-password">Forgot password?</Link>}>
          <PasswordInput id="password" value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} autoComplete="current-password" />
        </Field>
        {error && <div className="form-notice error" role="alert">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Signing in…' : 'Continue to your timeline'}</button>
      </form>
      <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted)] space-y-2 leading-relaxed">
        <p className="font-semibold text-[var(--color-text)]">Forgot your password?</p>
        <p>Use the secure password reset option above.</p>
        <p>For the best experience, save your password using Google Password Manager.</p>
        <p>If you no longer have access to your account, you may create a new account and continue your journey.</p>
      </div>
      <p className="auth-switch">New to Viyaan Future? <Link href="/signup">Create an account</Link></p>
    </>
  )
}

export function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const strength = useMemo(() => {
    if (!password) return ''
    let score = password.length >= 8 ? 1 : 0
    if (password.length >= 12) score += 1
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1
    return ['Too short', 'Good', 'Strong', 'Very strong'][score]
  }, [password])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await postJson('/api/auth', { action: 'signup', name, email, password })
      if (!data.success) throw new Error(data.error || 'Unable to create your account.')
      ga.event('signup_success')
      window.location.assign('/dashboard')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="auth-form">
        <Field label="Name" id="name">
          <input id="name" className="form-field" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="What should future you call you?" />
        </Field>
        <Field label="Email" id="email">
          <input id="email" className="form-field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password" id="password" action={strength ? <span>{strength}</span> : undefined}>
          <PasswordInput id="password" value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} autoComplete="new-password" placeholder="At least 8 characters" />
        </Field>
        {error && <div className="form-notice error" role="alert">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating your timeline…' : 'Create private account'}</button>
      </form>
      <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted)] leading-relaxed space-y-1">
        <p className="font-semibold text-[var(--color-text)]">💡 Tip</p>
        <p>Save your password in Google Password Manager for easier future sign-ins.</p>
        <p>This helps prevent forgotten passwords and provides a smoother experience when returning to Viyaan Future.</p>
      </div>
      <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
    </>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await postJson('/api/auth/forgot-password', { email })
      if (!data.success) throw new Error(data.error || 'Unable to send a reset link.')
      ga.event('password_reset_requested')
      setMessage('Check your email for a secure password reset link.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (message) {
    return <div className="auth-form"><div className="form-notice success" role="status">{message}</div><Link href="/account-recovery" className="btn-secondary w-full">Forgot Password isn't working?</Link><Link href="/login" className="btn-secondary w-full">Return to sign in</Link></div>
  }
  return (
    <>
      <form onSubmit={submit} className="auth-form">
        <Field label="Account email" id="email"><input id="email" className="form-field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></Field>
        {error && <div className="form-notice error" role="alert">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending secure link…' : 'Send reset link'}</button>
      </form>
      <p className="auth-switch"><Link href="/account-recovery">Forgot Password isn't working?</Link></p>
      <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
    </>
  )
}

export function AccountRecoveryForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setStatus('')
    try {
      const { data } = await postJson('/api/auth/recovery-request', { email, message })
      if (!data.success) throw new Error(data.error || 'Unable to request recovery.')
      setStatus(data.message || 'Recovery request received.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status) {
    return <div className="auth-form"><div className="form-notice success" role="status">{status}</div><Link href="/login" className="btn-secondary w-full">Return to sign in</Link></div>
  }

  return (
    <>
      <form onSubmit={submit} className="auth-form">
        <Field label="Account email" id="recovery-email">
          <input id="recovery-email" className="form-field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="What happened?" id="recovery-message">
          <textarea id="recovery-message" className="form-field min-h-[140px] resize-y" required minLength={10} maxLength={1200} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us why you cannot access the account or why the email reset is not working." />
        </Field>
        {error && <div className="form-notice error" role="alert">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending request...' : 'Request account recovery'}</button>
      </form>
      <p className="auth-switch"><Link href="/forgot-password">Try reset link again</Link></p>
    </>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(token ? '' : 'This reset link is missing its secure token.')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password !== confirm) return setError('The passwords do not match.')
    setLoading(true)
    try {
      const { data } = await postJson('/api/auth/reset-password', { token, password })
      if (!data.success) throw new Error(data.error || 'Unable to reset your password.')
      router.replace('/login?reset=1')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="auth-form">
        <Field label="New password" id="password"><PasswordInput id="password" value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} autoComplete="new-password" placeholder="At least 8 characters" /></Field>
        <Field label="Confirm new password" id="confirm"><input id="confirm" className="form-field" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field>
        {error && <div className="form-notice error" role="alert">{error}</div>}
        <button type="submit" disabled={loading || !token} className="btn-primary w-full">{loading ? 'Updating password…' : 'Reset password'}</button>
      </form>
      <p className="auth-switch"><Link href="/forgot-password">Request a new link</Link></p>
    </>
  )
}

function Field({ label, id, action, children }: { label: string; id: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div><div className="form-label-row"><label className="form-label" htmlFor={id}>{label}</label>{action}</div>{children}</div>
}

function PasswordInput({ id, value, setValue, visible, setVisible, autoComplete, placeholder }: { id: string; value: string; setValue: (value: string) => void; visible: boolean; setVisible: (value: boolean) => void; autoComplete: string; placeholder?: string }) {
  return <div className="password-field"><input id={id} className="form-field" type={visible ? 'text' : 'password'} autoComplete={autoComplete} required minLength={8} maxLength={128} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /><button type="button" onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button></div>
}
