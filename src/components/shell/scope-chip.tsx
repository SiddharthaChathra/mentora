'use client'

import { useRouter } from 'next/navigation'
import { Filter, X } from 'lucide-react'

/** Visible confirmation that the global semester filter is applied, with a one-click reset. */
export function ScopeChip({ scope, label }: { scope: number | null; label?: string }) {
  const router = useRouter()
  if (!scope) return null
  return (
    <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-700" role="status">
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-50 px-3 font-semibold text-primary-700">
        <Filter className="size-3.5" /> Semester {scope}
      </span>
      <span>{label ?? `Showing students currently in semester ${scope}.`}</span>
      <button
        type="button"
        onClick={() => {
          document.cookie = 'm_sem=; path=/; max-age=31536000; samesite=lax'
          router.refresh()
        }}
        className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
      >
        <X className="size-3.5" /> Show all semesters
      </button>
    </p>
  )
}
