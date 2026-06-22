import { NextRequest, NextResponse } from 'next/server'
import { hashToken, newSecureToken } from '../../../../lib/auth'
import { sendPasswordResetEmail } from '../../../../lib/email'
import { prisma } from '../../../../lib/prisma'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  sanitizeText,
} from '../../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const email = sanitizeText(body.email, 320).toLowerCase()
  const rate = checkRateLimit(`forgot-password:${ip}:${email}`, 5, 60 * 60 * 1000)
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

  const genericResponse = NextResponse.json({
    success: true,
    message: 'If an account exists for that email, a reset link is on its way.',
  })

  if (!email || !email.includes('@')) return genericResponse

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    })
    if (!user) return genericResponse

    const token = newSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ])

    const configuredUrl = process.env.APP_URL?.replace(/\/$/, '')
    const origin = configuredUrl || new URL(req.url).origin
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
    return genericResponse
  } catch (error) {
    console.error('Password reset email failed:', error)
    return genericResponse
  }
}
