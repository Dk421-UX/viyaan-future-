import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { checkRateLimit, cleanInt, getClientIp, rateLimitResponse, sanitizeText } from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

const VALID_TYPES = new Set(['useful', 'artificial', 'human', 'bug', 'feature'])

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const rate = checkRateLimit(`feedback:${session.userId}:${getClientIp(req)}`, 12, 60 * 60 * 1000)
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const rating = cleanInt(body.rating)
  const type = sanitizeText(body.type, 40)
  const message = sanitizeText(body.message, 1200)

  if (rating === null || !VALID_TYPES.has(type) || message.length < 3) {
    return NextResponse.json({ success: false, error: 'Rating, feedback type, and message are required.' }, { status: 400 })
  }

  await prisma.feedback.create({
    data: {
      userId: session.userId,
      rating,
      type,
      message,
    },
  })

  return NextResponse.json({ success: true })
}
