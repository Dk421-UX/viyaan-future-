import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { FORBIDDEN_LANGUAGE, removeForbiddenLanguage } from '../../../lib/future-self'
import {
  checkRateLimit,
  getClientIp,
  parseJsonObject,
  rateLimitResponse,
  sanitizePromptText,
  sanitizeText,
} from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

async function generateSummary(prompt: string): Promise<string> {
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
        if (responseText) return responseText
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

  throw lastError || new Error('Failed to generate growth summary from Gemini')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(
      `growth-summary:${session.userId}:${getClientIp(req)}`,
      8,
      60 * 60 * 1000
    )
    if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

    const { searchParams } = new URL(req.url)
    const rangeParam = searchParams.get('range')

    let days = 30
    if (rangeParam === '90') days = 90
    if (rangeParam === '365') days = 365

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [entries, memories] = await Promise.all([
      prisma.reflection.findMany({
        where: {
          userId: session.userId,
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.memory.findMany({
        where: { userId: session.userId },
        orderBy: [{ importance: 'desc' }, { lastUsedAt: 'desc' }],
        take: 12,
      }),
    ])

    const entriesContext =
      entries.length > 0
        ? entries
            .map(
              (entry, index) =>
                `Reflection #${index + 1} (${entry.createdAt.toDateString()}):\n- Future self: ${entry.persona}\n- Intensity before: ${entry.intensity}/10, after: ${entry.intensityAfter ?? 'not recorded'}/10\n- Emotions: ${entry.primaryEmotion} / ${entry.secondaryEmotion}\n- User reflection: ${JSON.stringify(sanitizePromptText(entry.content, 900))}\n- Remembered detail: ${sanitizePromptText(entry.goalsStruggles || 'None', 400)}`
            )
            .join('\n\n')
        : 'No reflections recorded in this range.'

    const memoryContext =
      memories.length > 0
        ? memories
            .map(
              (memory) =>
                `- [${memory.type}] ${sanitizePromptText(memory.content, 240)} (importance ${memory.importance}/10)`
            )
            .join('\n')
        : '- No stored memories yet.'

    const prompt = `You are the same person as the user, only older.
Write from continuity, not advice. Sound like someone looking back on shared life.

Never use these phrases: ${FORBIDDEN_LANGUAGE.join(', ')}.

Stored memories:
${memoryContext}

Reflections from the past ${days} days:
${entriesContext}

Instructions:
Write a concise letter about what kept repeating, what softened, and what became clearer.
Use concrete memories if they exist. Do not list memories.
Keep it to 3-4 short paragraphs.
If no reflections exist, write a brief note that says there is nothing to remember yet and invites the first honest reflection.

Return JSON only:
{
  "summaryText": "string"
}`

    const responseText = await generateSummary(prompt)
    const parsedData = parseJsonObject(responseText)

    if (!parsedData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse summary response as JSON',
          rawText: responseText,
        },
        { status: 502 }
      )
    }

    parsedData.summaryText = removeForbiddenLanguage(
      sanitizeText(parsedData.summaryText, 4000)
    )

    return NextResponse.json({
      success: true,
      data: parsedData,
    })
  } catch (error: any) {
    console.error('Growth Summary API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
