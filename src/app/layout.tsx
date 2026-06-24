import type { Metadata } from 'next'
import Script from 'next/script'
import AnalyticsTracker from '../components/AnalyticsTracker'
import { GA_MEASUREMENT_ID } from '../lib/analytics'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Viyaan Future',
    template: '%s · Viyaan Future',
  },
  description: 'Write honestly and receive continuity from your future self.',
  applicationName: 'Viyaan Future',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/viyaan-logo.png',
    apple: '/viyaan-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `(function(){try{var t=localStorage.getItem('viyaan-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme='light'}})()`
  const isProd = process.env.NODE_ENV === 'production'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f6f8" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#090b10" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="relative min-h-screen overflow-x-hidden antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <AnalyticsTracker />
        {children}
        {isProd && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: false
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
