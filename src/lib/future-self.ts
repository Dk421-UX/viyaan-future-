export const FUTURE_SELF_PERSONAS = [
  {
    id: 'one-year',
    name: '1 Year Older Me',
    horizon: 'one year later',
    description: 'Close enough to remember the texture of this season.',
  },
  {
    id: 'five-years',
    name: '5 Years Older Me',
    horizon: 'five years later',
    description: 'Far enough to see what this became.',
  },
  {
    id: 'ten-years',
    name: '10 Years Older Me',
    horizon: 'ten years later',
    description: 'Looking back from a quieter, wider life.',
  },
  {
    id: 'through-this',
    name: 'After Getting Through This',
    horizon: 'after this difficult stretch',
    description: 'Speaking from the other side of what feels heavy now.',
  },
  {
    id: 'building-toward',
    name: 'After Building What I Am Working Toward',
    horizon: 'after the work became real',
    description: 'Remembering the days when it was still unfinished.',
  },
  {
    id: 'looking-back',
    name: 'After Looking Back',
    horizon: 'after enough time has passed to see clearly',
    description: 'Soft, honest, and specific about what mattered.',
  },
] as const

export type FutureSelfPersonaName = (typeof FUTURE_SELF_PERSONAS)[number]['name']
export type FutureSelfPersona = (typeof FUTURE_SELF_PERSONAS)[number]

export const DEFAULT_PERSONA = FUTURE_SELF_PERSONAS[0].name

export function normalizePersona(value: unknown): FutureSelfPersonaName {
  if (typeof value !== 'string') return DEFAULT_PERSONA
  const match = FUTURE_SELF_PERSONAS.find((persona) => persona.name === value)
  return (match?.name || DEFAULT_PERSONA) as FutureSelfPersonaName
}

export const MEMORY_TYPES = [
  'goal',
  'fear',
  'dream',
  'decision',
  'emotionalCycle',
  'milestone',
  'pattern',
  'question',
  'theme',
  'victory',
  'regret',
  'lesson',
  'repeatedConcern',
] as const

export type MemoryType = (typeof MEMORY_TYPES)[number]

export const FORBIDDEN_LANGUAGE = [
  'trust the process',
  'everything happens for a reason',
  'growth mindset',
  'manifest',
  'believe in yourself',
  'healing journey',
  'journey',
  'potential',
  'cognitive distortion',
  'behavioral pattern',
  'emotional regulation',
  'underlying issue',
  'root cause',
  'deep work',
  'limiting belief',
  'inner child',
]

const replacements: Record<string, string> = {
  'trust the process': 'stay with the next honest step',
  'everything happens for a reason': 'I cannot pretend this was meant to happen',
  'growth mindset': 'the way you kept adjusting',
  manifest: 'build',
  'believe in yourself': 'remember what you have already carried',
  journey: 'part of life',
  potential: 'what you could make real',
  'cognitive distortion': 'the story fear kept telling',
  'behavioral pattern': 'the thing you kept repeating',
  'emotional regulation': 'steadying yourself',
  'underlying issue': 'what was underneath',
  'root cause': 'what was underneath',
  'deep work': 'the ordinary work',
  'limiting belief': 'old fear',
  'inner child': 'younger self',
}

export function removeForbiddenLanguage(text: string): string {
  return FORBIDDEN_LANGUAGE.reduce((current, phrase) => {
    const replacement = replacements[phrase] || ''
    return current.replace(new RegExp(phrase, 'gi'), replacement)
  }, text)
}

export function hasForbiddenLanguage(text: string): boolean {
  const lower = text.toLowerCase()
  return FORBIDDEN_LANGUAGE.some((phrase) => lower.includes(phrase))
}
