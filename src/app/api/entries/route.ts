import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(`entries:${session.userId}:${getClientIp(req)}`, 120, 60 * 1000)
    if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

    const reflections = await prisma.reflection.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    })

    // Map to the shape the client expects
    const entries = reflections.map((r) => ({
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

    return NextResponse.json({ success: true, entries })
  } catch (error: any) {
    console.error('Fetch reflections error:', error)
    return NextResponse.json({ success: false, error: 'Unable to load reflections.' }, { status: 500 })
  }
}
