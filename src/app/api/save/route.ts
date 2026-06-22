import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { normalizePersona } from '../../../lib/future-self'
import { upsertMemorySignals } from '../../../lib/memory-engine'
import {
  checkRateLimit,
  cleanInt,
  cleanOptionalString,
  getClientIp,
  rateLimitResponse,
  sanitizeText,
} from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(
      `save:${session.userId}:${getClientIp(req)}`,
      40,
      60 * 60 * 1000
    )
    if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 })
    }

    const {
      inputText,
      generatedText,
      intensityBefore,
      intensityAfter,
      persona,
      primaryEmotion,
      secondaryEmotion,
      confidenceLevel,
      fearLevel,
      stressLevel,
      hopeLevel,
      goalsStruggles,
      detectedFear,
      thinkingPattern,
      growthDirection,
      nextStep,
      fear,
      goal,
      dream,
      decision,
      emotionalCycle,
      milestone,
      pattern,
      question,
      theme,
      victory,
      regret,
      lesson,
      repeatedConcern,
    } = body

    const cleanInputText = sanitizeText(inputText, 2400)
    const cleanGeneratedText = sanitizeText(generatedText, 7000)

    if (!cleanInputText) {
      return NextResponse.json({ success: false, error: 'Input text is required' }, { status: 400 })
    }

    if (!cleanGeneratedText) {
      return NextResponse.json({ success: false, error: 'Generated reflection letter is required' }, { status: 400 })
    }

    const cleanIntensityBefore = cleanInt(intensityBefore)
    if (cleanIntensityBefore === null) {
      return NextResponse.json({ success: false, error: 'Valid intensityBefore (1-10) is required' }, { status: 400 })
    }

    // 1. Create Reflection
    await prisma.reflection.create({
      data: {
        userId: session.userId,
        content: cleanInputText,
        generatedText: cleanGeneratedText,
        intensity: cleanIntensityBefore,
        intensityAfter: cleanInt(intensityAfter),
        persona: normalizePersona(persona),
        primaryEmotion: cleanOptionalString(primaryEmotion, 80),
        secondaryEmotion: cleanOptionalString(secondaryEmotion, 80),
        confidenceLevel: cleanInt(confidenceLevel),
        fearLevel: cleanInt(fearLevel),
        stressLevel: cleanInt(stressLevel),
        hopeLevel: cleanInt(hopeLevel),
        goalsStruggles: cleanOptionalString(goalsStruggles, 600),
        detectedFear: cleanOptionalString(detectedFear, 900),
        thinkingPattern: cleanOptionalString(thinkingPattern, 900),
        growthDirection: cleanOptionalString(growthDirection, 900),
        nextStep: cleanOptionalString(nextStep, 500),
      },
    })

    await upsertMemorySignals(session.userId, {
      fear,
      goal,
      dream,
      decision,
      emotionalCycle,
      milestone,
      pattern,
      question,
      theme,
      victory,
      regret,
      lesson,
      repeatedConcern,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save reflection error:', error)
    return NextResponse.json({ success: false, error: 'The reflection could not be saved. Please try again.' }, { status: 500 })
  }
}
