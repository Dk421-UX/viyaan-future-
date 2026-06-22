import { NextRequest, NextResponse } from 'next/server'
import { getEnvDiagnostics, emailProviderStatus, validateServerEnv } from '../../../../lib/env'
import { prisma } from '../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // In production, require a secret header or skip in unauthorised requests.
  // The endpoint reveals no secret values — only presence/absence of env vars.
  const isInternal =
    req.headers.get('x-health-token') === process.env.HEALTH_TOKEN ||
    process.env.NODE_ENV !== 'production'

  // ── Env check ───────────────────────────────────────────────────────────
  let envOk = false
  let envError: string | null = null
  const envChecks = getEnvDiagnostics()
  try {
    validateServerEnv()
    envOk = true
  } catch (err) {
    envError = err instanceof Error ? err.message : String(err)
  }

  // ── Database check ──────────────────────────────────────────────────────
  let dbOk = false
  let dbError: string | null = null
  if (envOk) {
    try {
      await prisma.$queryRaw`SELECT 1`
      dbOk = true
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err)
    }
  }

  const healthy = envOk && dbOk
  const status = healthy ? 200 : 503

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      env: {
        ok: envOk,
        error: envError,
        ...(isInternal ? { checks: envChecks } : {}),
      },
      database: {
        ok: dbOk,
        error: isInternal ? dbError : dbOk ? null : 'connection failed',
      },
      email: {
        provider: emailProviderStatus(),
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}
