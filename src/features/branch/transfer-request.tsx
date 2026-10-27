'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { requestTransfer } from '@/server/actions/principal'

/** HOD: ask the Principal to move this student to another branch (MB-10). Only the Principal can approve. */
export function TransferRequestButton({ studentId, branches, pending }: { studentId: string; branches: { id: string; code: string; name: string }[]; pending: boolean }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [to, setTo] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  if (pending) return <p className="text-sm text-ink-500">A branch transfer for this student is waiting for the Principal.</p>
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <ArrowLeftRight /> Request branch transfer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Request a branch transfer"
          description="The Principal reviews the request. If approved, the student’s records move with them and their mentor assignment ends."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                disabled={!to || reason.trim().length < 3}
                onClick={async () => {
                  setBusy(true)
                  const res = await requestTransfer({ student_id: studentId, to_department_id: to, reason })
                  setBusy(false)
                  if (!res.ok) return toast.error(res.error.message)
                  toast.success('Transfer requested — the Principal has been notified')
                  setOpen(false)
                  router.refresh()
                }}
              >
                Send request
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Select id="tr-to" label="Move to" value={to} onChange={(e) => setTo(e.target.value)} options={branches.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }))} />
            <Textarea id="tr-reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
