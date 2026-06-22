import { NextRequest, NextResponse } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const globalForRateLimit = globalThis as unknown as {
  viyaanRateLimit?: Map<string, RateLimitEntry>
}

const store = globalForRateLimit.viyaanRateLimit || new Map<string, RateLimitEntry>()
globalForRateLimit.viyaanRateLimit = store

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  store.set(key, current)
  return { ok: true }
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please wait a moment and try again.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  )
}

export function sanitizeText(value: unknown, maxLength = 4000): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength)
}

export function sanitizePromptText(value: unknown, maxLength = 4000): string {
  return sanitizeText(value, maxLength)
    .replace(/```/g, "'''")
    .replace(/\b(system|developer|assistant|user)\s*:/gi, '$1 -')
}

export function cleanInt(value: unknown, min = 1, max = 10): number | null {
  if (value === undefined || value === null) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

export function cleanOptionalString(value: unknown, maxLength = 2000): string | null {
  const cleaned = sanitizeText(value, maxLength)
  return cleaned === '' ? null : cleaned
}

export function promptJson(value: unknown, maxLength = 4000): string {
  return JSON.stringify(sanitizePromptText(value, maxLength))
}

export function parseJsonObject(rawText: string): Record<string, any> | null {
  try {
    const startIdx = rawText.indexOf('{')
    const endIdx = rawText.lastIndexOf('}')
    const candidate =
      startIdx !== -1 && endIdx !== -1
        ? rawText.substring(startIdx, endIdx + 1)
        : rawText
    const parsed = JSON.parse(candidate)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}
