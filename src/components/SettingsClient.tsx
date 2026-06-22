'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from './AppHeader'

export default function SettingsClient({ email, name }: { email: string; name: string }) {
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])

  const applyTheme = (nextTheme: 'light' | 'dark') => {
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = nextTheme
    localStorage.setItem('viyaan-theme', nextTheme)
    setTheme(nextTheme)
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (newPassword !== confirmPassword) return setError('The new passwords do not match.')
    setLoading(true)
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', oldPassword, newPassword }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Unable to update your password.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password updated. Other sessions have been signed out.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8">
          <p className="section-label">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your account, quietly under control.</h1>
        </div>

        <div className="grid gap-5">
          <section className="surface-panel p-5 sm:p-7">
            <p className="section-label">Appearance</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(['light', 'dark'] as const).map((option) => (
                <button key={option} type="button" onClick={() => applyTheme(option)} className={`rounded-2xl border p-4 text-left transition ${theme === option ? 'border-[var(--color-blue)] bg-[var(--color-blue-soft)]' : 'border-[var(--color-border)] bg-[var(--color-surface-solid)]'}`}>
                  <span className="block text-sm font-semibold capitalize">{option} theme</span>
                  <span className="mt-1 block text-xs text-[var(--color-muted)]">{option === 'light' ? 'Bright, warm, and spacious' : 'Quiet contrast for late hours'}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="surface-panel p-5 sm:p-7">
            <p className="section-label">Account</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="detail-block"><span>Name</span><strong>{name}</strong></div>
              <div className="detail-block"><span>Email</span><strong className="break-all">{email}</strong></div>
            </div>
          </section>

          <section className="surface-panel p-5 sm:p-7">
            <p className="section-label">Security</p>
            <h2 className="mt-3 text-xl font-semibold">Change password</h2>
            <form onSubmit={changePassword} className="mt-5 grid gap-4">
              <label><span className="form-label">Current password</span><input className="form-field" type="password" autoComplete="current-password" required value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="form-label">New password</span><input className="form-field" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
                <label><span className="form-label">Confirm password</span><input className="form-field" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
              </div>
              {error && <div className="form-notice error" role="alert">{error}</div>}
              {message && <div className="form-notice success" role="status">{message}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full sm:w-fit">{loading ? 'Updating…' : 'Update password'}</button>
            </form>
          </section>

          <section className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div><p className="font-semibold">Sign out of this device</p><p className="mt-1 text-sm text-[var(--color-muted)]">Your timeline remains safely stored.</p></div>
            <button type="button" onClick={logout} disabled={loggingOut} className="btn-secondary border-red-300 text-[var(--color-danger)]">{loggingOut ? 'Signing out…' : 'Sign out'}</button>
          </section>
        </div>
      </main>
    </div>
  )
}
