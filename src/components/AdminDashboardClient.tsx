'use client'

import { useState } from 'react'
import AppHeader from './AppHeader'

type FeedbackRow = {
  id: string
  rating: number
  type: string
  message: string
  createdAt: string
  user: { email: string; name: string }
}

type RecoveryRow = {
  id: string
  email: string
  message: string
  status: string
  createdAt: string
}

export default function AdminDashboardClient({
  averageRating,
  totalFeedback,
  commonComplaints,
  requestedFeatures,
  aiIssues,
  feedback,
  recoveryRequests,
}: {
  averageRating: number
  totalFeedback: number
  commonComplaints: string[]
  requestedFeatures: string[]
  aiIssues: string[]
  feedback: FeedbackRow[]
  recoveryRequests: RecoveryRow[]
}) {
  const [requests, setRequests] = useState(recoveryRequests)
  const [workingId, setWorkingId] = useState('')

  const act = async (requestId: string, action: string) => {
    setWorkingId(requestId)
    try {
      const response = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      })
      const data = await response.json().catch(() => ({ success: false }))
      if (!data.success) throw new Error(data.error || 'Action failed.')
      if (data.temporaryPassword) {
        alert(`${data.message}\n\nTemporary password:\n${data.temporaryPassword}`)
      }
      const status =
        action === 'approve'
          ? 'approved'
          : action === 'close'
            ? 'closed'
            : 'temporary_password_sent'
      setRequests((current) => current.map((item) => item.id === requestId ? { ...item, status } : item))
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : 'Action failed.')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-6">
          <p className="section-label">Founder dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Product signal and recovery center</h1>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="metric-card"><span>{averageRating || '-'}</span><small>Average Rating</small></div>
          <div className="metric-card"><span>{totalFeedback}</span><small>Total Feedback</small></div>
          <div className="metric-card"><span>{requests.filter((item) => item.status === 'pending').length}</span><small>Pending Recovery</small></div>
          <div className="metric-card"><span>{feedback.filter((item) => item.type === 'artificial').length}</span><small>AI Issues</small></div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <SignalCard title="Common Complaints" items={commonComplaints} />
          <SignalCard title="Most Requested Features" items={requestedFeatures} />
          <SignalCard title="Most Mentioned AI Issues" items={aiIssues} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="surface-panel p-5">
            <p className="section-label">Recent Feedback</p>
            <div className="mt-4 space-y-3">
              {feedback.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No feedback yet.</p> : feedback.map((item) => (
                <article key={item.id} className="quiet-block">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                    <span>{item.user.name} · {item.user.email}</span>
                    <span>{item.rating}/10 · {item.type} · {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{item.message}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="surface-panel p-5">
            <p className="section-label">Account Recovery</p>
            <div className="mt-4 space-y-3">
              {requests.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No recovery requests yet.</p> : requests.map((item) => (
                <article key={item.id} className="quiet-block">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.email}</p>
                    <span className="tag">{item.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.message}</p>
                  <div className="mt-3 grid gap-2">
                    <button type="button" disabled={workingId === item.id} onClick={() => act(item.id, 'approve')} className="btn-secondary w-full">Approve Recovery</button>
                    <button type="button" disabled={workingId === item.id} onClick={() => act(item.id, 'reset-and-send-temporary-password')} className="btn-primary w-full">Reset Password & Send Temporary Password</button>
                    <button type="button" disabled={workingId === item.id} onClick={() => act(item.id, 'close')} className="btn-secondary w-full">Close</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SignalCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="surface-panel p-5">
      <p className="section-label">{title}</p>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No signal yet.</p> : items.map((item) => (
          <p key={item} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-solid)] px-3 py-2 text-sm leading-6">
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}
