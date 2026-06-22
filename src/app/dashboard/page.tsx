import { redirect } from 'next/navigation'
import { getSession } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import DashboardClient from '../../components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [reflections, user, topFears, topGoals, reflectionsThisWeek, importantMemories, totalReflections] =
    await Promise.all([
      prisma.reflection.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          name: true,
          currentMission: true,
          topGoal: true,
          topFear: true,
        },
      }),
      prisma.memory.groupBy({
        by: ['content'],
        where: { userId: session.userId, type: 'fear' },
        _count: { content: true },
        orderBy: { _count: { content: 'desc' } },
        take: 1,
      }),
      prisma.memory.groupBy({
        by: ['content'],
        where: { userId: session.userId, type: 'goal' },
        _count: { content: true },
        orderBy: { _count: { content: 'desc' } },
        take: 1,
      }),
      prisma.reflection.count({
        where: {
          userId: session.userId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.memory.findMany({
        where: { userId: session.userId },
        orderBy: [{ importance: 'desc' }, { lastUsedAt: 'desc' }],
        take: 8,
      }),
      prisma.reflection.count({ where: { userId: session.userId } }),
    ])

  // Serialize and map schema names to UI expectations
  const serializedEntries = reflections.map((r) => ({
    id: r.id,
    userId: r.userId,
    inputText: r.content,
    generatedText: r.generatedText,
    intensityBefore: r.intensity,
    intensityAfter: r.intensityAfter,
    createdAt: r.createdAt.toISOString(),
    persona: r.persona,
    primaryEmotion: r.primaryEmotion,
    secondaryEmotion: r.secondaryEmotion,
    detectedFear: r.detectedFear,
    thinkingPattern: r.thinkingPattern,
    growthDirection: r.growthDirection,
    nextStep: r.nextStep,
    confidenceLevel: r.confidenceLevel,
    fearLevel: r.fearLevel,
    stressLevel: r.stressLevel,
    hopeLevel: r.hopeLevel,
    goalsStruggles: r.goalsStruggles,
  }))

  const mostCommonFear = topFears[0]?.content || user?.topFear || 'No fears recorded'

  const mostCommonGoal = topGoals[0]?.content || user?.topGoal || 'No goals recorded'

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <DashboardClient
        initialEntries={serializedEntries}
        totalReflections={totalReflections}
        currentFocus={user?.currentMission || 'Define your mission in Profile'}
        mostCommonFear={mostCommonFear}
        mostCommonGoal={mostCommonGoal}
        reflectionsThisWeekCount={reflectionsThisWeek}
        userName={user?.name || 'Explorer'}
        importantMemories={importantMemories.map((memory) => ({
          id: memory.id,
          type: memory.type,
          content: memory.content,
          importance: memory.importance,
        }))}
      />
    </div>
  )
}
