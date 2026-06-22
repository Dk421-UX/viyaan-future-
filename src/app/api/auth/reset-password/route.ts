import bcrypt from 'bcrypt'
import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookieOptions, hashToken, SESSION_COOKIE } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`reset-password:${getClientIp(req)}`, 8, 60 * 60 * 1000)
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!token || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { success: false, error: 'Use a valid reset link and an 8 to 128 character password.' },
      { status: 400 }
    )
  }

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, expiresAt: true },
    })
    if (!resetToken || resetToken.expiresAt <= new Date()) {
      if (resetToken) await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      return NextResponse.json(
        { success: false, error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
      prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
    ])
    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE, '', clearSessionCookieOptions())
    return response
  } catch (error) {
    console.error('Password reset failed:', error)
    return NextResponse.json(
      { success: false, error: 'The password could not be reset. Please try again.' },
      { status: 500 }
    )
  }
}
