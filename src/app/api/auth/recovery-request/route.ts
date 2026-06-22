import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { checkRateLimit, getClientIp, rateLimitResponse, sanitizeText } from '../../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const email = sanitizeText(body.email, 320).toLowerCase()
  const message = sanitizeText(body.message, 1200)
  const rate = checkRateLimit(`account-recovery:${getClientIp(req)}:${email || 'unknown'}`, 4, 60 * 60 * 1000)
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

  if (!email.includes('@') || message.length < 10) {
    return NextResponse.json({ success: false, error: 'Enter your email and a recovery reason.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  await prisma.recoveryRequest.create({
    data: {
      userId: user?.id || null,
      email,
      message,
      status: 'pending',
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Recovery request received. If the account exists, the founder/admin can verify it and help restore access.',
  })
}
