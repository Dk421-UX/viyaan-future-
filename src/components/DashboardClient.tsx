'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import AppHeader from './AppHeader'
import FeedbackButton from './FeedbackButton'

interface SerializedEntry {
  id: string
  userId: string
  inputText: string
  generatedText: string
  intensityBefore: number
  intensityAfter: number | null
  createdAt: string
  persona: string | null
  primaryEmotion: string | null
  secondaryEmotion: string | null
  detectedFear: string | null
  thinkingPattern: string | null
  growthDirection: string | null
  nextStep: string | null
  confidenceLevel: number | null
  fearLevel: number | null
  stressLevel: number | null
  hopeLevel: number | null
  goalsStruggles: string | null
}

interface ImportantMemory {
  id: string
  type: string
  content: string
  importance: number
}

interface DashboardClientProps {
  initialEntries: SerializedEntry[]
  totalReflections: number
  currentFocus: string
  mostCommonFear: string
  mostCommonGoal: string
  reflectionsThisWeekCount: number
  userName: string
  importantMemories: ImportantMemory[]
}

type TimelineFilter = 'Career' | 'Relationships' | 'Health' | 'Purpose' | 'Confidence' | 'Fear' | 'Goal' | 'All'

function entryDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function inferCategories(entry: SerializedEntry): TimelineFilter[] {
  const text = [
    entry.inputText,
    entry.generatedText,
    entry.detectedFear,
    entry.goalsStruggles,
    entry.primaryEmotion,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const categories: TimelineFilter[] = []
  if (entry.detectedFear || (entry.fearLevel ?? 0) >= 6 || text.includes('fear')) categories.push('Fear')
  if (entry.goalsStruggles || text.includes('goal') || text.includes('build')) categories.push('Goal')
  if (/(career|work|job|business|startup|product|company|money|client|school|study)/.test(text)) categories.push('Career')
  if (/(relationship|family|friend|partner|parent|people|team)/.test(text)) categories.push('Relationships')
  if (/(health|body|sleep|tired|energy|exercise|pain|doctor)/.test(text)) categories.push('Health')
  if (/(purpose|meaning|identity|future|life|values|become)/.test(text)) categories.push('Purpose')
  if ((entry.confidenceLevel ?? 0) >= 6 || /(confidence|capable|brave|courage|self-belief)/.test(text)) categories.push('Confidence')
  return categories.length ? categories : ['Purpose']
}

function calculateStreak(entries: SerializedEntry[]): number {
  if (!entries.length) return 0
  
  // Normalize dates to local date strings (YYYY-MM-DD)
  const uniqueDates = Array.from(new Set(
    entries.map(e => {
      const d = new Date(e.createdAt)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
  )).map(dateStr => new Date(dateStr))
  
  // Sort newest first
  uniqueDates.sort((a, b) => b.getTime() - a.getTime())
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  // Check if the newest date is today or yesterday
  const newestDate = uniqueDates[0]
  newestDate.setHours(0, 0, 0, 0)
  
  if (newestDate.getTime() !== today.getTime() && newestDate.getTime() !== yesterday.getTime()) {
    return 0
  }
  
  let streak = 1
  let currentDate = newestDate
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const nextDate = uniqueDates[i]
    nextDate.setHours(0, 0, 0, 0)
    
    const diffTime = currentDate.getTime() - nextDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak++
      currentDate = nextDate
    } else if (diffDays > 1) {
      break
    }
  }
  
  return streak
}

export default function DashboardClient({
  initialEntries,
  totalReflections,
  currentFocus,
  mostCommonFear,
  mostCommonGoal,
  reflectionsThisWeekCount,
  userName,
  importantMemories,
}: DashboardClientProps) {
  
  const streakCount = useMemo(() => calculateStreak(initialEntries), [initialEntries])

  const averages = useMemo(() => {
    if (initialEntries.length === 0) return { before: 0, after: 0, relief: 0 }
    const withAfter = initialEntries.filter((entry) => entry.intensityAfter !== null)
    const before =
      initialEntries.reduce((sum, entry) => sum + entry.intensityBefore, 0) / initialEntries.length
    const after =
      withAfter.length > 0
        ? withAfter.reduce((sum, entry) => sum + (entry.intensityAfter || 0), 0) / withAfter.length
        : before
    return {
      before: Math.round(before * 10) / 10,
      after: Math.round(after * 10) / 10,
      relief: Math.round((before - after) * 10) / 10,
    }
  }, [initialEntries])

  // Extract a 1-to-2 sentence insight from the latest reflection
  const todayInsight = useMemo(() => {
    if (!initialEntries.length) {
      return "Focus on what is true today. Your future self is shaped by the honesty of your present."
    }
    const latest = initialEntries[0]
    const sourceText = latest.growthDirection || latest.nextStep || latest.goalsStruggles || ""
    if (!sourceText) {
      return `Reflecting today with ${latest.persona || 'your future self'}. Pay attention to your primary emotion: ${latest.primaryEmotion || 'neutral'}.`
    }
    
    const cleanText = sourceText.replace(/^[^{]*(\{.*\})[^}]*$/, '$1')
    let parsed = cleanText
    try {
      if (cleanText.startsWith('{')) {
        const obj = JSON.parse(cleanText)
        parsed = obj.direction || obj.step || obj.action || Object.values(obj)[0] || sourceText
      }
    } catch {
      parsed = sourceText
    }
    
    const sentences = String(parsed).split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
    if (sentences.length > 0) {
      return sentences.slice(0, 2).join('. ') + '.'
    }
    return String(parsed).slice(0, 150)
  }, [initialEntries])

  // Find dominant theme
  const dominantTheme = useMemo(() => {
    if (!initialEntries.length) return 'None'
    const counts: Record<string, number> = {}
    initialEntries.forEach(entry => {
      const cats = inferCategories(entry)
      cats.forEach(cat => {
        if (cat !== 'All') {
          counts[cat] = (counts[cat] || 0) + 1
        }
      })
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || 'Purpose'
  }, [initialEntries])

  // Get last 5 entries
  const recentEntries = useMemo(() => initialEntries.slice(0, 5), [initialEntries])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-16">
      <AppHeader />

      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10 space-y-8 animate-in">
        
        {/* SECTION 1: Welcome Back (Header) */}
        <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
                Welcome back, {userName}
              </h1>
              {streakCount > 0 && (
                <span className="badge-streak select-none">
                  🔥 {streakCount} Day Streak
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
              <span className="font-semibold uppercase tracking-wider text-[var(--color-blue)]">Current Focus:</span>
              <span className="font-medium whitespace-normal break-words">{currentFocus}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-[var(--color-muted)] shrink-0">
            <span className="rounded-full bg-[var(--color-surface-soft)] px-3 py-1 border border-[var(--color-border)]">
              {totalReflections} Reflections
            </span>
          </div>
        </header>

        {/* SECTION 2: Continue Journey (Hero CTA) */}
        <section className="glass-cta p-6 sm:p-8">
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-blue)]">
                Journey Pathway
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                Speak to the person you are becoming.
              </h2>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-xl">
                Write honestly. Capture your current choices, fears, and triumphs, and receive guidance from your future self.
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <Link
                href="/new-entry"
                className="btn-primary w-full sm:w-auto text-center justify-center flex min-h-[46px] items-center text-sm font-bold shadow-md hover:shadow-lg"
              >
                Write Reflection
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 3: Today's Insight */}
        <section className="space-y-3">
          <h2 className="section-label">Today's Insight</h2>
          <div className="insight-pill">
            <p className="text-sm sm:text-base leading-relaxed text-[var(--color-soft)] italic whitespace-normal break-words">
              &ldquo;{todayInsight}&rdquo;
            </p>
          </div>
        </section>

        {/* SECTION 5: Growth Snapshot */}
        <section className="space-y-4">
          <h2 className="section-label">Growth Snapshot</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            
            <div className="stat-card-v2">
              <span className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider">Reflections</span>
              <strong className="text-2xl font-bold mt-2 text-[var(--color-text)]">{totalReflections}</strong>
            </div>

            <div className="stat-card-v2">
              <span className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider">Streak</span>
              <strong className="text-2xl font-bold mt-2 text-[var(--color-text)]">
                {streakCount > 0 ? `${streakCount} Days` : '0 Days'}
              </strong>
            </div>

            <div className="stat-card-v2">
              <span className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider">Dominant Theme</span>
              <strong className="text-sm sm:text-base font-bold mt-2 truncate text-[var(--color-blue)]">
                {dominantTheme}
              </strong>
            </div>

            <div className="stat-card-v2">
              <span className="text-xs text-[var(--color-muted)] font-semibold uppercase tracking-wider">Growth Trend</span>
              <div className="mt-2 flex flex-col gap-1">
                <strong className="text-base font-bold text-[var(--color-text)] font-mono">
                  {averages.before}/10 &rarr; {averages.after}/10
                </strong>
                {averages.relief !== 0 && (
                  <span className="text-[10px] font-bold text-[var(--color-green)]">
                    {averages.relief > 0 ? `-${averages.relief} Relief` : `+${Math.abs(averages.relief)} Tension`}
                  </span>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 4: Recent Reflections */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-label">Recent Reflections</h2>
            <Link 
              href="/timeline" 
              className="text-xs font-bold text-[var(--color-blue)] hover:underline"
            >
              See all timeline &rarr;
            </Link>
          </div>

          {recentEntries.length === 0 ? (
            <div className="surface-panel p-8 text-center text-sm text-[var(--color-muted)] rounded-2xl">
              No reflections recorded yet. Write your first reflection to start your timeline.
            </div>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => {
                const categories = inferCategories(entry)
                return (
                  <article key={entry.id} className="timeline-card-compact !h-auto !max-h-none sm:!h-[90px] sm:!max-h-[90px] flex flex-col justify-between p-4 sm:flex-row sm:items-center sm:gap-4">
                    
                    {/* Left side: Date, Title, Theme */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
                        <span>{entryDate(entry.createdAt)}</span>
                        <span>&middot;</span>
                        <span className="font-semibold text-[var(--color-blue)] truncate max-w-[120px]">
                          {entry.persona || 'Future Self'}
                        </span>
                        <div className="hidden xs:flex flex-wrap gap-1">
                          {categories.slice(0, 1).map((cat) => (
                            <span key={cat} className="tag text-[9px] py-0 px-1.5 leading-none">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <h3 className="text-sm font-bold text-[var(--color-text)] truncate mt-1.5">
                        {entry.inputText}
                      </h3>
                    </div>

                    {/* Right side: Mood & View Link */}
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 sm:mt-0 sm:border-0 sm:pt-0 sm:justify-end gap-4 shrink-0">
                      <span className="rounded bg-[var(--color-surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-soft)] border border-[var(--color-border)]">
                        Mood: {entry.intensityBefore}/10
                      </span>
                      <Link
                        href={`/reflection/${entry.id}`}
                        className="btn-secondary !min-h-0 !py-1.5 !px-3.5 text-xs font-bold leading-none select-none"
                      >
                        View
                      </Link>
                    </div>

                  </article>
                )
              })}
            </div>
          )}
        </section>

      </main>

      <FeedbackButton />
    </div>
  )
}
