'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BadgeCheck,
  CornerUpLeft,
  FilePenLine,
  Lock,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { cn, fmt2 } from '@/lib/utils'
import type { GradingScheme } from '@/lib/grading'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/overlay'
import { Card, Pill, StatusPill } from '@/components/ui/primitives'
import { EmptyState, NotEnoughData } from '@/components/ui/states'
import { PercentBar } from '@/components/charts/dashboard'
import { HelpTip } from '@/components/ui/help-tip'
import {
  deleteSemester,
  finalizeSemesters,
  requestCorrection,
  returnSemester,
  submitSemester,
  updateSemesterMeta,
  verifySemesters,
} from '@/server/actions/academics'
import type { ResultRow, SemesterBundle } from '@/server/services/academics'
import { SubjectEntryDialog, type SubjectOption } from './subject-entry'
import { MarksGrid } from './marks-grid'

export type ViewerMode = 'student' | 'mentor' | 'hod' | 'readonly'

const marks = (m: number | null, max: number | null) =>
  m == null ? (
    <span className="text-ink-500">—</span>
  ) : (
    <span className="num">
      <span className="text-ink-900">{fmtMark(m)}</span>
      <span className="text-ink-500">/{max == null ? '?' : fmtMark(max)}</span>
    </span>
  )
