'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Crown, UserPlus, UserX } from 'lucide-react'
import { fmtDate } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/overlay'
import { Pill } from '@/components/ui/primitives'
import { appointHod, endHodAppointment } from '@/server/actions/principal'

export type HodBranch = {
  id: string
  code: string
  name: string
  head: { id: string; name: string | null; since: string; hasAvatar: boolean; suspended: boolean } | null
  candidates: { id: string; name: string | null; email: string; role: string }[]
  history: { id: string; name: string | null; startedAt: string; endedAt: string | null; reason: string | null; endReason: string | null }[]
}

/** Appoint / change / end HOD appointments (MB-03). One active HOD per branch, one branch per HOD; all audited. */
export function HodManager({ branches, focus }: { branches: HodBranch[]; focus?: string }) {
  const router = useRouter()
  const [appoint, setAppoint] = React.useState<HodBranch | null>(() => branches.find((b) => b.code === focus && !b.head) ?? null)
  const [end, setEnd] = React.useState<HodBranch | null>(null)
  const [pick, setPick] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const doAppoint = async () => {
    if (!appoint || !pick) return
    setBusy(true)
    const res = await appointHod(appoint.id, pick, reason)
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    toast.success(`New HOD appointed for ${appoint.code}`)
    setAppoint(null)
    router.refresh()
  }
  const doEnd = async () => {
    if (!end) return
    setBusy(true)
    const res = await endHodAppointment(end.id, reason)
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    toast.success(`${end.code} now has no HOD`)
    setEnd(null)
    router.refresh()
  }

  return (
    <>
      <ul className="grid gap-4 lg:grid-cols-2">
        {branches.map((b) => (
          <li key={b.id} id={`hod-${b.code}`} className="rounded-[24px] bg-surface p-5 shadow-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Pill tone="brand">{b.code}</Pill>
                <p className="mt-2 font-semibold text-ink-900">{b.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => (setPick(''), setReason(''), setAppoint(b))}>
                  <Crown /> {b.head ? 'Change HOD' : 'Appoint HOD'}
                </Button>
                {b.head && (
                  <Button size="sm" variant="secondary" onClick={() => (setReason(''), setEnd(b))}>
                    <UserX /> End
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-surface-muted p-3">
              {b.head ? (
                <>
                  <Avatar userId={b.head.id} name={b.head.name} hasImage={b.head.hasAvatar} size="md" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink-900">
                      <span className="truncate">{b.head.name ?? 'HOD'}</span> {b.head.suspended && <Pill tone="danger">Account suspended — appoint someone else</Pill>}
                    </p>
                    <p className="text-xs text-ink-500">HOD since {fmtDate(b.head.since, 'd MMM yyyy')}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-700">
                  <Pill tone="accent">No HOD</Pill> <span className="ml-1">You cover this branch until one is appointed.</span>
                </p>
              )}
            </div>
            {b.history.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-primary-700">Appointment history ({b.history.length})</summary>
                <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
                  {b.history.map((h) => (
                    <li key={h.id} className="text-sm">
                      <p className="font-medium text-ink-900">{h.name ?? 'HOD'}</p>
                      <p className="text-xs text-ink-500">
                        {fmtDate(h.startedAt, 'd MMM yyyy')} → {h.endedAt ? fmtDate(h.endedAt, 'd MMM yyyy') : 'now'}
                        {h.endReason ? ` · ${h.endReason}` : h.reason ? ` · ${h.reason}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={!!appoint} onOpenChange={(o) => !o && setAppoint(null)}>
        <DialogContent
          title={appoint?.head ? `Change the ${appoint.code} HOD` : `Appoint an HOD for ${appoint?.code}`}
          description={appoint?.head ? `${appoint.head.name ?? 'The current HOD'}’s appointment ends and they lose HOD access immediately. Both people are notified.` : 'They get HOD access to this branch immediately. A mentor’s current mentees are unassigned so the new HOD can reassign them.'}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setAppoint(null)}>
                Cancel
              </Button>
              <Button loading={busy} disabled={!pick} onClick={doAppoint}>
                Appoint
              </Button>
            </>
          }
        >
          {appoint && (
            <div className="space-y-3">
              {appoint.candidates.length ? (
                <Select
                  id="hod-pick"
                  label="Faculty member of this branch"
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  options={appoint.candidates.map((c) => ({ value: c.id, label: `${c.name ?? c.email}${c.role === 'HOD' ? ' (former HOD)' : ''}` }))}
                />
              ) : (
                <p className="text-sm text-ink-700">This branch has no faculty yet.</p>
              )}
              <Link href={`/principal/users?invite=1&role=HOD&branch=${appoint.code}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                <UserPlus /> Invite someone new as HOD
              </Link>
              <Textarea id="hod-reason" label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!end}
        onOpenChange={(o) => !o && setEnd(null)}
        loading={busy}
        destructive
        title={`End the ${end?.code} HOD appointment?`}
        description="They lose HOD access on their next request and see an “access ended” page. The branch shows “No HOD” until you appoint someone. If they go back to mentoring, change their role to Mentor on the Users page."
        confirmLabel="End appointment"
        onConfirm={doEnd}
      />
    </>
  )
}
