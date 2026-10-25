'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarDays,
  CheckCircle2,
  CornerDownRight,
  EyeOff,
  FileText,
  Lock,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useSyncedState } from '@/lib/hooks'
import { cn, fmtDate, fmtRelative } from '@/lib/utils'
import { CATEGORY_LABEL, KIND_LABEL } from '@/lib/labels'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent, Sheet, SheetContent } from '@/components/ui/overlay'
import { NewDot, Pill, ProgressRing, StatusPill } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/navigation'
import { EmptyState } from '@/components/ui/states'
import {
  confirmCompletion,
  createRecommendation,
  deleteRecommendation,
  markSeen,
  saveReflection,
  setRecommendationStatus,
  toggleStep,
  updateRecommendation,
} from '@/server/actions/mentoring'
import type { Recommendation } from '@/server/services/mentoring'

type Viewer = 'MENTEE' | 'MENTOR' | 'HOD'
type SubjectOpt = { id: string; code: string; name: string }

const PLAN_KINDS = ['GOAL', 'ACTION_POINT'] as const
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
]

function useAction() {
  const router = useRouter()
  return React.useCallback(
    async (
      fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
      success?: string,
      undo?: () => Promise<unknown>,
    ) => {
      const res = await fn()
      if (res.ok) {
        // UX2-07: reversible changes get an Undo instead of a confirm dialog.
        if (success)
          toast.success(
            success,
            undo
              ? { action: { label: 'Undo', onClick: () => void undo().then(() => router.refresh()) } }
              : undefined,
          )
        router.refresh()
        return true
      }
      toast.error(res.error?.message ?? 'Something went wrong')
      return false
    },
    [router],
  )
}

