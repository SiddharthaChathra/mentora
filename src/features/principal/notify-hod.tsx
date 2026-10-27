'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { notifyHod } from '@/server/actions/principal'

/** Principal → branch HOD nudge about flagged students. Mentor follow-ups stay the HOD's call. */
export function NotifyHodButton({ departmentId, code, count, hasHod }: { departmentId: string; code: string; count: number; hasHod: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState(`Please review the ${count} flagged student${count === 1 ? '' : 's'} in ${code} and plan follow-ups with their mentors.`)
  const [busy, setBusy] = React.useState(false)
  return (
    <>
      <Button variant="secondary" size="sm" disabled={!hasHod || !count} onClick={() => setOpen(true)} title={hasHod ? undefined : 'This branch has no HOD'}>
        <BellRing /> Notify HOD
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Notify the ${code} HOD`}
          description="They get an in-app notification linking to their interventions page."
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
                  const res = await notifyHod({ department_id: departmentId, note, count })
                  setBusy(false)
                  if (!res.ok) return toast.error(res.error.message)
                  toast.success(res.data.notified ? `${code} HOD notified` : `${code} has no HOD to notify`)
                  setOpen(false)
                }}
              >
                Send
              </Button>
            </>
          }
        >
          <Textarea id="notify-note" label="Message" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
        </DialogContent>
      </Dialog>
    </>
  )
}
