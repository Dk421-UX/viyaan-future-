'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FUTURE_SELF_PERSONAS, FutureSelfPersona } from '../../lib/future-self'
import AppHeader from '../../components/AppHeader'
import * as ga from '../../lib/analytics'

const LOADING_MESSAGES = [
  'Reading what you wrote...',
  'Retrieving memories...',
  'Looking for repeated concerns...',
  'Connecting this to earlier reflections...',
  'Writing from the older version of you...',
]

export default function NewEntryPage() {
  const router = useRouter()
  const [inputText, setInputText] = useState('')
  const [selectedPersona, setSelectedPersona] = useState<FutureSelfPersona>(FUTURE_SELF_PERSONAS[0])
  const [intensityBefore, setIntensityBefore] = useState(5)
  const [loading, setLoading] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading) return
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length)
    }, 1200)
    return () => window.clearInterval(interval)
  }, [loading])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!inputText.trim()) return

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          intensityBefore,
          persona: selectedPersona.name,
        }),
      })

      const data = await res.json()
      if (res.status === 401) {
        window.location.assign('/login?next=/new-entry')
        return
      }
      if (data.success) {
        // Fire analytics events
        ga.event('reflection_created')
        ga.event('future_letter_generated')

        sessionStorage.setItem(
          'viyaan_entry',
          JSON.stringify({
            inputText,
            intensityBefore,
            persona: selectedPersona.name,
            ...data.data,
          })
        )
        router.push('/result')
      } else {
        setError(data.error || 'Something broke while writing the response.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />

      {!loading ? (
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)]">
            <section>
              <div className="mb-8">
                <p className="section-label">Reflection</p>
                <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  Speak to the person you are becoming.
                </h1>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-[var(--color-muted)]">
                  {`Write honestly.\nNo performance.\nNo filters.\nNo judgment.`}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="surface-panel p-4 sm:p-5">
                  <label className="form-label" htmlFor="reflection">
                    What is true right now?
                  </label>
                  <textarea
                    id="reflection"
                    rows={12}
                    maxLength={2400}
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder="Write the thing you would not say polished."
                    className="form-field min-h-[280px] resize-y leading-7"
                    required
                  />
                  <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
                    <span>{inputText.length}/2400</span>
                    <span>{inputText.trim().split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                </div>

                <div className="surface-panel p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <label className="form-label mb-0" htmlFor="intensity">
                      Intensity before
                    </label>
                    <span className="text-sm font-semibold text-[var(--color-blue)]">
                      {intensityBefore}/10
                    </span>
                  </div>
                  <input
                    id="intensity"
                    type="range"
                    min="1"
                    max="10"
                    value={intensityBefore}
                    onChange={(event) => setIntensityBefore(Number(event.target.value))}
                    className="intensity-slider mt-5"
                  />
                  <div className="mt-3 flex justify-between text-xs text-[var(--color-muted)]">
                    <span>Steady</span>
                    <span>Too much</span>
                  </div>
                </div>

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <button type="submit" className="btn-primary w-full">
                  Continue
                </button>
              </form>
            </section>

            <aside className="space-y-4 lg:pt-[116px]">
              <div className="surface-panel p-5">
                <p className="section-label">Older Self</p>
                <div className="mt-4 grid gap-3">
                  {FUTURE_SELF_PERSONAS.map((persona) => {
                    const isSelected = selectedPersona.id === persona.id
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => setSelectedPersona(persona)}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? 'border-[var(--color-blue)] bg-[rgba(7,95,131,0.07)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface-solid)] hover:bg-[var(--color-surface-soft)]'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{persona.name}</span>
                        <span className="mt-1 block text-sm leading-6 text-[var(--color-muted)]">
                          {persona.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      ) : (
        <main id="main-content" className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
          <div className="surface-panel w-full max-w-xl p-6 text-center sm:p-8">
            <Image
              src="/viyaan-logo.png"
              alt=""
              width={64}
              height={64}
              className="mx-auto h-16 w-16 rounded-xl bg-white object-contain ring-1 ring-[var(--color-border)]"
            />
            <h2 className="mt-6 text-2xl font-semibold">Writing back from later.</h2>
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {LOADING_MESSAGES[messageIndex]}
            </p>
            <div className="mt-8 space-y-3 text-left">
              <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-3 w-full animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
