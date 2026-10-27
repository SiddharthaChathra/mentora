'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftRight, ArrowRight, Check, Search, X } from 'lucide-react'
import { fmtDate, fmtRelative } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { Pill, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { commandSearch, type SearchHit } from '@/server/actions/shell'
import { decideTransfer, moveStudent } from '@/server/actions/principal'

export type TransferRow = {
  id: string
  studentId: string
  studentName: string | null
  usn: string | null
  from: string
  to: string
  reason: string
  status: string
  requestedBy: string | null
  createdAt: string
  decidedAt: string | null
  note: string | null
}

export function TransferBoard({ pending, history, branches }: { pending: TransferRow[]; history: TransferRow[]; branches: { id: string; code: string; name: string }[] }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [decide, setDecide] = React.useState<{ row: TransferRow; approve: boolean } | null>(null)
  const [note, setNote] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [moveOpen, setMoveOpen] = React.useState(sp.get('move') === '1')

  const run = async () => {
    if (!decide) return
    setBusy(true)
    const res = await decideTransfer(decide.row.id, decide.approve, note)
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    toast.success(decide.approve ? `${decide.row.studentName ?? 'Student'} moved to ${decide.row.to}` : 'Transfer rejected')
    setDecide(null)
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setMoveOpen(true)}>
          <ArrowLeftRight /> Move a student
        </Button>
      </div>
      <section aria-label="Waiting for a decision" className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Waiting for your decision</h2>
        {pending.length === 0 ? (
          <div className="rounded-[24px] bg-surface shadow-2">
            <EmptyState compact illustration="success" title="No transfer requests" description="HODs request transfers from a student’s profile." />
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 rounded-[24px] bg-surface p-5 shadow-2 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/principal/students/${t.studentId}`} className="font-semibold text-ink-900 hover:text-primary-700">
                    {t.studentName ?? 'Student'}
                  </Link>
                  <span className="num ml-2 text-xs text-ink-500">{t.usn}</span>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-700">
                    <Pill tone="neutral">{t.from}</Pill> <ArrowRight className="size-3.5" /> <Pill tone="brand">{t.to}</Pill>
                    <span className="text-ink-500">· requested {fmtRelative(t.createdAt)}{t.requestedBy ? ` by ${t.requestedBy}` : ''}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-700">“{t.reason}”</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => (setNote(''), setDecide({ row: t, approve: false }))}>
                    <X /> Reject
                  </Button>
                  <Button onClick={() => (setNote(''), setDecide({ row: t, approve: true }))}>
                    <Check /> Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="History">
        <h2 className="mb-3 text-lg font-semibold text-ink-900">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-500">No decided transfers yet.</p>
        ) : (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] bg-surface shadow-2">
            {history.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <span className="font-medium text-ink-900">{t.studentName ?? 'Student'}</span>
                <span className="flex items-center gap-1.5">
                  <Pill tone="neutral">{t.from}</Pill> <ArrowRight className="size-3.5" /> <Pill tone="neutral">{t.to}</Pill>
                </span>
                <StatusPill status={t.status} />
                <span className="ml-auto text-xs text-ink-500">{t.decidedAt ? fmtDate(t.decidedAt, 'd MMM yyyy') : ''}</span>
                {t.note && <p className="w-full text-xs text-ink-500">{t.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!decide} onOpenChange={(o) => !o && setDecide(null)}>
        <DialogContent
          title={decide?.approve ? `Move ${decide.row.studentName ?? 'this student'} to ${decide.row.to}?` : 'Reject this transfer?'}
          description={
            decide?.approve
              ? 'Their records move with them and become visible to the new branch. Their current mentor assignment ends now; the old HOD and mentor lose access immediately.'
              : 'The requesting HOD is notified.'
          }
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDecide(null)}>
                Cancel
              </Button>
              <Button loading={busy} variant={decide?.approve ? 'primary' : 'destructive'} onClick={run}>
                {decide?.approve ? 'Approve and move' : 'Reject'}
              </Button>
            </>
          }
        >
          <Textarea id="tr-note" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </DialogContent>
      </Dialog>

      <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} branches={branches} onDone={() => router.refresh()} />
    </>
  )
}

function MoveDialog({ open, onOpenChange, branches, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; branches: { id: string; code: string; name: string }[]; onDone: () => void }) {
  const [term, setTerm] = React.useState('')
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [student, setStudent] = React.useState<SearchHit | null>(null)
  const [to, setTo] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (term.trim().length < 2) return
    const t = setTimeout(async () => {
      const res = await commandSearch(term)
      if (res.ok) setHits(res.data.filter((h) => h.href.startsWith('/principal/students/')))
    }, 250)
    return () => clearTimeout(t)
  }, [term])
  const submit = async () => {
    if (!student) return
    setBusy(true)
    const res = await moveStudent({ student_id: student.id, to_department_id: to, reason })
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    toast.success(`${student.name} moved`)
    onOpenChange(false)
    setStudent(null)
    setTerm('')
    setReason('')
    onDone()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Move a student to another branch"
        description="Ends their current mentor assignment in the same step. Their academic history moves with them. Everything is audited."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!student || !to || reason.trim().length < 3} onClick={submit}>
              Move student
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {student ? (
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-muted px-3 py-2.5 text-sm">
              <span>
                <span className="font-semibold text-ink-900">{student.name}</span> <span className="text-ink-500">{student.sub}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setStudent(null)}>
                Change
              </Button>
            </div>
          ) : (
            <>
              <Input id="mv-search" label="Student" placeholder="Name or USN" value={term} onChange={(e) => setTerm(e.target.value)} trailing={<Search className="size-4" />} />
              {hits.length > 0 && (
                <ul className="max-h-48 overflow-y-auto rounded-[14px] border border-line">
                  {hits.map((h) => (
                    <li key={h.id}>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted" onClick={() => (setStudent(h), setHits([]))}>
                        <span className="font-medium text-ink-900">{h.name}</span> <span className="text-ink-500">{h.sub}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <Select id="mv-to" label="Move to" value={to} onChange={(e) => setTo(e.target.value)} options={branches.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }))} />
          <Textarea id="mv-reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} required />
        </div>
      </DialogContent>
    </Dialog>
  )
}
