'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebouncedCallback, useSyncedState } from '@/lib/hooks'
import { resolveGrade, subjectPercentage, type GradingScheme } from '@/lib/grading'
import { resultRowSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { Pill } from '@/components/ui/primitives'
import { createSubject, deleteResult, saveResult } from '@/server/actions/academics'
import type { ResultRow } from '@/server/services/academics'

export type SubjectOption = { id: string; code: string; name: string; credits: number; semester: number | null; mse_max: number | null; see_max: number | null }

type Draft = {
  id?: string
  subject_id: string
  credits: string
  mse_marks: string
  mse_max: string
  see_marks: string
  see_max: string
  ia: { key: string; label: string; marks: string; max: string }[]
  grade: string
  grade_points: string
  result: 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT'
}

const s = (v: number | null | undefined) => (v == null ? '' : String(v))
const toNum = (v: string) => (v.trim() === '' ? null : Number(v))

function fromRow(r: ResultRow): Draft {
  return {
    id: r.id,
    subject_id: r.subjectId,
    credits: s(r.credits),
    mse_marks: s(r.mse_marks),
    mse_max: s(r.mse_max),
    see_marks: s(r.see_marks),
    see_max: s(r.see_max),
    ia: r.ia.map((c) => ({ key: c.key, label: c.label, marks: s(c.marks), max: s(c.max) })),
    grade: r.grade ?? '',
    grade_points: s(r.grade_points),
    result: r.result,
  }
}

const EMPTY: Draft = { subject_id: '', credits: '', mse_marks: '', mse_max: '', see_marks: '', see_max: '', ia: [], grade: '', grade_points: '', result: 'PENDING' }

function toPayload(d: Draft) {
  return {
    id: d.id,
    subject_id: d.subject_id,
    credits: d.credits,
    mse_marks: d.mse_marks,
    mse_max: d.mse_max,
    see_marks: d.see_marks,
    see_max: d.see_max,
    ia: d.ia.map((c) => ({ key: c.key, label: c.label, marks: c.marks, max: c.max })),
    grade: d.grade,
    grade_points: d.grade_points,
    result: d.result,
  }
}

/** One-subject-per-screen entry with autosave, local backup and live grade preview. */
export function SubjectEntryDialog({
  open,
  onOpenChange,
  semesterId,
  semesterNo,
  rows,
  startIndex,
  subjects,
  scheme,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  semesterId: string
  semesterNo: number
  rows: ResultRow[]
  startIndex: number | null // null = new subject
  subjects: SubjectOption[]
  scheme: GradingScheme | null
}) {
  const router = useRouter()
  const [index, setIndex] = React.useState<number | null>(startIndex)
  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [addingSubject, setAddingSubject] = React.useState(false)
  const [localSubjects, setLocalSubjects] = useSyncedState(subjects)
  const backupKey = `m_result_${semesterId}_${index ?? 'new'}`

  // Re-target the requested subject each time the dialog opens.
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setIndex(startIndex)
  }

  // Load the row (or a local unsaved backup) whenever the dialog shows a different subject.
  const loadKey = open ? `${semesterId}:${index ?? 'new'}` : null
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  const [restoredFrom, setRestoredFrom] = React.useState<string | null>(null)
  if (loadKey !== loadedKey) {
    setLoadedKey(loadKey)
    if (loadKey) {
      const base = index != null && rows[index] ? fromRow(rows[index]!) : EMPTY
      let restored = base
      try {
        const raw = localStorage.getItem(backupKey)
        if (raw) {
          const parsed = JSON.parse(raw) as Draft
          if (parsed.subject_id === base.subject_id || !base.subject_id) restored = parsed
        }
      } catch {}
      setDraft(restored)
      setRestoredFrom(JSON.stringify(restored) !== JSON.stringify(base) ? loadKey : null)
      setErrors({})
      setSaveState('idle')
    }
  }
  React.useEffect(() => {
    if (restoredFrom) toast.info('Restored your unsaved entry for this subject.')
  }, [restoredFrom])

  const validate = (d: Draft) => {
    const parsed = resultRowSchema.safeParse(toPayload(d))
    if (parsed.success) return { ok: true as const, data: parsed.data }
    const e: Record<string, string> = {}
    for (const issue of parsed.error.issues) e[issue.path.join('.')] ??= issue.message
    return { ok: false as const, errors: e }
  }

  const persist = async (d: Draft, opts: { quiet?: boolean } = {}) => {
    const v = validate(d)
    if (!v.ok) {
      setErrors(v.errors)
      if (!opts.quiet) toast.error('Fix the highlighted fields first.')
      return false
    }
    setErrors({})
    setSaveState('saving')
    const res = await saveResult(semesterId, toPayload(d))
    if (!res.ok) {
      setSaveState('error')
      if (res.error.fieldErrors) setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
      if (!opts.quiet) toast.error(res.error.message)
      return false
    }
    try {
      localStorage.removeItem(backupKey)
    } catch {}
    setDraft((cur) => ({ ...cur, id: res.data.id }))
    setSaveState('saved')
    router.refresh()
    return true
  }

  const autosave = useDebouncedCallback((d: Draft) => {
    if (d.subject_id && validate(d).ok) void persist(d, { quiet: true })
  }, 1200)

  const update = (patch: Partial<Draft>) => {
    setDraft((cur) => {
      const next = { ...cur, ...patch }
      try {
        localStorage.setItem(backupKey, JSON.stringify(next))
      } catch {}
      setSaveState('idle')
      autosave(next)
      return next
    })
  }

  const pickSubject = (id: string) => {
    const sub = localSubjects.find((x) => x.id === id)
    update({
      subject_id: id,
      credits: draft.credits || s(sub?.credits),
      mse_max: draft.mse_max || s(sub?.mse_max),
      see_max: draft.see_max || s(sub?.see_max),
    })
  }

  const taken = new Set(rows.filter((r, i) => i !== index && r.id !== draft.id).map((r) => r.subjectId))
  const sorted = [...localSubjects].sort((a, b) => Number(b.semester === semesterNo) - Number(a.semester === semesterNo) || a.code.localeCompare(b.code))
  const options = sorted.filter((x) => !taken.has(x.id)).map((x) => ({ value: x.id, label: `${x.code} · ${x.name}${x.semester === semesterNo ? '' : x.semester ? ` (sem ${x.semester})` : ''}` }))

  const engineInput = {
    subjectId: draft.subject_id || 'x',
    credits: Number(draft.credits) || 0,
    mse_marks: toNum(draft.mse_marks),
    mse_max: toNum(draft.mse_max),
    see_marks: toNum(draft.see_marks),
    see_max: toNum(draft.see_max),
    grade: draft.grade || null,
    grade_points: toNum(draft.grade_points),
    result: draft.result,
  }
  const pct = scheme ? subjectPercentage(engineInput, scheme) : null
  const grade = scheme ? resolveGrade(engineInput, scheme) : null

  const go = async (to: number | null) => {
    if (draft.subject_id && !(await persist(draft))) return
    setIndex(to)
  }

  const total = rows.length
  const title = index == null ? 'Add a subject' : `Subject ${index + 1} of ${total}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={`Semester ${semesterNo} · marks, maximum marks and grade`}
        size="lg"
        footer={
          <div className="flex w-full flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {index != null && (
                <Button
                  variant="ghost"
                  className="text-danger-700"
                  onClick={async () => {
                    const r = rows[index]
                    if (!r) return
                    const res = await deleteResult(semesterId, r.id)
                    if (res.ok) {
                      toast.success(`${r.code} removed`)
                      router.refresh()
                      onOpenChange(false)
                    } else toast.error(res.error.message)
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              )}
              <span aria-live="polite" className="text-xs text-ink-500">
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved · just now' : saveState === 'error' ? 'Not saved' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="icon" aria-label="Previous subject" disabled={index == null ? total === 0 : index === 0} onClick={() => go(index == null ? total - 1 : index - 1)}>
                <ChevronLeft />
              </Button>
              {index != null && index < total - 1 ? (
                <Button variant="secondary" onClick={() => go(index + 1)}>
                  Next subject <ChevronRight />
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (draft.subject_id && !(await persist(draft))) return
                    setIndex(null)
                    setDraft(EMPTY)
                  }}
                >
                  <Plus /> Save & add another
                </Button>
              )}
              <Button
                onClick={async () => {
                  if (!draft.subject_id) return onOpenChange(false)
                  if (await persist(draft)) onOpenChange(false)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Select id="subject" label="Subject" required value={draft.subject_id} onChange={(e) => pickSubject(e.target.value)} options={options} error={errors.subject_id} placeholder="Choose a subject…" />
            <Input id="credits" label="Credits" inputMode="decimal" required value={draft.credits} onChange={(e) => update({ credits: e.target.value })} error={errors.credits} />
          </div>
          {!addingSubject ? (
            <button type="button" onClick={() => setAddingSubject(true)} className="-mt-2 text-sm font-medium text-primary-600 hover:underline">
              Subject not listed? Add it
            </button>
          ) : (
            <NewSubjectForm
              semesterNo={semesterNo}
              onCancel={() => setAddingSubject(false)}
              onCreated={(sub) => {
                setLocalSubjects((l) => [...l, sub])
                setAddingSubject(false)
                update({ subject_id: sub.id, credits: s(sub.credits), mse_max: s(sub.mse_max), see_max: s(sub.see_max) })
              }}
            />
          )}

          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-ink-900">Mid-semester exam (MSE)</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input id="mse_marks" label="Marks" inputMode="decimal" value={draft.mse_marks} onChange={(e) => update({ mse_marks: e.target.value })} error={errors.mse_marks} />
              <Input id="mse_max" label="Max marks" inputMode="decimal" value={draft.mse_max} onChange={(e) => update({ mse_max: e.target.value })} error={errors.mse_max} />
            </div>
          </fieldset>
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-ink-900">Semester-end exam (SEE)</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input id="see_marks" label="Marks" inputMode="decimal" value={draft.see_marks} onChange={(e) => update({ see_marks: e.target.value })} error={errors.see_marks} />
              <Input id="see_max" label="Max marks" inputMode="decimal" value={draft.see_max} onChange={(e) => update({ see_max: e.target.value })} error={errors.see_max} />
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-ink-900">Internal assessments (optional)</legend>
            <div className="space-y-3">
              {draft.ia.map((c, i) => (
                <div key={c.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                  <Input id={`ia-${i}-label`} label="Name" value={c.label} onChange={(e) => update({ ia: draft.ia.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  <Input id={`ia-${i}-marks`} label="Marks" inputMode="decimal" value={c.marks} error={errors[`ia.${i}.marks`]} onChange={(e) => update({ ia: draft.ia.map((x, j) => (j === i ? { ...x, marks: e.target.value } : x)) })} />
                  <Input id={`ia-${i}-max`} label="Max" inputMode="decimal" value={c.max} onChange={(e) => update({ ia: draft.ia.map((x, j) => (j === i ? { ...x, max: e.target.value } : x)) })} />
                  <Button variant="ghost" size="icon" aria-label={`Remove ${c.label || 'assessment'}`} className="mt-1.5" onClick={() => update({ ia: draft.ia.filter((_, j) => j !== i) })}>
                    <X />
                  </Button>
                </div>
              ))}
              {draft.ia.length < 4 && (
                <Button variant="soft" size="sm" onClick={() => update({ ia: [...draft.ia, { key: `IA${draft.ia.length + 1}`, label: `IA ${draft.ia.length + 1}`, marks: '', max: '' }] })}>
                  <Plus /> Add assessment
                </Button>
              )}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input id="grade" label="Grade (if published)" value={draft.grade} onChange={(e) => update({ grade: e.target.value.toUpperCase() })} error={errors.grade} hint="Leave blank to calculate" />
            <Input id="grade_points" label="Grade points" inputMode="decimal" value={draft.grade_points} onChange={(e) => update({ grade_points: e.target.value })} error={errors.grade_points} />
            <Select
              id="result"
              label="Result"
              value={draft.result}
              onChange={(e) => update({ result: e.target.value as Draft['result'] })}
              options={[
                { value: 'PENDING', label: 'Pending / work it out' },
                { value: 'PASS', label: 'Pass' },
                { value: 'FAIL', label: 'Fail' },
                { value: 'ABSENT', label: 'Absent' },
              ]}
            />
          </div>

          <div className="rounded-xl bg-primary-50 p-4" aria-live="polite">
            <p className="eyebrow">Live preview</p>
            {!scheme ? (
              <p className="mt-1 text-sm text-ink-700">No grading scheme is active yet, so grades can’t be calculated. Your marks are still saved.</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span>
                  Percentage: <span className="num font-semibold text-ink-900">{pct?.value != null ? `${pct.value.toFixed(2)}%` : '—'}</span>
                </span>
                <span>
                  Grade: <span className="num font-semibold text-ink-900">{grade?.value ? `${grade.value.grade} · ${grade.value.points} pts` : '—'}</span>
                </span>
                {grade?.value && (
                  <Pill tone={grade.value.source === 'COMPUTED' ? 'info' : 'neutral'}>{grade.value.source === 'COMPUTED' ? 'Calculated from marks' : grade.value.source === 'GRADE_LOOKUP' ? 'From your grade' : grade.value.source === 'ENTERED' ? 'Entered by you' : 'Absent'}</Pill>
                )}
                {!grade?.value && <span className="text-ink-500">{grade?.reason ?? pct?.reason}</span>}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewSubjectForm({ semesterNo, onCreated, onCancel }: { semesterNo: number; onCreated: (s: SubjectOption) => void; onCancel: () => void }) {
  const [v, setV] = React.useState({ code: '', name: '', credits: '', mse_max: '50', see_max: '100' })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  const submit = async () => {
    setBusy(true)
    const res = await createSubject({ ...v, semester: semesterNo })
    setBusy(false)
    if (!res.ok) {
      setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
      toast.error(res.error.message)
      return
    }
    toast.success(`${res.data.code} added — your HOD will verify it`)
    onCreated({ ...res.data, credits: Number(res.data.credits), mse_max: res.data.mse_max == null ? null : Number(res.data.mse_max), see_max: res.data.see_max == null ? null : Number(res.data.see_max) })
  }
  return (
    <div className={cn('space-y-3 rounded-xl border border-dashed border-primary-500/50 bg-primary-50/50 p-4')}>
      <p className="text-sm font-semibold text-ink-900">New subject</p>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Input id="ns-code" label="Code" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} error={errors.code} />
        <Input id="ns-name" label="Subject name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input id="ns-credits" label="Credits" inputMode="decimal" value={v.credits} onChange={(e) => setV({ ...v, credits: e.target.value })} error={errors.credits} />
        <Input id="ns-mse" label="MSE max" inputMode="decimal" value={v.mse_max} onChange={(e) => setV({ ...v, mse_max: e.target.value })} />
        <Input id="ns-see" label="SEE max" inputMode="decimal" value={v.see_max} onChange={(e) => setV({ ...v, see_max: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} loading={busy}>
          Add subject
        </Button>
      </div>
    </div>
  )
}