export function MentoringWorkspace({
  items,
  viewer,
  studentId,
  subjects,
  attendanceEnabled,
  canWrite,
}: {
  items: Recommendation[]
  viewer: Viewer
  studentId: string
  subjects: SubjectOpt[]
  attendanceEnabled: boolean
  canWrite: boolean
}) {
  const sp = useSearchParams()
  const [view, setView] = React.useState<'feedback' | 'plan' | 'board'>(
    (sp.get('tab') as 'plan' | 'board') === 'plan'
      ? 'plan'
      : sp.get('tab') === 'board'
        ? 'board'
        : 'feedback',
  )
  const [status, setStatus] = React.useState<string>('all')
  const [category, setCategory] = React.useState<string>('all')
  const [openId, setOpenId] = React.useState<string | null>(sp.get('item'))
  const [composer, setComposer] = React.useState<{
    open: boolean
    edit?: Recommendation
    parent?: Recommendation
    kind?: string
  }>(() => ({ open: sp.get('action') === 'recommend' && canWrite }))
  const run = useAction()

  const flat = React.useMemo(() => items.flatMap((i) => [i, ...i.followUps]), [items])
  const open = flat.find((i) => i.id === openId) ?? null
  const unseen = flat.filter((i) => !i.seen)

  React.useEffect(() => {
    if (open && !open.seen && viewer === 'MENTEE') void markSeen('recommendation', [open.id])
  }, [open, viewer])

  const filtered = items.filter((i) => {
    const inView =
      view === 'plan'
        ? (PLAN_KINDS as readonly string[]).includes(i.kind)
        : view === 'feedback'
          ? !(PLAN_KINDS as readonly string[]).includes(i.kind)
          : true
    return (
      inView && (status === 'all' || i.status === status) && (category === 'all' || i.category === category)
    )
  })

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Mentoring view"
          value={view}
          onChange={setView}
          options={[
            { value: 'feedback', label: 'Feedback' },
            { value: 'plan', label: 'Improvement plan' },
            { value: 'board', label: 'Strengths & areas' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {view !== 'board' && (
            <>
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border-line bg-surface shadow-1 h-10 rounded-full border px-4 text-sm"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border-line bg-surface shadow-1 h-10 rounded-full border px-4 text-sm"
              >
                <option value="all">All categories</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </>
          )}
          {viewer === 'MENTEE' && unseen.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                run(
                  () =>
                    markSeen(
                      'recommendation',
                      unseen.map((u) => u.id),
                    ),
                  'Marked as seen',
                )
              }
            >
              <CheckCircle2 /> Mark all as seen
            </Button>
          )}
          {canWrite && (
            <Button onClick={() => setComposer({ open: true, kind: view === 'plan' ? 'GOAL' : undefined })}>
              <MessageSquarePlus /> {view === 'plan' ? 'New goal' : 'New recommendation'}
            </Button>
          )}
        </div>
      </div>

      {view === 'board' ? (
        <Board items={items} onOpen={setOpenId} />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration="no-feedback"
          title={view === 'plan' ? 'No goals yet' : 'No feedback yet'}
          description={
            canWrite
              ? 'Write the first one — it’s shared with the student unless you mark it private.'
              : viewer === 'MENTEE'
                ? 'Your mentor’s recommendations and goals will appear here.'
                : 'Nothing recorded yet.'
          }
          action={
            canWrite && (
              <Button onClick={() => setComposer({ open: true, kind: view === 'plan' ? 'GOAL' : undefined })}>
                {view === 'plan' ? 'Set a goal' : 'Write a recommendation'}
              </Button>
            )
          }
        />
      ) : (
        <ul className="stagger space-y-3">
          {filtered.map((i) => (
            <RecRow
              key={i.id}
              item={i}
              viewer={viewer}
              onOpen={() => setOpenId(i.id)}
              plan={view === 'plan'}
            />
          ))}
        </ul>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <SheetContent
            title={KIND_LABEL[open.kind]}
            description={CATEGORY_LABEL[open.category]}
            className="max-w-xl"
          >
            <Detail
              item={open}
              viewer={viewer}
              canWrite={canWrite}
              onEdit={() => setComposer({ open: true, edit: open })}
              onFollowUp={() => setComposer({ open: true, parent: open })}
              onDeleted={() => setOpenId(null)}
            />
          </SheetContent>
        )}
      </Sheet>

      {canWrite && (
        <Composer
          key={`${composer.edit?.id ?? composer.parent?.id ?? 'new'}-${composer.open}`}
          open={composer.open}
          onOpenChange={(o) => setComposer((c) => ({ ...c, open: o }))}
          studentId={studentId}
          subjects={subjects}
          attendanceEnabled={attendanceEnabled}
          edit={composer.edit}
          parent={composer.parent}
          defaultKind={composer.kind}
          onSaved={(kind) =>
            view !== 'board' &&
            setView((PLAN_KINDS as readonly string[]).includes(kind) ? 'plan' : 'feedback')
          }
        />
      )}
    </div>
  )
}

function RecRow({
  item,
  viewer,
  onOpen,
  plan,
}: {
  item: Recommendation
  viewer: Viewer
  onOpen: () => void
  plan: boolean
}) {
  const total = item.steps.length
  const done = item.steps.filter((s) => s.done).length
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group bg-surface shadow-2 hover:shadow-3 flex w-full items-start gap-4 rounded-xl p-4 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 sm:p-5"
      >
        {plan ? (
          <ProgressRing
            value={
              item.status === 'COMPLETED'
                ? 100
                : total
                  ? (done / total) * 100
                  : item.status === 'IN_PROGRESS'
                    ? 50
                    : 0
            }
            size={52}
            stroke={5}
            label={`${item.title} progress`}
          />
        ) : (
          <Avatar userId={item.mentorId} name={item.mentorName} hasImage={item.mentorHasAvatar} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              tone={
                item.kind === 'STRENGTH'
                  ? 'success'
                  : item.kind === 'IMPROVEMENT_AREA'
                    ? 'warning'
                    : item.kind === 'GOAL'
                      ? 'brand'
                      : item.kind === 'FEEDBACK'
                        ? 'accent'
                        : 'info'
              }
            >
              {KIND_LABEL[item.kind]}
            </Pill>
            <span className="text-ink-500 text-xs">{CATEGORY_LABEL[item.category]}</span>
            {item.visibility === 'PRIVATE_MENTOR' && (
              <Pill tone="neutral">
                <Lock className="size-3" /> Private
              </Pill>
            )}
            {!item.seen && viewer === 'MENTEE' && <NewDot />}
          </div>
          <p className="text-ink-900 group-hover:text-primary-700 mt-2 font-medium">{item.title}</p>
          {item.body && <p className="text-ink-500 mt-1 line-clamp-2 text-sm">{item.body}</p>}
          <div className="text-ink-500 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <StatusPill status={item.status} />
            {item.subject && <span className="num">{item.subject.code}</span>}
            {item.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" /> Due {fmtDate(item.dueDate, 'd MMM')}
              </span>
            )}
            {total > 0 && (
              <span className="num">
                {done}/{total} steps
              </span>
            )}
            {item.followUps.length > 0 && (
              <span>
                {item.followUps.length} follow-up{item.followUps.length === 1 ? '' : 's'}
              </span>
            )}
            <span>{fmtRelative(item.createdAt)}</span>
          </div>
        </div>
      </button>
    </li>
  )
}

