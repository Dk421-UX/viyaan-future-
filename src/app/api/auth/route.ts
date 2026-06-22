import bcrypt from 'bcrypt'
import { NextRequest, NextResponse } from 'next/server'
import {
  clearSessionCookieOptions,
  createSession,
  getSession,
  revokeSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  sanitizeText,
} from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

function validPassword(password: string) {
  return password.length >= 8 && password.length <= 128
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid request body.')
  }

  const action = sanitizeText(body.action, 32)
  const name = sanitizeText(body.name, 80)
  const email = sanitizeText(body.email, 320).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const ip = getClientIp(req)

  try {
    if (action === 'signup') {
      const rate = checkRateLimit(`auth:signup:${ip}`, 8, 60 * 60 * 1000)
      if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)
      if (name.length < 2) return jsonError('Please enter your name.')
      if (!EMAIL_PATTERN.test(email)) return jsonError('Enter a valid email address.')
      if (!validPassword(password)) return jsonError('Password must be 8 to 128 characters.')

      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (existing) return jsonError('An account already exists for this email.', 409)

      const passwordHash = await bcrypt.hash(password, 12)
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: { id: true, email: true },
      })
      const token = await createSession(user)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      return response
    }

    if (action === 'login') {
      const rate = checkRateLimit(`auth:login:${ip}:${email || 'unknown'}`, 12, 15 * 60 * 1000)
      if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)
      if (!EMAIL_PATTERN.test(email) || !password) return jsonError('Email and password are required.')

      const user = await prisma.user.findUnique({ where: { email } })
      const valid = user ? await bcrypt.compare(password, user.passwordHash) : false
      if (!user || !valid) return jsonError('Invalid email or password.', 401)

      await prisma.session.deleteMany({
        where: { userId: user.id, expiresAt: { lte: new Date() } },
      })
      const token = await createSession(user)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      return response
    }

    if (action === 'logout') {
      const session = await getSession()
      if (session) await revokeSession(session.sessionId)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, '', clearSessionCookieOptions())
      return response
    }

    if (action === 'change-password') {
      const session = await getSession()
      if (!session) return jsonError('Your session has expired. Please sign in again.', 401)
      const rate = checkRateLimit(`auth:password:${session.userId}:${ip}`, 6, 60 * 60 * 1000)
      if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)
      if (!oldPassword || !validPassword(newPassword)) {
        return jsonError('Enter your current password and a new password of at least 8 characters.')
      }

      const user = await prisma.user.findUnique({ where: { id: session.userId } })
      if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
        return jsonError('Your current password is incorrect.')
      }
      if (await bcrypt.compare(newPassword, user.passwordHash)) {
        return jsonError('Choose a password you have not just been using.')
      }

      const passwordHash = await bcrypt.hash(newPassword, 12)
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
      ])
      const token = await createSession(user)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      return response
    }

    return jsonError('Unsupported authentication action.')
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return jsonError('An account already exists for this email.', 409)
    }
    console.error('Authentication request failed:', error)
    return jsonError('Authentication is temporarily unavailable. Please try again.', 500)
  }
}
