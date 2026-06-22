import React from 'react'

export function parseIfJson(val: any) {
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return val
      }
    }
    return val
  }
  return val
}

export function renderAIField(field: any): React.ReactNode {
  const parsed = parseIfJson(field)
  if (!parsed) return null

  if (typeof parsed === 'string') {
    return <p className="text-sm leading-6 text-[var(--color-soft)]">{parsed}</p>
  }

  if (typeof parsed !== 'object') {
    return <p className="text-sm leading-6 text-[var(--color-soft)]">{String(parsed)}</p>
  }

  // If it is an array
  if (Array.isArray(parsed)) {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-soft)]">
        {parsed.map((item, idx) => (
          <li key={idx}>{renderAIField(item)}</li>
        ))}
      </ul>
    )
  }

  // Key-value renderer for premium structure
  const keys = Object.keys(parsed)
  return (
    <div className="space-y-2">
      {keys.map((key) => {
        const val = parsed[key]
        if (val === undefined || val === null || val === '') return null

        // Make label user-friendly (camelCase to Title Case)
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())

        return (
          <div key={key} className="text-sm">
            <span className="mr-2 block font-semibold text-[var(--color-blue)] md:inline">{label}:</span>
            <span className="leading-relaxed text-[var(--color-soft)]">
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