const fmtMark = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function SemesterView({
  semester,
  subjects,
  scheme,
  mode,
  pendingCorrectionIds = [],
  compact,
}: {
  semester: SemesterBundle
  subjects: SubjectOption[]
  scheme: GradingScheme | null
  mode: ViewerMode
  pendingCorrectionIds?: string[]
  compact?: boolean
}) {
  const router = useRouter()
  const [entry, setEntry] = React.useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  })
  const [confirm, setConfirm] = React.useState<null | 'submit' | 'delete' | 'verify' | 'finalize'>(null)
  const [returning, setReturning] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [correction, setCorrection] = React.useState<ResultRow | null>(null)
  const editable = mode === 'student' && semester.status === 'DRAFT'
  const locked = semester.status === 'VERIFIED' || semester.status === 'FINALIZED'
  const useGrid =
    editable && (semester.results.length > 0 || subjects.some((x) => x.semester === semester.semesterNo))

  const run = async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) => {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    setConfirm(null)
    if (res.ok) {
      toast.success(success)
      router.refresh()
    } else toast.error(res.error?.message ?? 'Something went wrong')
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-line flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ink-900 text-xl leading-none font-semibold">
              Semester {semester.semesterNo}
            </h2>
            <StatusPill status={semester.status} />
            {locked && (
              <Pill tone="outline">
                <Lock className="size-3" /> Locked
              </Pill>
            )}
          </div>
          <p className="text-ink-500 mt-1.5 text-sm">
            Academic year <span className="num text-ink-700">{semester.academicYear}</span> ·{' '}
            {semester.results.length} subject{semester.results.length === 1 ? '' : 's'}
          </p>
          {semester.returnNote && semester.status === 'DRAFT' && (
            <p className="bg-tile-peach text-accent-700 mt-3 rounded-[12px] px-3 py-2 text-sm">
              <span className="font-semibold">Returned by your mentor:</span> {semester.returnNote}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-6 sm:text-right">
          <div>
            <p className="eyebrow flex items-center gap-0.5 sm:justify-end">
              SGPA <HelpTip term="SGPA" />
            </p>
            <p className="num-display text-ink-900 mt-1 text-3xl font-semibold">
              {semester.displaySgpa != null ? fmt2(semester.displaySgpa) : '—'}
            </p>
          </div>
          <div>
            <p className="eyebrow flex items-center gap-0.5 sm:justify-end">
              Credits <HelpTip term="CREDITS" />
            </p>
            <p className="num-display text-ink-900 mt-1 text-3xl font-semibold">
              {semester.sgpa.value
                ? semester.sgpa.value.creditsRegistered
                : semester.results.reduce((a, r) => a + r.credits, 0)}
            </p>
          </div>
        </div>
      </div>

      {semester.displaySgpa == null && semester.displayNote && (
        <div className="border-line border-b px-5 py-4 sm:px-6">
          <NotEnoughData reason={semester.displayNote} />
          {editable && <ManualGpa semester={semester} />}
          {!editable && semester.manualSgpa != null && (
            <p className="text-ink-700 mt-2 text-sm">
              Student-entered SGPA: <span className="num font-semibold">{fmt2(semester.manualSgpa)}</span>{' '}
              <Pill tone="warning">Unverified</Pill>
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {useGrid && (
        <MarksGrid
          semesterId={semester.id}
          semesterNo={semester.semesterNo}
          results={semester.results}
          subjects={subjects}
          scheme={scheme}
          onOpenDetails={(index) => setEntry({ open: true, index })}
        />
      )}
      {semester.results.length === 0 ? (
        <div className={cn(useGrid && 'md:hidden')}>
          <EmptyState
            illustration="no-marks"
            title="No subjects yet"
            description={
              editable
                ? 'Add each subject with its marks, maximum marks and grade. Your entries save automatically.'
                : 'The student has not added subjects for this semester.'
            }
            action={
              editable && (
                <Button onClick={() => setEntry({ open: true, index: null })}>
                  <Plus /> Add first subject
                </Button>
              )
            }
            compact={compact}
          />
        </div>
      ) : (
        <>
          {/* Desktop table (read-only views; students editing a draft get the marks grid) */}
          <div className={cn('hidden overflow-x-auto', !useGrid && 'md:block')}>
            <table className="w-full text-sm">
              <caption className="sr-only">Semester {semester.semesterNo} results</caption>
              <thead>
                <tr className="bg-surface-muted text-ink-500 text-left text-[0.6875rem] tracking-[0.04em] uppercase">
                  <th scope="col" className="sticky top-0 px-5 py-3 font-semibold">
                    Subject
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Credits
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    MSE (marks)
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    SEE (marks)
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Internal
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Overall %
                  </th>
                  <th scope="col" className="px-3 py-3 text-center font-semibold">
                    Grade
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Points
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Result
                  </th>
                  {(editable || (mode === 'student' && locked)) && (
                    <th scope="col" className="px-5 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {semester.results.map((r, i) => (
                  <tr key={r.id} className="border-line/70 hover:bg-surface-muted border-b last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="text-ink-900 font-medium">{r.name}</p>
                      <p className="num text-ink-500 text-xs">
                        {r.code}
                        {r.attempt > 1 && ` · attempt ${r.attempt}`}
                      </p>
                    </td>
                    <td className="num text-ink-900 px-3 py-3.5 text-right">{r.credits}</td>
                    <td className="px-3 py-3.5 text-right">{marks(r.mse_marks, r.mse_max)}</td>
                    <td className="px-3 py-3.5 text-right">{marks(r.see_marks, r.see_max)}</td>
                    <td className="px-3 py-3.5">
                      {r.ia.length ? (
                        <span className="num text-ink-700 text-xs">
                          {r.ia.map((c) => `${c.label} ${c.marks ?? '—'}/${c.max ?? '?'}`).join(' · ')}
                        </span>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <PercentBar value={r.pct} label={`${r.code} overall percentage`} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {r.resolvedGrade ? (
                        <span className="num bg-primary-100 text-primary-700 inline-grid min-w-8 place-items-center rounded-full px-2 py-0.5 text-xs font-semibold">
                          {r.resolvedGrade}
                        </span>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </td>
                    <td className="num text-ink-900 px-3 py-3.5 text-right">{r.resolvedPoints ?? '—'}</td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={r.derivedResult} />
                    </td>
                    {editable && (
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${r.code}`}
                          onClick={() => setEntry({ open: true, index: i })}
                        >
                          <Pencil />
                        </Button>
                      </td>
                    )}
                    {mode === 'student' && locked && (
                      <td className="px-5 py-3.5 text-right">
                        {pendingCorrectionIds.includes(r.id) ? (
                          <Pill tone="accent">Correction pending</Pill>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setCorrection(r)}>
                            <FilePenLine /> Request correction
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="divide-line divide-y md:hidden">
            {semester.results.map((r, i) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink-900 font-medium">{r.name}</p>
                    <p className="num text-ink-500 text-xs">
                      {r.code} · {r.credits} credits
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.resolvedGrade && (
                      <span className="num bg-primary-50 text-primary-700 grid min-w-9 place-items-center rounded-lg px-2 py-1 text-sm font-semibold">
                        {r.resolvedGrade}
                      </span>
                    )}
                    <StatusPill status={r.derivedResult} />
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-surface-muted rounded-[12px] px-2.5 py-2">
                    <dt className="text-ink-500">MSE</dt>
                    <dd className="mt-0.5 text-sm">{marks(r.mse_marks, r.mse_max)}</dd>
                  </div>
                  <div className="bg-surface-muted rounded-[12px] px-2.5 py-2">
                    <dt className="text-ink-500">SEE</dt>
                    <dd className="mt-0.5 text-sm">{marks(r.see_marks, r.see_max)}</dd>
                  </div>
                  <div className="bg-surface-muted rounded-[12px] px-2.5 py-2">
                    <dt className="text-ink-500">Percent</dt>
                    <dd className="num text-ink-900 mt-0.5 text-sm">
                      {r.pct != null ? `${r.pct.toFixed(1)}%` : 'n/a'}
                    </dd>
                  </div>
                </dl>
                {editable && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setEntry({ open: true, index: i })}
                  >
                    <Pencil /> Edit marks
                  </Button>
                )}
                {mode === 'student' && locked && !pendingCorrectionIds.includes(r.id) && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setCorrection(r)}>
                    <FilePenLine /> Request correction
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Footer actions */}
      {(editable ||
        ((mode === 'mentor' || mode === 'hod') && semester.status === 'SUBMITTED') ||
        (mode === 'hod' && semester.status === 'VERIFIED')) && (
        <div className="border-line bg-surface-muted flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {editable ? (
            <>
              <Button variant="ghost" className="text-danger-700" onClick={() => setConfirm('delete')}>
                <Trash2 /> Delete semester
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => setEntry({ open: true, index: null })}>
                  <Plus /> Add subject
                </Button>
                <Button onClick={() => setConfirm('submit')} disabled={semester.results.length === 0}>
                  <Send /> Submit for verification
                </Button>
              </div>
            </>
          ) : semester.status === 'SUBMITTED' ? (
            <>
              <p className="text-ink-500 text-sm">
                Check the marks against the official result before verifying.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => setReturning(true)}>
                  <CornerUpLeft /> Return for changes
                </Button>
                <Button onClick={() => setConfirm('verify')}>
                  <BadgeCheck /> Verify semester
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-ink-500 text-sm">
                Finalizing makes this the official record. Later changes need an approved correction.
              </p>
              <Button onClick={() => setConfirm('finalize')}>
                <ShieldCheck /> Finalize
              </Button>
            </>
          )}
        </div>
      )}

      {editable && (
        <SubjectEntryDialog
          open={entry.open}
          onOpenChange={(open) => setEntry((e) => ({ ...e, open }))}
          semesterId={semester.id}
          semesterNo={semester.semesterNo}
          rows={semester.results}
          startIndex={entry.index}
          subjects={subjects}
          scheme={scheme}
        />
      )}

      <ConfirmDialog
        open={confirm === 'submit'}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Submit for verification?"
        description="Your mentor will check these marks. You won’t be able to edit them unless they’re returned to you."
        confirmLabel="Submit"
        loading={busy}
        onConfirm={() => run(() => submitSemester(semester.id), 'Submitted — your mentor has been notified')}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={`Delete semester ${semester.semesterNo}?`}
        description="All subjects and marks in this draft will be removed. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={() => run(() => deleteSemester(semester.id), 'Semester deleted')}
      />
      <ConfirmDialog
        open={confirm === 'verify'}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Verify this semester?"
        description="The SGPA snapshot is recorded and the student’s marks are locked."
        confirmLabel="Verify"
        loading={busy}
        onConfirm={() => run(() => verifySemesters([semester.id]), 'Semester verified')}
      />
      <ConfirmDialog
        open={confirm === 'finalize'}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Finalize this semester?"
        description="This becomes the official record used in reports."
        confirmLabel="Finalize"
        loading={busy}
        onConfirm={() => run(() => finalizeSemesters([semester.id]), 'Semester finalized')}
      />
      <ReturnDialog open={returning} onOpenChange={setReturning} semesterId={semester.id} />
      {correction && (
        <CorrectionDialog row={correction} semesterId={semester.id} onClose={() => setCorrection(null)} />
      )}
    </Card>
  )
}

function ManualGpa({ semester }: { semester: SemesterBundle }) {
  const router = useRouter()
  const [sgpa, setSgpa] = React.useState(semester.manualSgpa == null ? '' : String(semester.manualSgpa))
  const [cgpa, setCgpa] = React.useState(semester.manualCgpa == null ? '' : String(semester.manualCgpa))
  const [busy, setBusy] = React.useState(false)
  return (
    <div className="border-line mt-3 rounded-lg border p-3">
      <p className="text-ink-700 text-sm">
        Know your official SGPA/CGPA? Enter them — they’ll be marked <Pill tone="warning">Unverified</Pill>{' '}
        until your mentor checks them.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          id={`msgpa-${semester.id}`}
          label="SGPA"
          inputMode="decimal"
          value={sgpa}
          onChange={(e) => setSgpa(e.target.value)}
          className="sm:max-w-36"
        />
        <Input
          id={`mcgpa-${semester.id}`}
          label="CGPA"
          inputMode="decimal"
          value={cgpa}
          onChange={(e) => setCgpa(e.target.value)}
          className="sm:max-w-36"
        />
        <Button
          variant="secondary"
          className="sm:mt-1.5"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            const res = await updateSemesterMeta(semester.id, {
              manual_sgpa: sgpa === '' ? null : sgpa,
              manual_cgpa: cgpa === '' ? null : cgpa,
            })
            setBusy(false)
            if (res.ok) {
              toast.success('Saved')
              router.refresh()
            } else toast.error(res.error.message)
          }}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

function ReturnDialog({
  open,
  onOpenChange,
  semesterId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  semesterId: string
}) {
  const router = useRouter()
  const [note, setNote] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string>()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Return for changes"
        description="The student will be notified and can edit the draft again."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true)
                const res = await returnSemester(semesterId, note)
                setBusy(false)
                if (res.ok) {
                  toast.success('Returned to the student')
                  onOpenChange(false)
                  router.refresh()
                } else setError(res.error.message)
              }}
            >
              Return
            </Button>
          </>
        }
      >
        <Textarea
          id="return-note"
          label="What needs fixing?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={error}
          required
        />
      </DialogContent>
    </Dialog>
  )
}

function CorrectionDialog({
  row,
  semesterId,
  onClose,
}: {
  row: ResultRow
  semesterId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [v, setV] = React.useState({
    mse_marks: row.mse_marks == null ? '' : String(row.mse_marks),
    mse_max: row.mse_max == null ? '' : String(row.mse_max),
    see_marks: row.see_marks == null ? '' : String(row.see_marks),
    see_max: row.see_max == null ? '' : String(row.see_max),
    grade: row.grade ?? '',
    grade_points: row.grade_points == null ? '' : String(row.grade_points),
    result: row.result,
  })
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const field = (k: keyof typeof v, label: string) => (
    <Input
      id={`cr-${k}`}
      label={label}
      inputMode="decimal"
      value={v[k]}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
      error={errors[k]}
    />
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Request a correction"
        description={`${row.code} · ${row.name}. Your mentor will review the change against the current values.`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true)
                const res = await requestCorrection({
                  academic_semester_id: semesterId,
                  target_table: 'student_subject_results',
                  target_id: row.id,
                  proposed: v,
                  reason,
                })
                setBusy(false)
                if (res.ok) {
                  toast.success('Correction requested — your mentor has been notified')
                  onClose()
                  router.refresh()
                } else {
                  setErrors(
                    Object.fromEntries(
                      Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? '']),
                    ),
                  )
                  toast.error(res.error.message)
                }
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field('mse_marks', 'MSE marks')}
            {field('mse_max', 'MSE max')}
            {field('see_marks', 'SEE marks')}
            {field('see_max', 'SEE max')}
            {field('grade', 'Grade')}
            {field('grade_points', 'Grade points')}
          </div>
          <Select
            id="cr-result"
            label="Result"
            value={v.result}
            onChange={(e) => setV({ ...v, result: e.target.value as typeof v.result })}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'PASS', label: 'Pass' },
              { value: 'FAIL', label: 'Fail' },
              { value: 'ABSENT', label: 'Absent' },
            ]}
          />
          <Textarea
            id="cr-reason"
            label="Why is this wrong?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={errors.reason}
            required
            hint="e.g. The SEE revaluation result changed my marks to 72."
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SemesterCards({ semesters, hrefBase }: { semesters: SemesterBundle[]; hrefBase: string }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {semesters.map((s) => (
        <li key={s.id}>
          <Link
            href={`${hrefBase}/${s.semesterNo}`}
            className={cn(
              'group block h-full rounded-[20px] p-5 transition-transform hover:-translate-y-0.5',
              {
                DRAFT: 'bg-tile-lilac',
                SUBMITTED: 'bg-tile-peach',
                VERIFIED: 'bg-tile-blue',
                FINALIZED: 'bg-tile-green',
              }[s.status],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-ink-700 text-sm font-medium">Semester {s.semesterNo}</p>
                <p className="num-display text-ink-900 mt-2 text-4xl leading-none font-semibold">
                  {s.displaySgpa != null
                    ? fmt2(s.displaySgpa)
                    : s.manualSgpa != null
                      ? `${fmt2(s.manualSgpa)}*`
                      : '—'}
                </p>
                <p className="text-ink-500 mt-1 text-xs">SGPA</p>
              </div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div className="text-left">
                <p className="text-ink-500 text-xs">{s.academicYear}</p>
                <p className="num text-ink-700 text-sm">
                  {s.results.length} subjects · {s.results.reduce((a, r) => a + r.credits, 0)} cr
                </p>
              </div>
            </div>
            {s.displaySgpa == null && (
              <p className="text-ink-500 mt-3 line-clamp-2 text-xs">
                {s.manualSgpa != null ? '* Entered by student, unverified' : s.displayNote}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
