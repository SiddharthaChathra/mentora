'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, BadgeCheck, Check, X } from 'lucide-react'
import { fmt2, fmtRelative } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox, Textarea } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { Pill, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { reviewChangeRequest, verifySemesters } from '@/server/actions/academics'

export type PendingSemester = {
  id: string
  studentId: string
  studentName: string | null
  usn: string | null
  semesterNo: number
  academicYear: string
  subjects: number
  sgpa: number | null
  sgpaNote: string | null
  submittedAt: string | null
}

export type PendingCorrection = {
  id: string
  studentId: string
  studentName: string | null
  semesterNo: number
  target: string
  reason: string
  current: Record<string, unknown>
  proposed: Record<string, unknown>
  createdAt: string
  status: string
  reviewNote: string | null
}

const LABEL: Record<string, string> = {
  mse_marks: 'MSE marks',
  mse_max: 'MSE max',
  see_marks: 'SEE marks',
  see_max: 'SEE max',
  grade: 'Grade',
  grade_points: 'Grade points',
  result: 'Result',
  credits_earned: 'Credits earned',
  ia: 'Internal assessments',
  academic_year: 'Academic year',
  manual_sgpa: 'SGPA (entered)',
  manual_cgpa: 'CGPA (entered)',
}
const show = (v: unknown) => (v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

export function VerificationQueue({ semesters, hrefBase }: { semesters: PendingSemester[]; hrefBase: string }) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)
  if (!semesters.length) return <EmptyState illustration="success" title="Nothing to verify" description="Submitted semesters from your mentees will appear here." />
  const all = selected.length === semesters.length
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 shadow-1 ring-1 ring-line/70">
        <Checkbox id="select-all" label={all ? 'Clear selection' : `Select all (${semesters.length})`} checked={all} onCheckedChange={(v) => setSelected(v ? semesters.map((s) => s.id) : [])} />
        <Button
          disabled={!selected.length}
          loading={busy}
          onClick={async () => {
            setBusy(true)
            const res = await verifySemesters(selected)
            setBusy(false)
            if (res.ok) {
              toast.success(`${res.data.verified} semester${res.data.verified === 1 ? '' : 's'} verified`)
              setSelected([])
              router.refresh()
            } else toast.error(res.error.message)
          }}
        >
          <BadgeCheck /> Verify {selected.length || ''} selected
        </Button>
      </div>
      <ul className="space-y-2">
        {semesters.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-4 shadow-2">
            <Checkbox
              id={`v-${s.id}`}
              label={<span className="sr-only">Select {s.studentName} semester {s.semesterNo}</span>}
              checked={selected.includes(s.id)}
              onCheckedChange={(v) => setSelected((cur) => (v ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
            />
            <Avatar userId={s.studentId} name={s.studentName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink-900">
                {s.studentName} <span className="num text-sm font-normal text-ink-500">{s.usn}</span>
              </p>
              <p className="text-sm text-ink-500">
                Semester {s.semesterNo} · {s.academicYear} · {s.subjects} subjects · submitted {fmtRelative(s.submittedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-500">SGPA</p>
              <p className="num-display text-lg font-semibold text-ink-900">{s.sgpa != null ? fmt2(s.sgpa) : '—'}</p>
            </div>
            <Link href={`${hrefBase}/${s.studentId}?tab=academics`} className="inline-flex h-9 items-center gap-1 rounded-[10px] px-3 text-sm font-medium text-primary-600 hover:bg-primary-50">
              Review marks <ArrowRight className="size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CorrectionQueue({ items, hrefBase }: { items: PendingCorrection[]; hrefBase: string }) {
  const [open, setOpen] = React.useState<PendingCorrection | null>(null)
  if (!items.length) return <EmptyState illustration="no-feedback" title="No correction requests" description="When a student asks to correct a verified record, it will appear here with a side-by-side comparison." />
  return (
    <>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setOpen(c)} className="flex w-full flex-wrap items-center gap-4 rounded-xl bg-surface p-4 text-left shadow-2 hover:shadow-3">
              <Avatar userId={c.studentId} name={c.studentName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">
                  {c.studentName} · <span className="text-ink-700">Semester {c.semesterNo}</span>
                </p>
                <p className="truncate text-sm text-ink-500">
                  {c.target} — “{c.reason}”
                </p>
              </div>
              <StatusPill status={c.status === 'PENDING' ? 'CHANGE_REQUESTED' : c.status} />
              <span className="text-xs text-ink-500">{fmtRelative(c.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && <DiffDialog c={open} onClose={() => setOpen(null)} hrefBase={hrefBase} />}
    </>
  )
}

function DiffDialog({ c, onClose, hrefBase }: { c: PendingCorrection; onClose: () => void; hrefBase: string }) {
  const router = useRouter()
  const [note, setNote] = React.useState('')
  const [busy, setBusy] = React.useState<null | 'a' | 'r'>(null)
  const keys = Object.keys(c.proposed)
  const decide = async (approve: boolean) => {
    setBusy(approve ? 'a' : 'r')
    const res = await reviewChangeRequest(c.id, approve, note)
    setBusy(null)
    if (res.ok) {
      toast.success(approve ? 'Approved and applied — SGPA recalculated' : 'Request rejected')
      onClose()
      router.refresh()
    } else toast.error(res.error.message)
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Review correction"
        description={`${c.studentName} · Semester ${c.semesterNo} · ${c.target}`}
        size="lg"
        footer={
          c.status === 'PENDING' ? (
            <>
              <Button variant="secondary" onClick={() => decide(false)} loading={busy === 'r'}>
                <X /> Reject
              </Button>
              <Button onClick={() => decide(true)} loading={busy === 'a'}>
                <Check /> Approve & apply
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <blockquote className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-700">“{c.reason}”</blockquote>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">Current versus proposed values</caption>
              <thead className="bg-surface-muted text-left text-xs text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Field</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Current</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-ink-900">{LABEL[k] ?? k}</th>
                    <td className="num px-4 py-3 text-danger-700 line-through decoration-danger-500/50">{show(c.current[k])}</td>
                    <td className="num px-4 py-3 font-semibold text-success-700">{show(c.proposed[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.status === 'PENDING' ? (
            <Textarea id="review-note" label="Note to the student (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          ) : (
            c.reviewNote && <p className="text-sm text-ink-700">Reviewer note: {c.reviewNote}</p>
          )}
          <p className="text-xs text-ink-500">
            Approval is applied in a single database transaction and recorded in the audit history.{' '}
            <Link className="text-primary-600 hover:underline" href={`${hrefBase}/${c.studentId}?tab=academics`}>
              Open the student’s records
            </Link>
          </p>
          <Pill tone="outline">Request {c.id.slice(0, 8)}</Pill>
        </div>
      </DialogContent>
    </Dialog>
  )
}
