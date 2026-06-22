import { prisma } from './prisma'
import { MEMORY_TYPES, MemoryType } from './future-self'
import { sanitizePromptText, sanitizeText } from './server-guards'

type UserProfileContext = {
  name: string | null
  lifeVision: string | null
  currentMission: string | null
  topGoal: string | null
  topFear: string | null
  values: string | null
  whoIWantToBecome: string | null
}

type MemoryRecord = {
  id: string
  type: string
  content: string
  importance: number
  lastUsedAt: Date
  createdAt: Date
}

type ScoredMemory = MemoryRecord & {
  importanceScore: number
  recencyScore: number
  relevanceScore: number
  retrievalScore: number
  repeatedCount: number
}

type MemorySignals = Partial<Record<MemoryType, unknown>>

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'being',
  'because',
  'before',
  'could',
  'every',
  'from',
  'have',
  'into',
  'just',
  'like',
  'more',
  'much',
  'that',
  'their',
  'there',
  'this',
  'through',
  'what',
  'when',
  'where',
  'with',
  'would',
  'your',
  'you',
])

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  return new Set(words)
}

function normalizeMemoryContent(value: unknown): string {
  return sanitizeText(value, 240).replace(/\s+/g, ' ').trim()
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (a.getTime() - b.getTime()) / 86400000)
}

function scoreMemory(
  memory: MemoryRecord,
  queryTokens: Set<string>,
  repeatedCount: number,
  now: Date
): ScoredMemory {
  const memoryTokens = tokenize(`${memory.type} ${memory.content}`)
  let overlap = 0
  queryTokens.forEach((token) => {
    if (memoryTokens.has(token)) overlap += 1
  })

  const importanceScore = Math.max(0, Math.min(1, memory.importance / 10))
  const recencyScore = Math.max(0, 1 - daysBetween(now, memory.lastUsedAt) / 120)
  const relevanceScore = queryTokens.size === 0 ? 0 : overlap / Math.max(1, queryTokens.size)
  const repetitionBoost = Math.min(0.25, Math.max(0, repeatedCount - 1) * 0.06)
  const retrievalScore = Math.min(
    1,
    relevanceScore * 0.45 + importanceScore * 0.3 + recencyScore * 0.2 + repetitionBoost
  )

  return {
    ...memory,
    importanceScore,
    recencyScore,
    relevanceScore,
    retrievalScore,
    repeatedCount,
  }
}

function formatMemory(memory: ScoredMemory): string {
  const repeated =
    memory.repeatedCount > 1 ? `, repeated ${memory.repeatedCount} times` : ''
  return `- Moment: [${memory.type}] ${memory.content} (importance ${memory.importance}/10, retrieval ${memory.retrievalScore.toFixed(2)}${repeated})`
}

