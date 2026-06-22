import { NextRequest, NextResponse } from 'next/server'
import { getSession, SESSION_COOKIE } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  FORBIDDEN_LANGUAGE,
  normalizePersona,
  removeForbiddenLanguage,
} from '../../../lib/future-self'
import {
  checkRateLimit,
  cleanInt,
  getClientIp,
  parseJsonObject,
  promptJson,
  rateLimitResponse,
  sanitizePromptText,
  sanitizeText,
} from '../../../lib/server-guards'
import {
  buildProfileContext,
  retrieveMemoryContext,
} from '../../../lib/memory-engine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Helper to call Gemini with retry and fallback
async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash-latest']
  let lastError: any = null

  for (const modelName of models) {
    let retries = 2
    while (retries >= 0) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        })

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        if (responseText) {
          return responseText
        }
      } catch (err: any) {
        lastError = err
        const status = err?.status || err?.statusCode || 0
        if (status === 503 && retries > 0) {
          retries--
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }
        break
      }
    }
  }

  throw lastError || new Error('Failed to generate content from Gemini API')
}

function firstSentence(text: string, fallback: string) {
  const clean = sanitizeText(text, 420).replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.split(/(?<=[.!?])\s+/)[0]?.slice(0, 220) || fallback
}

function buildFallbackResponse({
  inputText,
  intensity,
  persona,
  memoryContext,
}: {
  inputText: string
  intensity: number
  persona: string
  memoryContext: Awaited<ReturnType<typeof retrieveMemoryContext>>
}) {
  const memory =
    memoryContext.topRelevantMemories[0]?.content ||
    memoryContext.recentReflections[0]?.content ||
    inputText
  const repeatedFear = memoryContext.repeatedFears[0]?.content
  const repeatedGoal = memoryContext.repeatedGoals[0]?.content
  const repeatedQuestion = memoryContext.repeatedQuestions?.[0]?.content
  const concreteMoment = firstSentence(memory, 'writing this down before you had any proof it would work')
  const asked = repeatedQuestion
    ? `whether this same question would ever stop returning: ${repeatedQuestion}`
    : `whether you could move without being completely certain first`
  const hiddenFear = repeatedFear || firstSentence(inputText, 'choosing wrong and having to live with it')
  const futurePerspective = repeatedGoal
    ? `What mattered later was how often you returned to ${repeatedGoal}, even when the plan kept changing.`
    : 'What mattered later was not the perfect decision. It was the small repeated proof that you could keep moving while unsure.'
  const oneThing = 'Waiting for certainty cost more time than the mistakes did.'

  return {
    primaryEmotion: intensity >= 7 ? 'pressure' : 'uncertainty',
    secondaryEmotion: repeatedGoal ? 'ambition' : 'hope',
    confidenceLevel: Math.max(3, Math.min(8, 11 - intensity)),
    fearLevel: Math.max(3, intensity),
    stressLevel: intensity,
    hopeLevel: repeatedGoal ? 7 : 6,
    goalsStruggles: repeatedGoal || firstSentence(inputText, 'trying to make the next step feel safe enough'),
    generatedText: removeForbiddenLanguage(`I remember this.

Not as an idea. As a small scene: ${concreteMoment}.

I remember how you kept reopening the same question, hoping the next answer would finally remove the risk. I got that wrong for a while too. I thought there was a cleaner version of the future where every choice made sense before I made it.

There wasn't.

The progress came more awkwardly than that. It came after a few ordinary decisions that still felt unfinished. Some worked. Some did not. A few mattered less than I expected.

If this has shown up before, notice that. Not because something is broken in you. Because you keep asking for certainty when what you actually need is enough honesty to take the next step.

I am not completely sure we understood this season while we were inside it.

But I remember this part clearly: you were not as lost as it felt. You were practicing living without a guarantee.`),
    detectedFear: hiddenFear,
    thinkingPattern: `You were really asking ${asked}.`,
    growthDirection: futurePerspective,
    nextStep: oneThing,
    fear: hiddenFear,
    goal: repeatedGoal || null,
    dream: null,
    decision: firstSentence(inputText, 'whether to keep moving without a guarantee'),
    emotionalCycle: 'reopening the same question to look for certainty',
    milestone: null,
    pattern: 'asking for certainty before acting',
    question: asked,
    theme: repeatedGoal || repeatedFear || 'uncertain decisions',
    victory: null,
    regret: 'waiting too long for the choice to feel risk-free',
    lesson: oneThing,
    repeatedConcern: repeatedFear || 'making the wrong choice',
    intensity,
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(
      `generate:${session.userId}:${getClientIp(req)}`,
      12,
      60 * 60 * 1000
    )
    if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 })
    }

    const inputText = sanitizeText(body.inputText, 2400)
    const intensity = cleanInt(body.intensityBefore)
    const persona = normalizePersona(body.persona)

    if (!inputText) {
      return NextResponse.json({ success: false, error: 'Input text is required' }, { status: 400 })
    }

    if (intensity === null) {
      return NextResponse.json({ success: false, error: 'Intensity must be a number between 1 and 10' }, { status: 400 })
    }

    // 1. Fetch User Profile Context
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        lifeVision: true,
        currentMission: true,
        topGoal: true,
        topFear: true,
        values: true,
        whoIWantToBecome: true,
      },
    })
    if (!user) {
      // The JWT is valid but the user record is gone (e.g., DB reset).
      // Clear the stale cookie and return 401 so the client redirects to login.
      const response = NextResponse.json(
        { success: false, error: 'Session expired. Please sign in again.' },
        { status: 401 }
      )
      response.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
      })
      return response
    }

    const memoryContext = await retrieveMemoryContext({
      userId: session.userId,
      inputText,
      persona,
      profile: user,
    })

    const prompt = `You are not an AI assistant, therapist, coach, guru, philosopher, or character.
You are the same person as the user, only older: ${persona}.

Viyaan Future is "A conversation with the person you are becoming."
This response must feel like relationship continuity, not a generic answer.

V9 HUMAN INTELLIGENCE RULE:
You lived through the years between now and then. Do not sound wise. Sound like someone remembering what actually happened.

Before writing, use the memory context. If there are old memories, recall one or two naturally as concrete moments. Do not list them.
If there are no old memories yet, make this entry feel like the first thing you are carefully remembering.

Rules for the future self:
- Remember moments before advising.
- Observe before explaining.
- Speak from lived experience.
- Admit uncertainty when it is human.
- Use simple, direct paragraphs.
- Never predict exact outcomes.
- Never sound like a professional giving a diagnosis.
- Avoid abstract philosophy, poetic grandness, and deep-sounding analysis.
- Prefer specific situations, repeated actions, real mistakes, and believable uncertainty.
- Never use these phrases: ${FORBIDDEN_LANGUAGE.join(', ')}.

Preferred language:
- I remember...
- The strange thing was...
- What surprised me later...
- I did not realize it then...
- I thought this would matter forever...
- I was wrong about...
- I spent weeks/months doing...
- I was not sure either...
- I remember checking/reopening/delaying...

Pattern detection:
Always ask: Have I seen this before? Have I worried about this before? Have I struggled with this before?
If yes, reference the repeated fear, repeated goal, repeated question, repeated decision, or emotional cycle naturally.
Example style: "This is the seventh time you've asked some version of this question..."

Future self test:
Would this sound believable in a notebook discovered ten years later?
If no, rewrite it in your head before returning JSON.

Insight card rules:
- thinkingPattern must answer "What You Were Really Asking"
- detectedFear must answer "Hidden Fear"
- growthDirection must answer "Future Perspective"
- nextStep must answer "One Thing I Wish I Knew Earlier"

USER PROFILE
${sanitizePromptText(buildProfileContext(user), 2400)}

MEMORY RETRIEVAL CONTEXT
${sanitizePromptText(memoryContext.contextText, 9000)}

CURRENT REFLECTION
Reflection text: ${promptJson(inputText, 2400)}
Intensity before: ${intensity}/10

Return JSON only. No markdown.
Use short 3-7 word memory labels so they can be grouped later.

Expected JSON:
{
  "primaryEmotion": "string",
  "secondaryEmotion": "string",
  "confidenceLevel": number,
  "fearLevel": number,
  "stressLevel": number,
  "hopeLevel": number,
  "goalsStruggles": "string",
  "generatedText": "string",
  "detectedFear": "string or null",
  "thinkingPattern": "string or null",
  "growthDirection": "string or null",
  "nextStep": "string or null",
  "fear": "string or null",
  "goal": "string or null",
  "dream": "string or null",
  "decision": "string or null",
  "emotionalCycle": "string or null",
  "milestone": "string or null",
  "pattern": "string or null",
  "question": "string or null",
  "theme": "string or null",
  "victory": "string or null",
  "regret": "string or null",
  "lesson": "string or null",
  "repeatedConcern": "string or null",
  "intensity": number
}`

    let parsedData: Record<string, any> | null = null
    try {
      const responseText = await generateWithGemini(prompt)
      parsedData = parseJsonObject(responseText)
    } catch {
      parsedData = buildFallbackResponse({ inputText, intensity, persona, memoryContext })
    }

    if (!parsedData) {
      parsedData = buildFallbackResponse({ inputText, intensity, persona, memoryContext })
    }

    parsedData.generatedText = removeForbiddenLanguage(
      sanitizeText(parsedData.generatedText, 7000)
    )
    parsedData.intensity = cleanInt(parsedData.intensity) || intensity
    parsedData.retrieval = {
      memoriesUsed: memoryContext.topRelevantMemories.length,
      recentReflectionsUsed: memoryContext.recentReflections.length,
      repeatedFearsFound: memoryContext.repeatedFears.length,
      repeatedGoalsFound: memoryContext.repeatedGoals.length,
      repeatedQuestionsFound: memoryContext.repeatedQuestions?.length || 0,
      repeatedDecisionsFound: memoryContext.repeatedDecisions?.length || 0,
      repeatedCyclesFound: memoryContext.repeatedCycles?.length || 0,
      repeatedThemesFound: memoryContext.repeatedThemes.length,
      retrievalMs: memoryContext.retrievalMs,
    }

    if (!parsedData.generatedText) {
      return NextResponse.json({
        success: false,
        error: 'Generated reflection letter was empty',
      }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    })

  } catch (error: any) {
    console.error('Gemini Generation error:', error)
    return NextResponse.json({ success: false, error: 'Your future self could not write back just now. Please try again.' }, { status: 500 })
  }
}
