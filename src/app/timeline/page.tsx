import { redirect } from 'next/navigation'
import TimelineClient from '../../components/TimelineClient'
import { getSession } from '../../lib/auth'
import { prisma } from '../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function TimelinePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const reflections = await prisma.reflection.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return <TimelineClient entries={reflections.map((entry) => ({
    id: entry.id,
    content: entry.content,
    generatedText: entry.generatedText,
    intensity: entry.intensity,
    intensityAfter: entry.intensityAfter,
    persona: entry.persona,
    createdAt: entry.createdAt.toISOString(),
    primaryEmotion: entry.primaryEmotion,
    fearLevel: entry.fearLevel,
    confidenceLevel: entry.confidenceLevel,
    detectedFear: entry.detectedFear,
    goalsStruggles: entry.goalsStruggles,
  }))} />
}