function formatReflection(reflection: {
  createdAt: Date
  content: string
  generatedText: string
  persona: string
  intensity: number
  intensityAfter: number | null
  detectedFear: string | null
  goalsStruggles: string | null
  thinkingPattern: string | null
}) {
  return [
    `Date: ${reflection.createdAt.toDateString()}`,
    `Future self: ${reflection.persona}`,
    `Intensity: ${reflection.intensity}/10 -> ${reflection.intensityAfter ?? 'not recorded'}/10`,
    `User reflection: ${JSON.stringify(sanitizePromptText(reflection.content, 900))}`,
    `Future response excerpt: ${JSON.stringify(sanitizePromptText(reflection.generatedText, 900))}`,
    reflection.detectedFear
      ? `Remembered concern: ${JSON.stringify(sanitizePromptText(reflection.detectedFear, 360))}`
      : '',
    reflection.goalsStruggles
      ? `Goal or struggle: ${JSON.stringify(sanitizePromptText(reflection.goalsStruggles, 360))}`
      : '',
    reflection.thinkingPattern
      ? `What the user was really asking: ${JSON.stringify(sanitizePromptText(reflection.thinkingPattern, 360))}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function repeatedRows(memories: MemoryRecord[], type: string) {
  const counts = new Map<string, number>()
  memories.filter((memory) => memory.type === type).forEach((memory) => {
    counts.set(memory.content, (counts.get(memory.content) || 0) + 1)
  })
  return Array.from(counts, ([content, count]) => ({ content, _count: { content: count } }))
    .sort((a, b) => b._count.content - a._count.content)
    .slice(0, 5)
}

function reflectionRelevance(content: string, queryTokens: Set<string>) {
  const tokens = tokenize(content)
  let overlap = 0
  queryTokens.forEach((token) => { if (tokens.has(token)) overlap += 1 })
  return overlap / Math.max(1, queryTokens.size)
}

export async function retrieveMemoryContext({
  userId,
  inputText,
  persona,
  profile,
}: {
  userId: string
  inputText: string
  persona: string
  profile: UserProfileContext
}) {
  const startedAt = Date.now()
  const now = new Date()
  const queryText = [
    inputText,
    persona,
    profile.lifeVision,
    profile.currentMission,
    profile.topGoal,
    profile.topFear,
    profile.values,
    profile.whoIWantToBecome,
  ]
    .filter(Boolean)
    .join(' ')
  const queryTokens = tokenize(queryText)

  const [rawMemories, recentReflections] = await Promise.all([
      prisma.memory.findMany({
        where: { userId },
        orderBy: [{ importance: 'desc' }, { lastUsedAt: 'desc' }],
        take: 160,
      }),
      prisma.reflection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

  const repeatedFearRows = repeatedRows(rawMemories, 'fear')
  const repeatedGoalRows = repeatedRows(rawMemories, 'goal')
  const repeatedQuestionRows = repeatedRows(rawMemories, 'question')
  const repeatedDecisionRows = repeatedRows(rawMemories, 'decision')
  const repeatedCycleRows = repeatedRows(rawMemories, 'emotionalCycle')
  const repeatedThemeRows = rawMemories
    .filter((memory) => ['theme', 'pattern', 'repeatedConcern', 'question', 'decision', 'emotionalCycle'].includes(memory.type))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)

  const countsByKey = new Map<string, number>()
  rawMemories.forEach((memory) => {
    const key = `${memory.type}:${memory.content.toLowerCase()}`
    countsByKey.set(key, (countsByKey.get(key) || 0) + 1)
  })

  const scoredMemories = rawMemories
    .map((memory) =>
      scoreMemory(
        memory,
        queryTokens,
        countsByKey.get(`${memory.type}:${memory.content.toLowerCase()}`) || 1,
        now
      )
    )
    .sort((a, b) => b.retrievalScore - a.retrievalScore)

  const topRelevantMemories = scoredMemories.slice(0, 10)
  const mostRelevantReflection = [...recentReflections]
    .sort((a, b) => reflectionRelevance(b.content, queryTokens) - reflectionRelevance(a.content, queryTokens))[0]
  const turningPoints = recentReflections
    .filter((entry) => {
      const relief =
        typeof entry.intensityAfter === 'number'
          ? entry.intensity - entry.intensityAfter
          : 0
      return entry.intensity >= 8 || relief >= 3 || !!entry.growthDirection
    })
    .slice(0, 4)

  if (topRelevantMemories.length > 0) {
    await prisma.memory.updateMany({
      where: { id: { in: topRelevantMemories.map((memory) => memory.id) } },
      data: { lastUsedAt: now },
    })
  }

  const contextText = [
    topRelevantMemories.length
      ? `TOP RELEVANT MEMORIES\n${topRelevantMemories.map(formatMemory).join('\n')}`
      : 'TOP RELEVANT MEMORIES\n- None yet. Treat this first reflection as the first memory.',
    recentReflections.length
      ? `RECENT REFLECTIONS\n${recentReflections.map(formatReflection).join('\n\n')}`
      : 'RECENT REFLECTIONS\n- None yet.',
    mostRelevantReflection
      ? `MOST RELEVANT REFLECTION\n${formatReflection(mostRelevantReflection)}`
      : 'MOST RELEVANT REFLECTION\n- None yet.',
    repeatedFearRows.length
      ? `REPEATED FEARS\n${repeatedFearRows.map((row) => `- ${row.content} (${row._count.content} times)`).join('\n')}`
      : 'REPEATED FEARS\n- None yet.',
    repeatedGoalRows.length
      ? `REPEATED GOALS\n${repeatedGoalRows.map((row) => `- ${row.content} (${row._count.content} times)`).join('\n')}`
      : 'REPEATED GOALS\n- None yet.',
    repeatedQuestionRows.length
      ? `REPEATED QUESTIONS\n${repeatedQuestionRows.map((row) => `- ${row.content} (${row._count.content} times)`).join('\n')}`
      : 'REPEATED QUESTIONS\n- None yet.',
    repeatedDecisionRows.length
      ? `REPEATED DECISIONS\n${repeatedDecisionRows.map((row) => `- ${row.content} (${row._count.content} times)`).join('\n')}`
      : 'REPEATED DECISIONS\n- None yet.',
    repeatedCycleRows.length
      ? `REPEATED EMOTIONAL CYCLES\n${repeatedCycleRows.map((row) => `- ${row.content} (${row._count.content} times)`).join('\n')}`
      : 'REPEATED EMOTIONAL CYCLES\n- None yet.',
    repeatedThemeRows.length
      ? `REPEATED THEMES\n${repeatedThemeRows.map((memory) => `- ${memory.content}`).join('\n')}`
      : 'REPEATED THEMES\n- None yet.',
    turningPoints.length
      ? `PAST TURNING POINTS\n${turningPoints.map(formatReflection).join('\n\n')}`
      : 'PAST TURNING POINTS\n- None yet.',
  ].join('\n\n')

  return {
    contextText,
    topRelevantMemories,
    recentReflections,
    repeatedFears: repeatedFearRows,
    repeatedGoals: repeatedGoalRows,
    repeatedQuestions: repeatedQuestionRows,
    repeatedDecisions: repeatedDecisionRows,
    repeatedCycles: repeatedCycleRows,
    repeatedThemes: repeatedThemeRows,
    mostRelevantReflection,
    turningPoints,
    retrievalMs: Date.now() - startedAt,
  }
}

export async function upsertMemorySignals(userId: string, signals: MemorySignals) {
  const now = new Date()
  const writes: Promise<unknown>[] = []

  MEMORY_TYPES.forEach((type) => {
    const rawValue = signals[type]
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]

    values.forEach((value) => {
      const content = normalizeMemoryContent(value)
      if (!content) return

      writes.push(
        prisma.memory
          .findFirst({
            where: {
              userId,
              type,
              content,
            },
          })
          .then((existing) => {
            if (existing) {
              return prisma.memory.update({
                where: { id: existing.id },
                data: {
                  importance: Math.min(10, existing.importance + 1),
                  lastUsedAt: now,
                },
              })
            }

            return prisma.memory.create({
              data: {
                userId,
                type,
                content,
                importance:
                  type === 'goal' || type === 'fear' || type === 'decision' ? 6 : 5,
                lastUsedAt: now,
              },
            })
          })
      )
    })
  })

  await Promise.all(writes)
}

export function buildProfileContext(profile: UserProfileContext) {
  return [
    `Name: ${profile.name || 'Present me'}`,
    `Life vision: ${profile.lifeVision || 'Not set yet'}`,
    `Current focus: ${profile.currentMission || 'Not set yet'}`,
    `Top goal: ${profile.topGoal || 'Not set yet'}`,
    `Biggest fear: ${profile.topFear || 'Not set yet'}`,
    `Values: ${profile.values || 'Not set yet'}`,
    `Future vision: ${profile.whoIWantToBecome || 'Not set yet'}`,
  ].join('\n')
}
