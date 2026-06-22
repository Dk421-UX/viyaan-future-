import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import AppHeader from '../../../components/AppHeader'
import FeedbackButton from '../../../components/FeedbackButton'
import { renderAIField } from '../../../lib/ai-render'

export const dynamic = 'force-dynamic'

interface ReflectionPageProps {
  params: Promise<{ id: string }>
}

function entryDate(dateStr: Date) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function growthLabel(intensityBefore: number, intensityAfter: number | null) {
  if (intensityAfter === null) return 'After not recorded'
  const diff = intensityBefore - intensityAfter
  if (diff > 0) return `${diff} point${diff === 1 ? '' : 's'} lighter`
  if (diff < 0) return `${Math.abs(diff)} point${Math.abs(diff) === 1 ? '' : 's'} heavier`
  return 'No intensity change'
}

export default async function ReflectionDetailPage({ params }: ReflectionPageProps) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const reflection = await prisma.reflection.findUnique({
    where: { id },
  })

  if (!reflection || reflection.userId !== session.userId) {
    notFound()
  }

  const diff = reflection.intensityAfter === null ? null : reflection.intensity - reflection.intensityAfter

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-24">
      <AppHeader />

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="btn-secondary !min-h-0 !py-1.5 !px-3.5 text-xs font-semibold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <section className="surface-panel overflow-hidden p-6 sm:p-8 space-y-8 animate-in">
          {/* Header metadata */}
          <div className="border-b border-[var(--color-border)] pb-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)] uppercase tracking-wider">
              <span>{entryDate(reflection.createdAt)}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-muted)]" />
              <span className="text-[var(--color-blue)] font-semibold">{reflection.persona || '1 Year Older Me'}</span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Reflection Analysis
            </h1>
          </div>

          {/* Main content grid */}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="section-label">Your Reflection</h2>
              <div className="surface-panel !bg-[var(--color-bg-elevated)] p-5 rounded-xl border border-[var(--color-border)]">
                <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-[var(--color-soft)]">
                  {reflection.content}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="section-label">Future Self Letter</h2>
              <div className="surface-panel !bg-[var(--color-surface-solid)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="letter-copy whitespace-pre-line text-sm sm:text-base leading-relaxed">
                  {reflection.generatedText}
                </div>
              </div>
            </div>
          </div>

          {/* Numerical metrics */}
          <div className="grid gap-4 sm:grid-cols-3 pt-4">
            <div className="detail-block">
              <span>Intensity Rating</span>
              <strong>
                {reflection.intensity}/10
                {reflection.intensityAfter !== null ? ` &rarr; ${reflection.intensityAfter}/10` : ''}
              </strong>
            </div>
            <div className="detail-block">
              <span>Growth Trend</span>
              <strong>{growthLabel(reflection.intensity, reflection.intensityAfter)}</strong>
            </div>
            <div className="detail-block">
              <span>Primary Emotion</span>
              <strong>{reflection.primaryEmotion || 'Not detected'}</strong>
            </div>
          </div>

          {/* AI Inferred details */}
          {(reflection.thinkingPattern || reflection.detectedFear || reflection.growthDirection || reflection.nextStep) && (
            <div className="border-t border-[var(--color-border)] pt-6 space-y-4">
              <h2 className="section-label">Deep Insights &amp; Growth Pathways</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {reflection.detectedFear && (
                  <div className="quiet-block flex flex-col justify-between">
                    <div>
                      <p className="section-label mb-2">Hidden Fear</p>
                      {renderAIField(reflection.detectedFear)}
                    </div>
                  </div>
                )}
                {reflection.thinkingPattern && (
                  <div className="quiet-block flex flex-col justify-between">
                    <div>
                      <p className="section-label mb-2">Real Question</p>
                      {renderAIField(reflection.thinkingPattern)}
                    </div>
                  </div>
                )}
                {reflection.growthDirection && (
                  <div className="quiet-block flex flex-col justify-between">
                    <div>
                      <p className="section-label mb-2">Future Perspective</p>
                      {renderAIField(reflection.growthDirection)}
                    </div>
                  </div>
                )}
                {reflection.nextStep && (
                  <div className="quiet-block flex flex-col justify-between">
                    <div>
                      <p className="section-label mb-2">One Small Step</p>
                      {renderAIField(reflection.nextStep)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <FeedbackButton />
    </div>
  )
}
