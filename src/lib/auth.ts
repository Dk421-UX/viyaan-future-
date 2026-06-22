import { createHash, randomBytes, randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { SESSION_COOKIE } from './auth-constants'

export { SESSION_COOKIE }

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

export type SessionUser = {
  userId: string
  email: string
  name: string
  sessionId: string
}

type SessionPayload = {
  userId: string
  email: string
  sessionId: string
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || (process.env.NODE_ENV === 'production' && secret.length < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters')
  }
  return secret
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    priority: 'high' as const,
  }
}

export function clearSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  }
}

function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
    issuer: 'viyaan-future',
    audience: 'viyaan-future-web',
  })
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'viyaan-future',
      audience: 'viyaan-future-web',
    }) as SessionPayload

    if (!decoded?.userId || !decoded?.email || !decoded?.sessionId) return null
    return {
      userId: decoded.userId,
      email: decoded.email,
      sessionId: decoded.sessionId,
    }
  } catch {
    return null
  }
}

export async function createSession(user: { id: string; email: string }): Promise<string> {
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  const token = signToken({ userId: user.id, email: user.email, sessionId })

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  })

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const session = await prisma.session.findFirst({
    where: {
      id: payload.sessionId,
      userId: payload.userId,
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      lastUsedAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  })

  if (!session) return null

  if (Date.now() - session.lastUsedAt.getTime() > 12 * 60 * 60 * 1000) {
    void prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined)
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? '',
    sessionId: session.id,
  }
}

export async function revokeSession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } })
}

export function newSecureToken(): string {
  return randomBytes(32).toString('base64url')
}
