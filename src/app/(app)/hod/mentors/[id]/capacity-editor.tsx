'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { setMentorCapacity } from '@/server/actions/admin'

export function CapacityEditor({ mentorId, capacity }: { mentorId: string; capacity: number }) {
  const router = useRouter()
  const [v, setV] = React.useState(String(capacity))
  const [busy, setBusy] = React.useState(false)
  return (
    <div className="flex items-start gap-2">
      <Input id="capacity" label="Mentee capacity" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} hint="Used for workload warnings" />
      <Button
        variant="secondary"
        className="mt-1.5"
        loading={busy}
        disabled={v === String(capacity)}
        onClick={async () => {
          setBusy(true)
          const res = await setMentorCapacity(mentorId, Number(v))
          setBusy(false)
          if (res.ok) {
            toast.success('Capacity updated')
            router.refresh()
          } else toast.error(res.error.message)
        }}
      >
        Save
      </Button>
    </div>
  )
}