function Board({ items, onOpen }: { items: Recommendation[]; onOpen: (id: string) => void }) {
  const cols = [
    { kind: 'STRENGTH', title: 'Strengths', tone: 'border-success-500', empty: 'No strengths recorded yet.' },
    {
      kind: 'IMPROVEMENT_AREA',
      title: 'Improvement areas',
      tone: 'border-warning-500',
      empty: 'No improvement areas recorded.',
    },
  ] as const
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cols.map((c) => {
        const list = items.filter((i) => i.kind === c.kind)
        return (
          <section key={c.kind} className={cn('bg-surface shadow-2 rounded-xl border-t-4 p-5', c.tone)}>
            <h3 className="text-ink-900 font-semibold">
              {c.title} <span className="num text-ink-500">{list.length}</span>
            </h3>
            <ul className="mt-4 space-y-2">
              {list.length === 0 && <li className="text-ink-500 text-sm">{c.empty}</li>}
              {list.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(i.id)}
                    className="bg-surface-muted hover:bg-surface-muted w-full rounded-lg px-3.5 py-3 text-left"
                  >
                    <p className="text-ink-900 text-sm font-medium">{i.title}</p>
                    {i.body && <p className="text-ink-500 mt-0.5 line-clamp-2 text-xs">{i.body}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill status={i.status} />
                      <span className="text-ink-500 text-xs">{fmtDate(i.createdAt, 'd MMM yyyy')}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function Detail({
  item,
  viewer,
  canWrite,
  onEdit,
  onFollowUp,
  onDeleted,
}: {
  item: Recommendation
  viewer: Viewer
  canWrite: boolean
  onEdit: () => void
  onFollowUp: () => void
  onDeleted: () => void
}) {
  const run = useAction()
  const [reflection, setReflection] = useSyncedState(item.reflection ?? '')
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const studentCanUpdate =
    viewer === 'MENTEE' && ['GOAL', 'ACTION_POINT', 'RECOMMENDATION'].includes(item.kind)
  const canChangeStatus = canWrite || studentCanUpdate

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Avatar userId={item.mentorId} name={item.mentorName} hasImage={item.mentorHasAvatar} size="sm" />
          <div>
            <p className="text-ink-900 text-sm font-semibold">{item.mentorName}</p>
            <p className="text-ink-500 text-xs">{fmtDate(item.createdAt, 'd MMM yyyy, h:mm a')}</p>
          </div>
        </div>
        <h3 className="text-ink-900 mt-4 text-[1.75rem] leading-tight font-semibold tracking-tight">
          {item.title}
        </h3>
        {item.body && (
          <p className="text-ink-700 mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line">
            {item.body}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {item.subject && (
            <Pill tone="outline">
              {item.subject.code} · {item.subject.name}
            </Pill>
          )}
          {item.targetMetric && <Pill tone="brand">Target: {item.targetMetric}</Pill>}
          {item.visibility === 'PRIVATE_MENTOR' && (
            <Pill tone="neutral">
              <EyeOff className="size-3" /> Private to mentors
            </Pill>
          )}
          {item.includeInReport && (
            <Pill tone="info">
              <FileText className="size-3" /> In PDF report
            </Pill>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-surface-muted rounded-[12px] px-3 py-2">
            <dt className="text-ink-500 text-xs">Due</dt>
            <dd className="text-ink-900">{fmtDate(item.dueDate)}</dd>
          </div>
          <div className="bg-surface-muted rounded-[12px] px-3 py-2">
            <dt className="text-ink-500 text-xs">Review</dt>
            <dd className="text-ink-900">{fmtDate(item.reviewDate)}</dd>
          </div>
        </dl>
      </div>

      {canChangeStatus ? <StatusSelect item={item} run={run} /> : <StatusPill status={item.status} />}

      {item.steps.length > 0 && (
        <section>
          <h4 className="text-ink-900 text-sm font-semibold">Steps</h4>
          <ul className="mt-3 space-y-2.5">
            {item.steps.map((s) => (
              <li key={s.id}>
                <Checkbox
                  id={`step-${s.id}`}
                  label={<span className={cn(s.done && 'text-ink-500 line-through')}>{s.label}</span>}
                  checked={s.done}
                  disabled={!(canWrite || studentCanUpdate)}
                  onCheckedChange={(v) => run(() => toggleStep(item.id, s.id, v === true))}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(studentCanUpdate || item.reflection) && (item.kind === 'GOAL' || item.kind === 'ACTION_POINT') && (
        <section>
          <h4 className="text-ink-900 text-sm font-semibold">Reflection</h4>
          {studentCanUpdate ? (
            <div className="mt-3 space-y-2">
              <Textarea
                id="reflection"
                label="What worked, what’s next?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => run(() => saveReflection(item.id, reflection), 'Reflection saved')}
              >
                Save reflection
              </Button>
            </div>
          ) : (
            <p className="bg-surface-muted text-ink-700 mt-2 rounded-lg p-3 text-sm">{item.reflection}</p>
          )}
        </section>
      )}

      {canWrite &&
        item.status === 'COMPLETED' &&
        !item.completionConfirmedAt &&
        (item.kind === 'GOAL' || item.kind === 'ACTION_POINT') && (
          <div className="bg-success-100 rounded-xl p-4">
            <p className="text-success-700 text-sm">The student marked this complete.</p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => run(() => confirmCompletion(item.id), 'Completion confirmed')}
            >
              <CheckCircle2 /> Confirm completion
            </Button>
          </div>
        )}
      {item.completionConfirmedAt && (
        <p className="text-success-700 text-sm">
          Completion confirmed by mentor on {fmtDate(item.completionConfirmedAt)}.
        </p>
      )}

      {item.history.length > 0 && (
        <section>
          <h4 className="text-ink-900 text-sm font-semibold">History</h4>
          <ol className="border-line mt-3 space-y-2 border-l pl-4">
            {item.history.map((h, i) => (
              <li key={i} className="text-ink-700 relative text-sm">
                <span className="bg-primary-500 absolute top-1.5 -left-[21px] size-2 rounded-full" />
                {h.from ? (
                  <>
                    {STATUS_OPTIONS.find((s) => s.value === h.from)?.label} →{' '}
                    <span className="font-medium">{STATUS_OPTIONS.find((s) => s.value === h.to)?.label}</span>
                  </>
                ) : (
                  <>Created as {STATUS_OPTIONS.find((s) => s.value === h.to)?.label}</>
                )}
                <span className="text-ink-500 ml-2 text-xs">{fmtDate(h.at, 'd MMM, h:mm a')}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {item.followUps.length > 0 && (
        <section>
          <h4 className="text-ink-900 text-sm font-semibold">Follow-ups</h4>
          <ul className="mt-3 space-y-2">
            {item.followUps.map((f) => (
              <li key={f.id} className="bg-surface-muted flex gap-2 rounded-lg p-3 text-sm">
                <CornerDownRight className="text-ink-400 mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-ink-900 font-medium">{f.title}</p>
                  {f.body && <p className="text-ink-700 mt-0.5">{f.body}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusPill status={f.status} />
                    <span className="text-ink-500 text-xs">{fmtRelative(f.createdAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canWrite && (
        <div className="border-line flex flex-wrap gap-2 border-t pt-5">
          <Button variant="secondary" size="sm" onClick={onFollowUp}>
            <Plus /> Add follow-up
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-700"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this item?"
        description="It will be removed for you and the student. This is recorded in the audit history."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (await run(() => deleteRecommendation(item.id), 'Deleted')) {
            setConfirmDelete(false)
            onDeleted()
          }
        }}
      />
    </div>
  )
}

function Composer({
  open,
  onOpenChange,
  studentId,
  subjects,
  attendanceEnabled,
  edit,
  parent,
  defaultKind,
  onSaved,
}: {
  open: boolean
  onSaved?: (kind: string) => void
  onOpenChange: (v: boolean) => void
  studentId: string
  subjects: SubjectOpt[]
  attendanceEnabled: boolean
  edit?: Recommendation
  parent?: Recommendation
  defaultKind?: string
}) {
  const run = useAction()
  const [v, setV] = React.useState({
    kind: edit?.kind ?? (parent ? 'ACTION_POINT' : (defaultKind ?? 'RECOMMENDATION')),
    category: edit?.category ?? parent?.category ?? 'ACADEMIC_PROGRESS',
    title: edit?.title ?? '',
    body: edit?.body ?? '',
    subject_id: edit?.subject?.id ?? parent?.subject?.id ?? '',
    due_date: edit?.dueDate ?? '',
    review_date: edit?.reviewDate ?? '',
    visibility: edit?.visibility ?? 'SHARED',
    include_in_report: edit?.includeInReport ?? false,
    target_metric: edit?.targetMetric ?? '',
    steps: edit?.steps ?? ([] as { id: string; label: string; done: boolean }[]),
  })
  const [stepDraft, setStepDraft] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  const isPlan = v.kind === 'GOAL' || v.kind === 'ACTION_POINT'

  const submit = async () => {
    setBusy(true)
    const payload = { ...v, student_id: studentId, parent_id: parent?.id ?? null }
    const res = edit ? await updateRecommendation(edit.id, payload) : await createRecommendation(payload)
    setBusy(false)
    if (!res.ok) {
      setErrors(
        Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])),
      )
      toast.error(res.error.message)
      return
    }
    toast.success(
      edit ? 'Saved' : v.visibility === 'SHARED' ? 'Shared with the student' : 'Private note saved',
    )
    onOpenChange(false)
    onSaved?.(v.kind)
    await run(async () => ({ ok: true }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={edit ? 'Edit' : parent ? 'Add a follow-up' : 'New recommendation'}
        description={
          parent
            ? `Following up on “${parent.title}”`
            : 'Structured, dated and trackable. Shared with the student unless you make it private.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              {edit ? 'Save changes' : v.visibility === 'SHARED' ? 'Share with student' : 'Save private note'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="c-kind"
              label="Type"
              value={v.kind}
              onChange={(e) => setV({ ...v, kind: e.target.value as typeof v.kind })}
              options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <Select
              id="c-category"
              label="Category"
              value={v.category}
              onChange={(e) => setV({ ...v, category: e.target.value as typeof v.category })}
              options={Object.entries(CATEGORY_LABEL)
                .filter(([k]) => attendanceEnabled || k !== 'ATTENDANCE')
                .map(([value, label]) => ({ value, label }))}
            />
          </div>
          <Input
            id="c-title"
            label="Title"
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
            error={errors.title}
            required
          />
          <Textarea
            id="c-body"
            label="Details"
            rows={5}
            value={v.body}
            onChange={(e) => setV({ ...v, body: e.target.value })}
            error={errors.body}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="c-subject"
              label="Linked subject"
              value={v.subject_id}
              onChange={(e) => setV({ ...v, subject_id: e.target.value })}
              options={subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
              placeholder="None"
            />
            <Input
              id="c-due"
              type="date"
              label="Due date"
              value={v.due_date}
              onChange={(e) => setV({ ...v, due_date: e.target.value })}
              error={errors.due_date}
            />
            <Input
              id="c-review"
              type="date"
              label="Review date"
              value={v.review_date}
              onChange={(e) => setV({ ...v, review_date: e.target.value })}
              error={errors.review_date}
            />
          </div>
          {isPlan && (
            <div className="border-line space-y-3 rounded-xl border p-4">
              <Input
                id="c-target"
                label="Measurable target (e.g. SEE ≥ 70%)"
                value={v.target_metric}
                onChange={(e) => setV({ ...v, target_metric: e.target.value })}
              />
              <p className="text-ink-900 text-sm font-semibold">Steps</p>
              <ul className="space-y-2">
                {v.steps.map((s, i) => (
                  <li
                    key={s.id}
                    className="bg-surface-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="num text-ink-500">{i + 1}.</span>
                    <span className="text-ink-900 flex-1">{s.label}</span>
                    <button
                      type="button"
                      aria-label={`Remove step ${i + 1}`}
                      className="text-ink-500 hover:bg-surface-muted grid size-8 place-items-center rounded-lg"
                      onClick={() => setV({ ...v, steps: v.steps.filter((x) => x.id !== s.id) })}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  id="c-step"
                  label="Add a step"
                  value={stepDraft}
                  onChange={(e) => setStepDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && stepDraft.trim()) {
                      e.preventDefault()
                      setV({
                        ...v,
                        steps: [
                          ...v.steps,
                          { id: crypto.randomUUID().slice(0, 8), label: stepDraft.trim(), done: false },
                        ],
                      })
                      setStepDraft('')
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  className="mt-1.5"
                  disabled={!stepDraft.trim() || v.steps.length >= 12}
                  onClick={() => {
                    setV({
                      ...v,
                      steps: [
                        ...v.steps,
                        { id: crypto.randomUUID().slice(0, 8), label: stepDraft.trim(), done: false },
                      ],
                    })
                    setStepDraft('')
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          <div className="bg-surface-muted space-y-4 rounded-xl p-4">
            <Switch
              id="c-private"
              label="Private to mentors"
              description="Sensitive notes are never visible to the student and never appear in reports."
              checked={v.visibility === 'PRIVATE_MENTOR'}
              onCheckedChange={(c) =>
                setV({
                  ...v,
                  visibility: c ? 'PRIVATE_MENTOR' : 'SHARED',
                  include_in_report: c ? false : v.include_in_report,
                })
              }
            />
            <Switch
              id="c-report"
              label="Include in PDF report"
              description="Appears under “Mentoring records” in the student report."
              checked={v.include_in_report}
              disabled={v.visibility === 'PRIVATE_MENTOR'}
              onCheckedChange={(c) => setV({ ...v, include_in_report: c })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Optimistic status change with Undo (UX2-07). */
function StatusSelect({ item, run }: { item: Recommendation; run: ReturnType<typeof useAction> }) {
  const [value, setValue] = useSyncedState(item.status)
  return (
    <Select
      id="rec-status"
      label="Status"
      value={value}
      onChange={async (e) => {
        const prev = value
        const next = e.target.value as Recommendation['status']
        setValue(next)
        const label = STATUS_OPTIONS.find((o) => o.value === next)?.label ?? next
        const ok = await run(
          () => setRecommendationStatus(item.id, next),
          `Marked ${label.toLowerCase()}`,
          () => setRecommendationStatus(item.id, prev),
        )
        if (!ok) setValue(prev)
      }}
      options={STATUS_OPTIONS}
    />
  )
}
