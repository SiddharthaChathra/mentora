'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { createSemester } from '@/server/actions/academics'

export function AddSemesterButton({
  existing,
  maxSemester,
  admissionYear,
  hrefBase,
  label = 'Add semester',
  variant = 'primary',
}: {
  existing: number[]
  maxSemester: number
  admissionYear: number | null
  hrefBase?: string
  label?: string
  variant?: 'primary' | 'secondary'
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const available = Array.from({ length: Math.max(1, maxSemester) }, (_, i) => i + 1).filter((n) => !existing.includes(n))
  const [open, setOpen] = React.useState(sp.get('new') === '1' && available.length > 0)
  const [no, setNo] = React.useState(String(available.at(-1) ?? ''))
  const yearFor = (n: number) => {
    if (!admissionYear) return ''
    const y = admissionYear + Math.floor((n - 1) / 2)
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
  }
  const [year, setYear] = React.useState(yearFor(Number(no)))
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)

  if (available.length === 0) return null
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Add a semester"
          description="Start with the semester number and academic year. You’ll add subjects next."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  const res = await createSemester({ semester_no: no, academic_year: year })
                  setBusy(false)
                  if (!res.ok) {
                    setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
                    toast.error(res.error.message)
                    return
                  }
                  setOpen(false)
                  toast.success(`Semester ${res.data.semester_no} created`)
                  if (hrefBase) router.push(`${hrefBase}/${res.data.semester_no}`)
                  else router.refresh()
                }}
              >
                Create semester
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Select
              id="sem-no"
              label="Semester"
              value={no}
              onChange={(e) => {
                setNo(e.target.value)
                setYear(yearFor(Number(e.target.value)))
              }}
              options={available.map((n) => ({ value: String(n), label: `Semester ${n}` }))}
              error={errors.semester_no}
              required
            />
            <Input id="sem-year" label="Academic year" placeholder="2024-25" value={year} onChange={(e) => setYear(e.target.value)} error={errors.academic_year} hint="Format: 2024-25" required />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
