'use client'

import * as React from 'react'
import { Bookmark, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/lib/hooks'

export type SavedView = { name: string; query: string }

/** UX2-11 saved views, kept per browser (filters are not sensitive and never leave the device). */
export function useSavedViews(storageKey: string) {
  const [raw, setRaw] = useLocalStorage(storageKey, '[]')
  const views = React.useMemo<SavedView[]>(() => {
    try {
      const v = JSON.parse(raw)
      return Array.isArray(v) ? v.filter((x) => typeof x?.name === 'string' && typeof x?.query === 'string') : []
    } catch {
      return []
    }
  }, [raw])
  const save = (name: string, query: string) => {
    if (views.some((v) => v.query === query)) return toast.info('This view is already saved')
    setRaw(JSON.stringify([...views, { name: name || 'Saved view', query }].slice(-8)))
    toast.success('View saved', { description: name })
  }
  const remove = (query: string) => {
    const removed = views.find((v) => v.query === query)
    setRaw(JSON.stringify(views.filter((v) => v.query !== query)))
    if (removed)
      toast.success('View removed', {
        action: { label: 'Undo', onClick: () => setRaw(JSON.stringify([...views])) },
      })
  }
  return { views, save, remove }
}

export function SaveViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50">
      <Bookmark className="size-4" /> Save view
    </button>
  )
}

export function SavedViewChips({ views, active, onApply, onRemove }: { views: SavedView[]; active: string; onApply: (query: string) => void; onRemove: (query: string) => void }) {
  if (!views.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Saved views">
      <span className="eyebrow">Saved views</span>
      {views.map((v) => {
        const on = v.query === active
        return (
          <span key={v.query} className={cn('inline-flex h-8 items-center rounded-full text-sm font-semibold', on ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700')}>
            <button type="button" aria-pressed={on} onClick={() => onApply(v.query)} className="h-full rounded-l-full pr-1 pl-3.5">
              {v.name}
            </button>
            <button type="button" aria-label={`Remove saved view ${v.name}`} onClick={() => onRemove(v.query)} className={cn('mr-1 grid size-6 place-items-center rounded-full', on ? 'hover:bg-white/20' : 'hover:bg-primary-100')}>
              <X className="size-3.5" />
            </button>
          </span>
        )
      })}
    </div>
  )
}
