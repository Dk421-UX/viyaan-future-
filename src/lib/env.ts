/**
 * Centralised environment variable validation.
 *
 * Call `validateServerEnv()` once at the top of any API route that needs
 * server-side secrets. It throws a structured Error with a clear message so
 * the outer try/catch can return an actionable JSON 500 instead of a generic
 * crash.
 *
 * NEVER log the values of secrets — only log whether they are present.
 */

export type EnvCheck = {
  name: string
  present: boolean
  minLength?: number
  meetsLength?: boolean
}

const REQUIRED_SERVER_VARS: Array<{ name: string; minLength?: number }> = [
  { name: 'DATABASE_URL' },
  { name: 'JWT_SECRET', minLength: 32 },
]

/**
 * Returns a diagnostic snapshot of required env vars.
 * Safe to log — contains no secret values.
 */
export function getEnvDiagnostics(): EnvCheck[] {
  return REQUIRED_SERVER_VARS.map(({ name, minLength }) => {
    const value = process.env[name]
    const present = Boolean(value)
    const check: EnvCheck = { name, present }
    if (minLength !== undefined) {
      check.minLength = minLength
      check.meetsLength = present && value!.length >= minLength
    }
    return check
  })
}

/**
 * Validates that all required server-side environment variables are present
 * and meet minimum length requirements.
 *
 * Throws an Error describing the first missing/invalid variable.
 * Call this at the start of server-side API handlers.
 */
export function validateServerEnv(): void {
  for (const { name, minLength } of REQUIRED_SERVER_VARS) {
    const value = process.env[name]

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`)
    }

    if (minLength !== undefined && value.length < minLength) {
      throw new Error(
        `Environment variable ${name} must be at least ${minLength} characters long`
      )
    }
  }
}

/**
 * Checks whether the optional email delivery is configured.
 * Returns a short label indicating which provider is active.
 */
export function emailProviderStatus(): 'resend' | 'smtp' | 'none' {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
    return 'smtp'
  return 'none'
}
