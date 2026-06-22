'use client'

import { FormEvent, useState } from 'react'
import * as ga from '../lib/analytics'

const TYPES = [
  { value: 'useful', label: 'What felt useful?' },
  { value: 'artificial', label: 'What felt artificial?' },
  { value: 'human', label: 'What would make this feel more human?' },
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
] as const

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(8)
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('human')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, type, message }),
      })
      const data = await response.json().catch(() => ({ success: false }))
      if (!data.success) throw new Error(data.error || 'Unable to send feedback.')
      // Fire analytics event
      ga.event('feedback_submitted')
      setStatus('Thank you. This goes straight into the founder dashboard.')
      setMessage('')
      window.setTimeout(() => setOpen(false), 1000)
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="feedback-fab">
        Help Improve Viyaan Future
      </button>

      {open && (
        <div className="feedback-overlay" role="dialog" aria-modal="true" aria-label="Help Improve Viyaan Future">
          <div className="feedback-card surface-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Founder feedback</p>
                <h2 className="mt-2 text-xl font-semibold">Help Improve Viyaan Future</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary !px-3 !py-2">
                Close
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <div className="form-label-row">
                  <label className="form-label" htmlFor="feedback-rating">Rating</label>
                  <span className="text-sm text-[var(--color-muted)]">{rating}/10</span>
                </div>
                <input
                  id="feedback-rating"
                  type="range"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="intensity-slider"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="feedback-type">Feedback type</label>
                <select id="feedback-type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="form-field">
                  {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="feedback-message">{TYPES.find((item) => item.value === type)?.label}</label>
                <textarea
                  id="feedback-message"
                  className="form-field min-h-[130px] resize-y"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={1200}
                  required
                  placeholder="Tell us exactly where it felt real, artificial, broken, or missing."
                />
              </div>

              {status && <div className={`form-notice ${status.startsWith('Thank') ? 'success' : 'error'}`}>{status}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending...' : 'Send feedback'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
