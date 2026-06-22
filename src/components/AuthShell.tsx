import Image from 'next/image'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-frame animate-in">
        <section className="auth-story">
          <Link href="/" className="brand-lockup">
            <Image src="/viyaan-logo.png" alt="" width={48} height={48} priority className="brand-mark" />
            <span>
              <strong>Viyaan Future</strong>
              <small>Private future-self continuity</small>
            </span>
          </Link>
          <div className="auth-story-copy">
            <p className="eyebrow">A private timeline</p>
            <h2>A conversation with the person you become.</h2>
            <p>Write honestly. Future you remembers. The relationship gets more specific with every return.</p>
          </div>
          <p className="auth-privacy">Your reflections stay connected to your private account.</p>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-top">
            <Link href="/" className="brand-lockup auth-mobile-brand">
              <Image src="/viyaan-logo.png" alt="" width={44} height={44} priority className="brand-mark" />
              <span><strong>Viyaan Future</strong></span>
            </Link>
            <ThemeToggle compact />
          </div>
          <div className="auth-form-wrap">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="auth-description">{description}</p>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
