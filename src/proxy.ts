import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from './lib/auth-constants'

const PROTECTED = [
  '/dashboard',
  '/profile',
  '/settings',
  '/timeline',
  '/new-entry',
  '/future-self',
  '/result',
  '/admin',
]

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return atob(padded)
}

async function verifyJwtEdge(token: string, secret: string) {
  try {
    if (!secret) return null
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) return null

    const header = JSON.parse(decodeBase64Url(headerB64))
    if (header.alg !== 'HS256') return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const signature = Uint8Array.from(decodeBase64Url(signatureB64), (char) => char.charCodeAt(0))
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(`${headerB64}.${payloadB64}`)
    )
    if (!valid) return null

    const payload = JSON.parse(decodeBase64Url(payloadB64)) as {
      userId?: string
      sessionId?: string
      exp?: number
      iss?: string
      aud?: string
    }
    if (!payload.userId || !payload.sessionId) return null
    if (payload.iss !== 'viyaan-future' || payload.aud !== 'viyaan-future-web') return null
    if (!payload.exp || Date.now() >= payload.exp * 1000) return null
    return payload
  } catch {
    return null
  }
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path === '/register') return NextResponse.redirect(new URL('/signup', req.url))

  const isProtected = PROTECTED.some((route) => path === route || path.startsWith(`${route}/`))
  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifyJwtEdge(token, process.env.JWT_SECRET || '') : null
  if (session) return NextResponse.next()

  const destination = new URL('/login', req.url)
  destination.searchParams.set('next', path)
  const response = NextResponse.redirect(destination)
  if (token) response.cookies.delete(SESSION_COOKIE)
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|viyaan-logo.png).*)'],
}
