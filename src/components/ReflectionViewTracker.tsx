'use client'

import { useEffect } from 'react'
import * as ga from '../lib/analytics'

/**
 * Fires the `reflection_viewed` GA4 event once when the reflection detail
 * page mounts in the browser. This is a zero-UI component — it renders nothing.
 *
 * It is a separate client component so the parent page can remain a Server
 * Component (required for direct Prisma access and session auth).
 */
export default function ReflectionViewTracker({ reflectionId }: { reflectionId: string }) {
  useEffect(() => {
    ga.reflectionViewed({ reflection_id: reflectionId })
  }, [reflectionId])

  return null
}
