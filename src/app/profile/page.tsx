import { redirect } from 'next/navigation'
import { getSession } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import ProfileClient from '../../components/ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const [entryCount, user, importantMemories] = await Promise.all([
    prisma.reflection.count({
      where: { userId: session.userId },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        createdAt: true,
        name: true,
        lifeVision: true,
        currentMission: true,
        topGoal: true,
        topFear: true,
        values: true,
        whoIWantToBecome: true,
      },
    }),
    prisma.memory.findMany({
      where: { userId: session.userId },
      orderBy: [{ importance: 'desc' }, { lastUsedAt: 'desc' }],
      take: 8,
    }),
  ])

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <ProfileClient
        email={user.email}
        entryCount={entryCount}
        createdAtString={user.createdAt.toISOString()}
        initialName={user.name || ''}
        initialLifeVision={user.lifeVision || ''}
        initialCurrentMission={user.currentMission || ''}
        initialTopGoal={user.topGoal || ''}
        initialTopFear={user.topFear || ''}
        initialValues={user.values || ''}
        initialWhoIWantToBecome={user.whoIWantToBecome || ''}
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
