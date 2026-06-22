import { redirect } from 'next/navigation'
import AdminDashboardClient from '../../components/AdminDashboardClient'
import { getAdminUser } from '../../lib/admin'
import { prisma } from '../../lib/prisma'

export const dynamic = 'force-dynamic'

function topMessages(rows: { message: string }[], fallback: string[] = []) {
  return (rows.length ? rows : fallback.map((message) => ({ message })))
    .slice(0, 5)
    .map((row) => row.message.length > 180 ? `${row.message.slice(0, 177)}...` : row.message)
}

export default async function AdminPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/dashboard')

  const [feedback, aggregate, recoveryRequests] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.feedback.aggregate({
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.recoveryRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ])

  const complaints = feedback.filter((item) => item.type === 'bug' || item.type === 'artificial')
  const features = feedback.filter((item) => item.type === 'feature')
  const aiIssues = feedback.filter((item) => item.type === 'artificial' || item.type === 'human')

  return (
    <AdminDashboardClient
      averageRating={Math.round((aggregate._avg.rating || 0) * 10) / 10}
      totalFeedback={aggregate._count.id}
      commonComplaints={topMessages(complaints)}
      requestedFeatures={topMessages(features)}
      aiIssues={topMessages(aiIssues)}
      feedback={feedback.map((item) => ({
        id: item.id,
        rating: item.rating,
        type: item.type,
        message: item.message,
        createdAt: item.createdAt.toISOString(),
        user: item.user,
      }))}
      recoveryRequests={recoveryRequests.map((item) => ({
        id: item.id,
        email: item.email,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  )
}
