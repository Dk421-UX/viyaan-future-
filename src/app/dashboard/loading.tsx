import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[rgba(247,246,242,0.86)] px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-md bg-[var(--color-border)]" />
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-2 w-44 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 animate-pulse rounded-md bg-[var(--color-border)]" />
            <div className="h-10 w-20 animate-pulse rounded-md bg-[var(--color-border)]" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <div className="border-b border-[var(--color-border)] pb-6">
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="mt-4 h-10 w-72 animate-pulse rounded bg-[var(--color-border)]" />
          </div>

          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-9 w-24 animate-pulse rounded-full bg-[var(--color-border)]" />
            ))}
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="surface-panel p-5">
                <div className="h-3 w-56 animate-pulse rounded bg-[var(--color-border)]" />
                <div className="mt-4 h-4 w-full animate-pulse rounded bg-[var(--color-border)]" />
                <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-[var(--color-border)]" />
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="surface-panel p-5">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-[var(--color-border)]" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          ))}
        </aside>
      </main>
    </div>
  )
}
