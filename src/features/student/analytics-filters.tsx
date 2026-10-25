'use client'

import { useSearchParams } from 'next/navigation'
import { FilterSelect } from '@/components/ui/field'
import { useSetParams } from '@/components/ui/navigation'

export function AnalyticsFilters({
  semesters,
  selectedSemester,
  years,
  subjects,
}: {
  semesters: number[]
  selectedSemester: number
  years: string[]
  subjects: { id: string; label: string }[]
}) {
  const sp = useSearchParams()
  const set = useSetParams()
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Analytics filters">
      <FilterSelect
        label="Semester"
        value={String(selectedSemester)}
        onChange={(e) => set({ sem: e.target.value }, { keepPage: true })}
        options={semesters.map((s) => ({ value: String(s), label: `Semester ${s}` }))}
      />
      <FilterSelect
        label="Academic year"
        value={sp.get('year') ?? 'all'}
        onChange={(e) => set({ year: e.target.value, sem: null }, { keepPage: true })}
        options={[{ value: 'all', label: 'All years' }, ...years.map((y) => ({ value: y, label: y }))]}
      />
      <FilterSelect
        label="Subject"
        className="max-w-full sm:max-w-72"
        value={sp.get('subject') ?? 'all'}
        onChange={(e) => set({ subject: e.target.value }, { keepPage: true })}
        options={[{ value: 'all', label: 'All subjects' }, ...subjects.map((s) => ({ value: s.id, label: s.label }))]}
      />
    </div>
  )
}
