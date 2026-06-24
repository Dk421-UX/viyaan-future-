/**
 * Google Analytics 4 helpers for Viyaan Future.
 *
 * Measurement ID is read exclusively from NEXT_PUBLIC_GA_MEASUREMENT_ID.
 * All calls are no-ops in non-production environments and when gtag is absent.
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-CMZMV9MYVL'

const isProduction = process.env.NODE_ENV === 'production'

/** Sends a page-view hit. Called automatically by AnalyticsTracker on route change. */
export const pageview = (url: string): void => {
  if (!isProduction) return
  if (typeof window === 'undefined') return
  const g = (window as any).gtag
  if (typeof g === 'function') {
    g('config', GA_MEASUREMENT_ID, { page_path: url })
  }
}

/** Sends a custom GA4 event. Silent in development — no console noise. */
export const event = (action: string, params?: Record<string, unknown>): void => {
  if (!isProduction) return
  if (typeof window === 'undefined') return
  const g = (window as any).gtag
  if (typeof g === 'function') {
    g('event', action, params)
  }
}

// ── Typed custom event helpers ───────────────────────────────────────────────

/** Fired when a user completes the signup flow and is redirected to the dashboard. */
export const signupCompleted = (): void => event('signup_completed')

/** Fired when a user successfully authenticates and is redirected to the dashboard. */
export const loginCompleted = (): void => event('login_completed')

/** Fired when a new reflection is saved to the timeline. */
export const reflectionCreated = (params?: { persona?: string }): void =>
  event('reflection_created', params)

/** Fired when a user views a reflection detail page. */
export const reflectionViewed = (params?: { reflection_id?: string }): void =>
  event('reflection_viewed', params)
