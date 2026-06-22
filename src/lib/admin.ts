import { prisma } from './prisma'
import { getSession } from './auth'

export async function getAdminUser() {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) return null

  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!allowed.includes(user.email.toLowerCase())) return null
  return user
}
