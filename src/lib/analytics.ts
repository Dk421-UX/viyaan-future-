export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-D8X9T9E8L8'

// Log the page view with their URL
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

// Log specific events with their details
export const event = (action: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, params)
  } else {
    // Silent in production, visible in development console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Google Analytics Event] ${action}`, params)
    }
  }
}
