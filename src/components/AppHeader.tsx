'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/timeline', label: 'Timeline', icon: TimelineIcon },
  { href: '/new-entry', label: 'Reflect', icon: PenIcon, primary: true },
  { href: '/profile', label: 'Profile', icon: PersonIcon },
  { href: '/settings', label: 'Settings', icon: GearIcon },
]

export default function AppHeader() {
  const pathname = usePathname()
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/dashboard" className="brand-lockup app-brand">
            <Image src="/viyaan-logo.png" alt="" width={42} height={42} priority className="brand-mark" />
            <span><strong>Viyaan Future</strong><small>A conversation with who you become</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map(({ href, label, icon: Icon, primary }) => {
              const active = pathname === href || (href === '/timeline' && pathname === '/result')
              return <Link key={href} href={href} className={`${primary ? 'nav-new' : 'nav-link'} ${active ? 'is-active' : ''}`}><Icon />{label}</Link>
            })}
          </nav>
          <ThemeToggle compact />
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Primary navigation">
        {navItems.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || (href === '/timeline' && pathname === '/result')
          return <Link key={href} href={href} className={`${primary ? 'mobile-nav-primary' : ''} ${active ? 'is-active' : ''}`}><Icon /><span>{label}</span></Link>
        })}
      </nav>
    </>
  )
}

function HomeIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M3.5 10.5L12 3l8.5 7.5v9a1.5 1.5 0 01-1.5 1.5h-5v-6h-4v6H5a1.5 1.5 0 01-1.5-1.5v-9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg> }
function TimelineIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 4h13M7 12h13M7 20h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="3.5" cy="4" r="1.25" fill="currentColor"/><circle cx="3.5" cy="12" r="1.25" fill="currentColor"/><circle cx="3.5" cy="20" r="1.25" fill="currentColor"/></svg> }
function PenIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 20l4.1-1 11-11a2.1 2.1 0 00-3-3l-11 11L4 20zM14.8 6.3l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function PersonIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M4.5 21a7.5 7.5 0 0115 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> }
function GearIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M19 13.5v-3l-2-.7a7 7 0 00-.8-1.8l.9-2-2.1-2.1-2 .9a7 7 0 00-1.8-.8l-.7-2h-3l-.7 2a7 7 0 00-1.8.8l-2-.9L.9 6l.9 2a7 7 0 00-.8 1.8l-2 .7v3l2 .7a7 7 0 00.8 1.8l-.9 2L3 20.1l2-.9a7 7 0 001.8.8l.7 2h3l.7-2a7 7 0 001.8-.8l2 .9 2.1-2.1-.9-2a7 7 0 00.8-1.8l2-.7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" transform="translate(2) scale(.83 1)"/></svg> }
