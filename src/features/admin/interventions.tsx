'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BellRing, CheckCircle2 } from 'lucide-react'
import { cn, fmt2, fmtRelative } from '@/lib/utils'
import type { RiskFlag, RiskKey } from '@/lib/risk'
import { RISK_LABELS } from '@/lib/risk'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox, FilterSelect, Textarea } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { Pill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { requestFollowups } from '@/server/actions/admin'
import { resolveFollowup } from '@/server/actions/mentoring'

export type InterventionRow = {
  id: string
  name: string | null
  usn: string | null
  hasAvatar: boolean
  semester: number | null
  section: string | null
  mentorName: string | null
  cgpa: number | null
  flags: RiskFlag[]
  risk: 'none' | 'medium' | 'high'
  openFollowup: { id: string; note: string; createdAt: string } | null
}

/** HOD: select students and ask their mentors to follow up. Principal (readOnly): observe; the page adds "Notify HOD". */
export function InterventionsBoard({ rows, readOnly = false, studentBase = '/hod/students', action }: { rows: InterventionRow[]; readOnly?: boolean; studentBase?: string; action?: React.ReactNode }) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<string[]>([])
  const [rule, setRule] = React.useState('all')
  const [severity, setSeverity] = React.useState('all')
  const [mentorFilter, setMentorFilter] = React.useState('all')
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState('Please check in with this student this week and record a session or recommendation.')
  const [busy, setBusy] = React.useState(false)
  const mentorNames = [...new Set(rows.map((r) => r.mentorName ?? 'Unassigned'))].sort()
  const shown = rows.filter(
    (r) => (rule === 'all' || r.flags.some((f) => f.key === rule)) && (severity === 'all' || r.risk === severity) && (mentorFilter === 'all' || (r.mentorName ?? 'Unassigned') === mentorFilter),
  )
  if (!rows.length) return <EmptyState illustration="success" title="No students need intervention" description="Risk indicators will appear here as soon as recorded data matches your thresholds." />
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterSelect label="Indicator" value={rule} onChange={(e) => setRule(e.target.value)} options={[{ value: 'all', label: 'All indicators' }, ...Object.entries(RISK_LABELS).map(([value, label]) => ({ value, label }))]} />
          <FilterSelect label="Priority" value={severity} onChange={(e) => setSeverity(e.target.value)} options={[{ value: 'all', label: 'Any priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }]} />
          <FilterSelect label="Mentor" value={mentorFilter} onChange={(e) => setMentorFilter(e.target.value)} options={[{ value: 'all', label: 'All mentors' }, ...mentorNames.map((m) => ({ value: m, label: m }))]} />
        </div>
        {readOnly ? (
          action
        ) : (
          <Button disabled={!selected.length} onClick={() => setOpen(true)}>
            <BellRing /> Request follow-up{selected.length ? ` (${selected.length})` : ''}
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-xl bg-surface shadow-2">
        <div className={readOnly ? 'hidden' : 'border-b border-line bg-surface-muted px-4 py-2.5'}>
          <Checkbox
            id="iv-all"
            label={`Select ${shown.length} shown`}
            checked={shown.length > 0 && shown.every((r) => selected.includes(r.id))}
            onCheckedChange={(v) => setSelected(v ? [...new Set([...selected, ...shown.map((r) => r.id)])] : selected.filter((id) => !shown.some((r) => r.id === id)))}
          />
        </div>
        <ul className="divide-y divide-line/70">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5">
              <div className="flex items-start gap-3 sm:w-72 sm:shrink-0">
                {!readOnly && <Checkbox id={`iv-${r.id}`} label={<span className="sr-only">Select {r.name}</span>} checked={selected.includes(r.id)} onCheckedChange={(v) => setSelected(v ? [...selected, r.id] : selected.filter((x) => x !== r.id))} className="mt-2" />}
                <Avatar userId={r.id} name={r.name} hasImage={r.hasAvatar} size="sm" />
                <div className="min-w-0">
                  <Link href={`${studentBase}/${r.id}`} className="block truncate font-medium text-ink-900 hover:text-primary-700">
                    {r.name ?? 'Student'}
                  </Link>
                  <p className="num text-xs text-ink-500">
                    {r.usn} · S{r.semester ?? '?'} {r.section ?? ''} · CGPA {fmt2(r.cgpa)}
                  </p>
                  <p className="text-xs text-ink-500">{r.mentorName ?? 'No mentor'}</p>
                </div>
              </div>
              <ul className="flex-1 space-y-1.5">
                {r.flags.map((f) => (
                  <li key={f.key} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Pill tone={f.severity === 'high' ? 'danger' : 'warning'} dot>
                      {RISK_LABELS[f.key as RiskKey]}
                    </Pill>
                    <span className="text-ink-700">{f.reason}</span>
                  </li>
                ))}
              </ul>
              <div className={cn('sm:w-56 sm:shrink-0 sm:text-right')}>
                {r.openFollowup ? (
                  <div className="text-xs">
                    <Pill tone="info">Follow-up requested {fmtRelative(r.openFollowup.createdAt)}</Pill>
                    <button
                      type="button"
                      className="mt-1.5 inline-flex items-center gap-1 text-success-700 hover:underline"
                      onClick={async () => {
                        const res = await resolveFollowup(r.openFollowup!.id, 'Resolved by HOD')
                        if (res.ok) {
                          toast.success('Marked resolved')
                          router.refresh()
                        } else toast.error(res.error.message)
                      }}
                    >
                      <CheckCircle2 className="size-3.5" /> Mark resolved
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-ink-500">No open follow-up</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Request follow-up for ${selected.length} student${selected.length === 1 ? '' : 's'}`}
          description="Each student’s mentor gets a notification and a follow-up task."
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
                  const res = await requestFollowups({ student_ids: selected, note })
                  setBusy(false)
                  if (!res.ok) return toast.error(res.error.message)
                  toast.success(`Sent to mentors for ${res.data.requested} student${res.data.requested === 1 ? '' : 's'}${res.data.skipped ? ` · ${res.data.skipped} without a mentor skipped` : ''}`)
                  setOpen(false)
                  setSelected([])
                  router.refresh()
                }}
              >
                <BellRing /> Notify mentors
              </Button>
            </>
          }
        >
          <Textarea id="iv-note" label="Note to the mentor" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
