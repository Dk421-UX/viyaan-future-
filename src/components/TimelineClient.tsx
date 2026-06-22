'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import AppHeader from './AppHeader'
import FeedbackButton from './FeedbackButton'

type Entry = { id:string; content:string; generatedText:string; intensity:number; intensityAfter:number|null; persona:string; createdAt:string; primaryEmotion:string|null; fearLevel:number|null; confidenceLevel:number|null; detectedFear:string|null; goalsStruggles:string|null }
const FILTERS = ['All', 'Career', 'Relationships', 'Health', 'Purpose', 'Confidence'] as const
type Filter = typeof FILTERS[number]

function categories(entry: Entry): Filter[] {
  const text = `${entry.content} ${entry.generatedText} ${entry.detectedFear || ''} ${entry.goalsStruggles || ''}`.toLowerCase()
  const values: Filter[] = []
  if (/(career|work|job|business|startup|product|money|client|school|study)/.test(text)) values.push('Career')
  if (/(relationship|family|friend|partner|parent|people|team|love)/.test(text)) values.push('Relationships')
  if (/(health|body|sleep|energy|exercise|pain|doctor)/.test(text)) values.push('Health')
  if (/(purpose|meaning|identity|future|life|values|become|dream)/.test(text)) values.push('Purpose')
  if ((entry.confidenceLevel || 0) >= 6 || /(confidence|capable|brave|courage)/.test(text)) values.push('Confidence')
  return values.length ? values : ['Purpose']
}

export default function TimelineClient({ entries }: { entries: Entry[] }) {
  const [filter, setFilter] = useState<Filter>('All')
  const [open, setOpen] = useState<string | null>(entries[0]?.id || null)
  const visible = useMemo(() => filter === 'All' ? entries : entries.filter((entry) => categories(entry).includes(filter)), [entries, filter])

  return <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
    <AppHeader />
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="section-label">Reflection Timeline</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The story as it changed.</h1><p className="mt-3 text-sm text-[var(--color-muted)]">Every honest note and the letter that came back.</p></div>
        <Link href="/new-entry" className="btn-primary">Write reflection</Link>
      </div>
      {entries.length === 0 ? <section className="surface-panel mt-8 flex min-h-[420px] flex-col items-center justify-center px-6 text-center"><h2 className="text-2xl font-semibold">Your future self has nothing to remember yet.</h2><p className="mt-3 text-[var(--color-muted)]">Write your first reflection.</p><Link href="/new-entry" className="btn-primary mt-7">Begin the timeline</Link></section> : <>
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">{FILTERS.map((item) => <button key={item} onClick={() => setFilter(item)} className={`filter-button ${filter === item ? 'filter-button-active' : ''}`}>{item}</button>)}</div>
        <div className="mt-5 space-y-4">{visible.map((entry) => {
          const entryCats = categories(entry)
          return <article key={entry.id} className="timeline-card-compact">
            {/* Top Row: Date, Theme, Mood Score */}
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-muted)] flex-wrap select-none w-full">
              <div className="flex items-center gap-2">
                <span>{new Date(entry.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                <span>·</span>
                <span>{entry.persona}</span>
                <div className="flex flex-wrap gap-1">
                  {entryCats.slice(0,2).map((item) => (
                    <span key={item} className="tag text-[9px] py-0.5 px-1.5 leading-none">{item}</span>
                  ))}
                </div>
              </div>
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-solid)] px-2 py-0.5 font-semibold text-[var(--color-text)]">
                Mood: {entry.intensity}/10{entry.intensityAfter !== null ? ` → ${entry.intensityAfter}/10` : ''}
              </span>
            </div>

            {/* Middle Section: Title & Short Summary */}
            <div className="mt-2.5 flex-1 min-h-0 flex flex-col justify-start w-full">
              <h3 className="text-sm font-bold text-[var(--color-text)] truncate leading-snug">
                {entry.persona || '1 Year Older Me'}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--color-soft)] line-clamp-2 overflow-hidden text-ellipsis">
                {entry.content}
              </p>
            </div>

            {/* Bottom Row: View Button */}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5 shrink-0 w-full">
              <span className="text-xs text-[var(--color-muted)] italic truncate max-w-[150px] sm:max-w-[250px]">
                {entry.primaryEmotion || 'Growth Reflection'}
              </span>
              <Link
                href={`/reflection/${entry.id}`}
                className="btn-secondary !min-h-0 !py-1.5 !px-3 text-xs font-bold leading-none select-none transition-all duration-150"
              >
                View Reflection
              </Link>
            </div>
          </article>
        })}</div>
        {visible.length === 0 && <div className="surface-panel mt-5 p-8 text-center text-sm text-[var(--color-muted)]">No reflections match this part of your timeline yet.</div>}
      </>}
    </main>
    <FeedbackButton />
  </div>
}
