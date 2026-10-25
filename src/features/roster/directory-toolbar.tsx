'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { FilterSelect } from '@/components/ui/field'
import { SearchInput, useSetParams } from '@/components/ui/navigation'
import { Button } from '@/components/ui/button'
import { SavedViewChips, SaveViewButton, useSavedViews } from './saved-views'

type Opt = { value: string; label: string }

/** URL-driven filters + saved view chips (UX2-11, saved per browser). */
export function DirectoryToolbar({
  filters,
  storageKey,
  searchPlaceholder,
}: {
  filters: { param: string; label: string; options: Opt[] }[]
  storageKey: string
  searchPlaceholder?: string
}) {
  const sp = useSearchParams()
  const set = useSetParams()
  const router = useRouter()
  const pathname = usePathname()
  const saved = useSavedViews(storageKey)
  const current = new URLSearchParams(sp.toString())
  current.delete('page')
  const active = current.toString()

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {searchPlaceholder && <SearchInput placeholder={searchPlaceholder} className="w-full lg:w-80" />}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <FilterSelect key={f.param} label={f.label} value={sp.get(f.param) ?? 'all'} onChange={(e) => set({ [f.param]: e.target.value })} options={f.options} />
          ))}
          {active && (
            <>
              <SaveViewButton
                onClick={() =>
                  saved.save(
                    filters
                      .filter((f) => sp.get(f.param))
                      .map((f) => f.options.find((o) => o.value === sp.get(f.param))?.label)
                      .concat(sp.get('q') ? [`“${sp.get('q')}”`] : [])
                      .filter(Boolean)
                      .join(' · '),
                    active,
                  )
                }
              />
              <Button variant="ghost" size="sm" className="h-10" onClick={() => router.replace(pathname)}>
                <X /> Clear
              </Button>
            </>
          )}
        </div>
      </div>
      <SavedViewChips views={saved.views} active={active} onApply={(q) => router.replace(q === active ? pathname : `${pathname}?${q}`)} onRemove={saved.remove} />
    </div>
  )
}
