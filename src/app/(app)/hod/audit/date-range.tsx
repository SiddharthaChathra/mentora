'use client'

import { useSearchParams } from 'next/navigation'
import { useSetParams } from '@/components/ui/navigation'

export function AuditDateRange() {
  const sp = useSearchParams()
  const set = useSetParams()
  const cls = 'h-10 rounded-full border border-line bg-surface px-4 text-sm shadow-1'
  return (
    <div className="-mt-2 mb-5 flex flex-wrap items-center gap-2 text-sm text-ink-700">
      <label className="flex items-center gap-2">
        From <input type="date" className={cls} value={sp.get('from') ?? ''} onChange={(e) => set({ from: e.target.value })} />
      </label>
      <label className="flex items-center gap-2">
        to <input type="date" className={cls} value={sp.get('to') ?? ''} onChange={(e) => set({ to: e.target.value })} />
      </label>
    </div>
  )
}
