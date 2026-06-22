import { NextRequest, NextResponse } from 'next/server'
import { getSession, SESSION_COOKIE } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import {
  checkRateLimit,
  cleanOptionalString,
  getClientIp,
  rateLimitResponse,
  sanitizeText,
} from '../../../lib/server-guards'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(`profile:get:${session.userId}:${getClientIp(req)}`, 120, 60 * 1000)
    if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        email: true,
        name: true,
        lifeVision: true,
        currentMission: true,
        topGoal: true,
        topFear: true,
        values: true,
        whoIWantToBecome: true,
        createdAt: true,
      },
    })

    if (!user) {
      // JWT valid but user row gone — stale session. Force re-login.
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

    return NextResponse.json({ success: true, data: user })
  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rate = checkRateLimit(`profile:post:${session.userId}:${getClientIp(req)}`, 30, 60 * 60 * 1000)
    if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds)

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 })
    }

    const { name, lifeVision, currentMission, topGoal, topFear, values, whoIWantToBecome } = body

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name !== undefined ? sanitizeText(name, 120) || session.name : undefined,
        lifeVision: lifeVision !== undefined ? cleanOptionalString(lifeVision, 1600) : undefined,
        currentMission: currentMission !== undefined ? cleanOptionalString(currentMission, 800) : undefined,
        topGoal: topGoal !== undefined ? cleanOptionalString(topGoal, 500) : undefined,
        topFear: topFear !== undefined ? cleanOptionalString(topFear, 500) : undefined,
        values: values !== undefined ? cleanOptionalString(values, 800) : undefined,
        whoIWantToBecome: whoIWantToBecome !== undefined ? cleanOptionalString(whoIWantToBecome, 1600) : undefined,
      },
    })

    return NextResponse.json({ success: true, data: { name: updatedUser.name } })
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
