'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { renderAIField } from '../../lib/ai-render'
import AppHeader from '../../components/AppHeader'
import FeedbackButton from '../../components/FeedbackButton'
import * as ga from '../../lib/analytics'

export default function ResultPage() {
  const router = useRouter()
  const [entryData, setEntryData] = useState<any>(null)
  const [intensityAfter, setIntensityAfter] = useState(5)
  const [expandedBreakdown, setExpandedBreakdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('viyaan_entry')
    if (!raw) {
      router.push('/new-entry')
      return
    }

    try {
      const parsed = JSON.parse(raw)
      setEntryData(parsed)
      setIntensityAfter(parsed.intensityBefore || 5)
    } catch {
      router.push('/new-entry')
    }
  }, [router])

  if (!entryData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[var(--color-muted)]">Loading reflection...</p>
      </div>
    )
  }

  const {
    inputText,
    generatedText,
    intensityBefore,
    persona,
    primaryEmotion,
    secondaryEmotion,
    detectedFear,
    thinkingPattern,
    growthDirection,
    nextStep,
    confidenceLevel = 5,
    fearLevel = 5,
    stressLevel = 5,
    hopeLevel = 5,
    goalsStruggles,
    fear,
    goal,
    dream,
    decision,
    emotionalCycle,
    milestone,
    pattern,
    question,
    theme,
    victory,
    regret,
    lesson,
    repeatedConcern,
    retrieval,
  } = entryData

  const handleDiscard = () => {
    sessionStorage.removeItem('viyaan_entry')
    router.push('/dashboard')
  }

  const handleCommit = async () => {
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          generatedText,
          intensityBefore,
          intensityAfter,
          persona,
          primaryEmotion,
          secondaryEmotion,
          detectedFear,
          thinkingPattern,
          growthDirection,
          nextStep,
          confidenceLevel,
          fearLevel,
          stressLevel,
          hopeLevel,
          goalsStruggles,
          fear,
          goal,
          dream,
          decision,
          emotionalCycle,
          milestone,
          pattern,
          question,
          theme,
          victory,
          regret,
          lesson,
          repeatedConcern,
        }),
      })

      const data = await res.json()
      if (res.status === 401) {
        window.location.assign('/login?next=/result')
        return
      }
      if (data.success) {
        // Fire analytics event
        ga.event('timeline_saved')

        setSaveSuccess(true)
        sessionStorage.removeItem('viyaan_entry')
        window.setTimeout(() => router.push('/dashboard'), 900)
      } else {
        setError(data.error || 'Unable to save reflection.')
        setSaving(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  const intensityDiff = intensityBefore - intensityAfter
  const diffLabel =
    intensityDiff > 0
      ? `${intensityDiff} point${intensityDiff === 1 ? '' : 's'} lighter`
      : intensityDiff < 0
        ? `${Math.abs(intensityDiff)} point${Math.abs(intensityDiff) === 1 ? '' : 's'} heavier`
        : 'No change'

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppHeader />

      {saveSuccess && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-[rgba(47,125,87,0.25)] bg-[var(--color-surface-solid)] px-4 py-3 text-sm font-semibold text-[var(--color-green)] shadow-lg">
          Saved to timeline.
        </div>
      )}

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5">
            <div>
              <p className="section-label">{persona || '1 Year Older Me'}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your future self wrote back.
              </h1>
            </div>

            <article className="surface-panel p-5 sm:p-8">
              <div className="letter-copy whitespace-pre-line text-[16px] sm:text-[17px]">
                {generatedText}
              </div>
            </article>

            <section className="surface-panel overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedBreakdown((value) => !value)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-semibold">Reflection context</span>
                <span className="text-sm text-[var(--color-muted)]">
                  {expandedBreakdown ? 'Close' : 'Open'}
                </span>
              </button>

              {expandedBreakdown && (
                <div className="space-y-4 border-t border-[var(--color-border)] p-5">
                  <div>
                    <p className="section-label">Original Reflection</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--color-soft)]">
                      {inputText}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {detectedFear && (
                      <div className="quiet-block">
                        <p className="section-label">Hidden Fear</p>
                        {renderAIField(detectedFear)}
                      </div>
                    )}
                    {thinkingPattern && (
                      <div className="quiet-block">
                        <p className="section-label">What You Were Really Asking</p>
                        {renderAIField(thinkingPattern)}
                      </div>
                    )}
                    {growthDirection && (
                      <div className="quiet-block">
                        <p className="section-label">Future Perspective</p>
                        {renderAIField(growthDirection)}
                      </div>
                    )}
                    {nextStep && (
                      <div className="quiet-block">
                        <p className="section-label">One Thing I Wish I Knew Earlier</p>
                        {renderAIField(nextStep)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <section className="surface-panel p-5">
              <p className="section-label">Intensity After</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-semibold">{intensityAfter}/10</span>
                <span className="text-sm text-[var(--color-muted)]">{diffLabel}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={intensityAfter}
                onChange={(event) => setIntensityAfter(Number(event.target.value))}
                className="intensity-slider mt-5"
              />
              <div className="mt-3 flex justify-between text-xs text-[var(--color-muted)]">
                <span>Steady</span>
                <span>Too much</span>
              </div>
            </section>

            <section className="surface-panel p-5">
              <p className="section-label">Signals</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="detail-block">
                  <span>Stress</span>
                  <strong>{stressLevel}/10</strong>
                </div>
                <div className="detail-block">
                  <span>Fear</span>
                  <strong>{fearLevel}/10</strong>
                </div>
                <div className="detail-block">
                  <span>Hope</span>
                  <strong>{hopeLevel}/10</strong>
                </div>
                <div className="detail-block">
                  <span>Confidence</span>
                  <strong>{confidenceLevel}/10</strong>
                </div>
              </div>
              {(primaryEmotion || secondaryEmotion) && (
                <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                  {primaryEmotion}
                  {secondaryEmotion ? `, ${secondaryEmotion}` : ''}
                </p>
              )}
              {retrieval && (
                <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">
                  {retrieval.memoriesUsed} memories and {retrieval.recentReflectionsUsed} recent reflections were considered.
                </p>
              )}
            </section>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleCommit}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? 'Saving...' : 'Save to Timeline'}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="btn-secondary w-full"
              >
                Discard
              </button>
            </div>
          </aside>
        </div>
      </main>
      <FeedbackButton />
    </div>
  )
}
