'use client'

import { useSearchParams } from 'next/navigation'
import { LayoutList, Rows3 } from 'lucide-react'
import { Segmented, useSetParams } from '@/components/ui/navigation'

/** Grouped-by-branch sections ↔ one flat table with a Branch column (URL-synced). */
export function ViewToggle() {
  const sp = useSearchParams()
  const set = useSetParams()
  const value = sp.get('view') === 'table' ? 'table' : 'grouped'
  return (
    <Segmented
      label="Layout"
      value={value}
      onChange={(v) => set({ view: v === 'grouped' ? null : v })}
      options={[
        { value: 'grouped', label: 'By branch', icon: Rows3 },
        { value: 'table', label: 'One table', icon: LayoutList },
      ]}
    />
  )
}
