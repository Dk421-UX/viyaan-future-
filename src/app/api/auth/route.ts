import bcrypt from 'bcrypt'
import { NextRequest, NextResponse } from 'next/server'
import {
  clearSessionCookieOptions,
  createSession,
  getSession,
  revokeSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '../../../lib/auth'
import { getEnvDiagnostics, validateServerEnv } from '../../../lib/env'
import { prisma } from '../../../lib/prisma'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  sanitizeText,
} from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

function validPassword(password: string) {
  return password.length >= 8 && password.length <= 128
}

/** Logs environment diagnostics without exposing any secret values. */
function logEnvStatus(requestId: string) {
  const checks = getEnvDiagnostics()
  const summary = checks
    .map((c) => {
      if (c.minLength !== undefined) {
        return `${c.name}=${c.present ? 'SET' : 'MISSING'} (minLen=${c.minLength}: ${c.meetsLength ? 'OK' : 'FAIL'})`
      }
      return `${c.name}=${c.present ? 'SET' : 'MISSING'}`
    })
    .join(', ')
  console.info(`[auth][${requestId}] env check: ${summary}`)
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 9)
  console.info(`[auth][${requestId}] POST /api/auth received`)

  // ── 1. Environment validation ────────────────────────────────────────────
  try {
    logEnvStatus(requestId)
    validateServerEnv()
    console.info(`[auth][${requestId}] env validation passed`)
  } catch (envError) {
    const message = envError instanceof Error ? envError.message : String(envError)
    console.error(`[auth][${requestId}] FATAL env validation failed: ${message}`)
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable. Please contact support.' },
      { status: 503 }
    )
  }

  // ── 2. Parse request body ────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
    console.info(`[auth][${requestId}] request body parsed`)
  } catch {
    console.warn(`[auth][${requestId}] failed to parse request body`)
    return jsonError('Invalid request body.')
  }

  const action = sanitizeText(body.action, 32)
  const name = sanitizeText(body.name, 80)
  const email = sanitizeText(body.email, 320).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const ip = getClientIp(req)

  console.info(`[auth][${requestId}] action="${action}" ip="${ip}" email="${email ? '[redacted]' : 'none'}"`)

  // ── 3. Action routing ────────────────────────────────────────────────────
  try {
    if (action === 'signup') {
      const rate = checkRateLimit(`auth:signup:${ip}`, 8, 60 * 60 * 1000)
      if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)
      if (name.length < 2) return jsonError('Please enter your name.')
      if (!EMAIL_PATTERN.test(email)) return jsonError('Enter a valid email address.')
      if (!validPassword(password)) return jsonError('Password must be 8 to 128 characters.')

      console.info(`[auth][${requestId}] signup: checking for existing user`)
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (existing) return jsonError('An account already exists for this email.', 409)

      console.info(`[auth][${requestId}] signup: hashing password`)
      const passwordHash = await bcrypt.hash(password, 12)
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: { id: true, email: true },
      })
      console.info(`[auth][${requestId}] signup: creating session`)
      const token = await createSession(user)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      console.info(`[auth][${requestId}] signup: success`)
      return response
    }

    if (action === 'login') {
      const rate = checkRateLimit(`auth:login:${ip}:${email || 'unknown'}`, 12, 15 * 60 * 1000)
      if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)
      if (!EMAIL_PATTERN.test(email) || !password) return jsonError('Email and password are required.')

      console.info(`[auth][${requestId}] login: looking up user`)
      const user = await prisma.user.findUnique({ where: { email } })
      console.info(`[auth][${requestId}] login: user found=${Boolean(user)}, verifying password`)
      const valid = user ? await bcrypt.compare(password, user.passwordHash) : false
      if (!user || !valid) {
        console.info(`[auth][${requestId}] login: invalid credentials`)
        return jsonError('Invalid email or password.', 401)
      }

      console.info(`[auth][${requestId}] login: pruning expired sessions`)
      await prisma.session.deleteMany({
        where: { userId: user.id, expiresAt: { lte: new Date() } },
      })
      console.info(`[auth][${requestId}] login: creating session`)
      const token = await createSession(user)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      console.info(`[auth][${requestId}] login: success`)
      return response
    }

    if (action === 'logout') {
      console.info(`[auth][${requestId}] logout: revoking session`)
      const session = await getSession()
      if (session) await revokeSession(session.sessionId)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, '', clearSessionCookieOptions())
      console.info(`[auth][${requestId}] logout: success`)
      return response
    }

    if (action === 'change-password') {
      console.info(`[auth][${requestId}] change-password: verifying session`)
      const session = await getSession()
      if (!session) return jsonError('Your session has expired. Please sign in again.', 401)
      const rate = checkRateLimit(`auth:password:${session.userId}:${ip}`, 6, 60 * 60 * 1000)
      if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)
      if (!oldPassword || !validPassword(newPassword)) {
        return jsonError('Enter your current password and a new password of at least 8 characters.')
      }

      console.info(`[auth][${requestId}] change-password: verifying old password`)
      const user = await prisma.user.findUnique({ where: { id: session.userId } })
      if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
        return jsonError('Your current password is incorrect.')
      }
      if (await bcrypt.compare(newPassword, user.passwordHash)) {
        return jsonError('Choose a password you have not just been using.')
      }

      console.info(`[auth][${requestId}] change-password: updating password and sessions`)
      const passwordHash = await bcrypt.hash(newPassword, 12)
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
      ])
      const token = await createSession(user)
      const response = NextResponse.json({ success: true })
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
      console.info(`[auth][${requestId}] change-password: success`)
      return response
    }

    console.warn(`[auth][${requestId}] unsupported action: "${action}"`)
    return jsonError('Unsupported authentication action.')
  } catch (error) {
    // Unique Prisma constraint violation (duplicate email race condition)
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      console.warn(`[auth][${requestId}] duplicate entry conflict (P2002)`)
      return jsonError('An account already exists for this email.', 409)
    }

    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error(`[auth][${requestId}] unhandled exception: ${message}`)
    if (stack) console.error(`[auth][${requestId}] stack: ${stack}`)

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication is temporarily unavailable. Please try again.',
      },
      { status: 500 }
    )
  }
}
