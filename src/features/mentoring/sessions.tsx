'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { CalendarCheck2, CalendarPlus, ChevronLeft, ChevronRight, ClipboardCheck, List, Pencil, Plus, X, XCircle } from 'lucide-react'
import { cn, fmtDate } from '@/lib/utils'
import { MODE_LABEL } from '@/lib/labels'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { ConfirmDialog, Dialog, DialogContent, Sheet, SheetContent } from '@/components/ui/overlay'
import { Pill, StatusPill } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/navigation'
import { EmptyState } from '@/components/ui/states'
import { cancelSession, completeSession, createSession, updateSession } from '@/server/actions/mentoring'
import type { Session } from '@/server/services/mentoring'
import { MiniCalendar } from '@/components/charts/dashboard'
import { SessionCard } from './cards'

export function SessionsWorkspace({
  sessions,
  viewer,
  mentees = [],
  fixedStudentId,
}: {
  sessions: Session[]
  viewer: 'MENTEE' | 'MENTOR' | 'HOD'
  mentees?: { id: string; name: string | null }[]
  fixedStudentId?: string
}) {
  const sp = useSearchParams()
  const [view, setView] = React.useState<'agenda' | 'calendar'>('agenda')
  const [month, setMonth] = React.useState(() => new Date())
  const [openId, setOpenId] = React.useState<string | null>(sp.get('item'))
  const [editor, setEditor] = React.useState<{ open: boolean; edit?: Session }>({ open: sp.get('new') === '1' && viewer === 'MENTOR' })
  const [completing, setCompleting] = React.useState<Session | null>(null)
  const [day, setDay] = React.useState<Date | null>(null)
  const [now] = React.useState(() => Date.now())
  const inDay = (s: Session) => !day || isSameDay(new Date(s.scheduledAt), day)
  const upcomingAll = sessions.filter((s) => s.status === 'SCHEDULED' && new Date(s.scheduledAt).getTime() >= now - 2 * 3600_000).sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
  const upcoming = upcomingAll.filter(inDay)
  const past = sessions.filter((s) => !upcomingAll.includes(s) && inDay(s)).sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))
  const open = sessions.find((s) => s.id === openId) ?? null
  const isMentor = viewer === 'MENTOR'

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Sessions view"
          value={view}
          onChange={setView}
          options={[
            { value: 'agenda', label: 'Agenda', icon: List },
            { value: 'calendar', label: 'Calendar', icon: CalendarCheck2 },
          ]}
        />
        {isMentor && (
          <Button onClick={() => setEditor({ open: true })}>
            <Plus /> Schedule session
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          illustration="no-sessions"
          title="No sessions yet"
          description={isMentor ? 'Schedule a one-to-one or a group session with your mentees.' : 'When your mentor schedules a session it will appear here.'}
          action={isMentor && <Button onClick={() => setEditor({ open: true })}>Schedule the first session</Button>}
        />
      ) : view === 'agenda' ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {day && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
                Showing {fmtDate(day, 'EEEE d MMMM')}
                <button type="button" onClick={() => setDay(null)} className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-50 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100">
                  <X className="size-3.5" /> Show all
                </button>
              </p>
            )}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">
                Upcoming <span className="num text-sm font-medium text-ink-500">{upcoming.length}</span>
              </h2>
              {upcoming.length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-line-strong p-6 text-center text-sm text-ink-500">Nothing scheduled{day ? ' on this day' : ''}.</p>
              ) : (
                <ul className="grid gap-3 xl:grid-cols-2">
                  {upcoming.map((s, i) => (
                    <li key={s.id}>
                      <button type="button" className={cn('w-full rounded-[20px] p-3 text-left transition-shadow', i === 0 && !day ? 'bg-tile-blue shadow-2 hover:shadow-3' : 'bg-surface shadow-2 hover:shadow-3')} onClick={() => setOpenId(s.id)}>
                        <SessionCard session={s} showStudent={viewer !== 'MENTEE'} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">
                Past & completed <span className="num text-sm font-medium text-ink-500">{past.length}</span>
              </h2>
              {past.length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-line-strong p-6 text-center text-sm text-ink-500">No past sessions{day ? ' on this day' : ''}.</p>
              ) : (
                <ul className="space-y-3">
                  {past.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => setOpenId(s.id)} className="w-full rounded-[20px] bg-surface p-4 text-left shadow-2 hover:shadow-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900">{s.agenda || 'Mentoring session'}</p>
                            <p className="mt-0.5 text-sm text-ink-500">
                              {fmtDate(s.scheduledAt, 'EEE d MMM yyyy, h:mm a')}
                              {viewer !== 'MENTEE' && ` · ${s.studentName ?? s.groupName ?? 'Group'}`}
                            </p>
                          </div>
                          <StatusPill status={s.status === 'SCHEDULED' ? 'PENDING' : s.status} label={s.status === 'SCHEDULED' ? 'Needs summary' : undefined} />
                        </div>
                        {s.summary && <p className="mt-2 line-clamp-2 text-sm text-ink-700">{s.summary}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <aside className="order-first space-y-3 lg:order-none lg:col-span-4" aria-label="Session calendar">
            <div className="lg:sticky lg:top-28">
              <MiniCalendar marked={sessions.filter((s) => s.status !== 'CANCELLED').map((s) => format(new Date(s.scheduledAt), 'yyyy-MM-dd'))} selected={day ?? undefined} onSelect={(d) => setDay(day && isSameDay(d, day) ? null : d)} />
              <p className="mt-3 px-2 text-xs text-ink-500">Dots mark days with sessions. Select a day to filter; select it again to clear.</p>
            </div>
          </aside>
        </div>
      ) : (
        <MonthGrid month={month} setMonth={setMonth} sessions={sessions} onOpen={setOpenId} />
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <SheetContent title={open.agenda || 'Mentoring session'} description={fmtDate(open.scheduledAt, 'EEEE d MMMM yyyy, h:mm a')}>
            <SessionDetail
              s={open}
              viewer={viewer}
              onEdit={() => setEditor({ open: true, edit: open })}
              onComplete={() => setCompleting(open)}
              onClosed={() => setOpenId(null)}
            />
          </SheetContent>
        )}
      </Sheet>

      {isMentor && (
        <SessionEditor key={`${editor.edit?.id ?? 'new'}-${editor.open}`} open={editor.open} onOpenChange={(o) => setEditor((e) => ({ ...e, open: o }))} edit={editor.edit} mentees={mentees} fixedStudentId={fixedStudentId} />
      )}
      {completing && <CompleteDialog s={completing} onClose={() => setCompleting(null)} />}
    </div>
  )
}

function MonthGrid({ month, setMonth, sessions, onOpen }: { month: Date; setMonth: (d: Date) => void; sessions: Session[]; onOpen: (id: string) => void }) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
  return (
    <div className="rounded-xl bg-surface p-4 shadow-2 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold tracking-tight text-2xl text-ink-900">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const list = sessions.filter((s) => isSameDay(new Date(s.scheduledAt), d))
          const today = isSameDay(d, new Date())
          return (
            <div key={d.toISOString()} className={cn('min-h-16 rounded-lg p-1.5 text-left sm:min-h-24', isSameMonth(d, month) ? 'bg-surface-muted' : 'opacity-40')}>
              <span className={cn('num inline-grid size-6 place-items-center rounded-full text-xs', today ? 'bg-primary-600 font-semibold text-white' : 'text-ink-700')}>{format(d, 'd')}</span>
              <ul className="mt-1 space-y-1">
                {list.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(s.id)}
                      className={cn(
                        'w-full truncate rounded-md px-1.5 py-1 text-left text-[0.6875rem] font-medium',
                        s.status === 'COMPLETED' ? 'bg-success-100 text-success-700' : s.status === 'CANCELLED' ? 'bg-surface-muted text-ink-500 line-through' : 'bg-primary-100 text-primary-700',
                      )}
                      aria-label={`${format(new Date(s.scheduledAt), 'h:mm a')} ${s.studentName ?? s.agenda}`}
                    >
                      <span className="hidden sm:inline">{format(new Date(s.scheduledAt), 'h:mm')} </span>
                      {s.studentName?.split(' ')[0] ?? s.groupName ?? 'Session'}
                    </button>
                  </li>
                ))}
                {list.length > 3 && <li className="text-[0.625rem] text-ink-500">+{list.length - 3} more</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionDetail({ s, viewer, onEdit, onComplete, onClosed }: { s: Session; viewer: string; onEdit: () => void; onComplete: () => void; onClosed: () => void }) {
  const router = useRouter()
  const [cancel, setCancel] = React.useState(false)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill status={s.status} />
        <Pill tone="outline">{MODE_LABEL[s.mode]}</Pill>
        <Pill tone="outline">{s.durationMin} min</Pill>
      </div>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="eyebrow">With</dt>
          <dd className="mt-1 text-ink-900">{viewer === 'MENTEE' ? s.mentorName : (s.studentName ?? s.groupName ?? 'All mentees')}</dd>
        </div>
        {s.location && (
          <div>
            <dt className="eyebrow">{s.mode === 'ONLINE' ? 'Link' : 'Location'}</dt>
            <dd className="mt-1 break-words text-ink-900">
              {/^https?:\/\//.test(s.location) ? (
                <a className="text-primary-600 underline-offset-4 hover:underline" href={s.location} target="_blank" rel="noreferrer noopener">
                  {s.location}
                </a>
              ) : (
                s.location
              )}
            </dd>
          </div>
        )}
        {s.agenda && (
          <div>
            <dt className="eyebrow">Agenda</dt>
            <dd className="mt-1 whitespace-pre-line text-ink-700">{s.agenda}</dd>
          </div>
        )}
      </dl>
      {s.status === 'COMPLETED' && (
        <section className="rounded-xl bg-surface-muted p-4">
          <h3 className="text-sm font-semibold text-ink-900">Summary</h3>
          <p className="mt-1.5 text-sm whitespace-pre-line text-ink-700">{s.summary}</p>
          {s.actionItems.length > 0 && (
            <>
              <h4 className="mt-4 text-sm font-semibold text-ink-900">Agreed action items</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {s.actionItems.map((a, i) => (
                  <li key={i}>
                    {a.title}
                    {a.due_date && <span className="text-ink-500"> · due {fmtDate(a.due_date, 'd MMM')}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {s.nextFollowUp && <p className="mt-3 text-sm text-ink-700">Next follow-up: {fmtDate(s.nextFollowUp)}</p>}
        </section>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        {s.status === 'SCHEDULED' && (
          <a href={`/api/sessions/${s.id}/ics`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <CalendarPlus /> Add to calendar
          </a>
        )}
        {viewer === 'MENTOR' && s.status === 'SCHEDULED' && (
          <>
            <Button size="sm" onClick={onComplete}>
              <ClipboardCheck /> Record summary
            </Button>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil /> Reschedule
            </Button>
            <Button size="sm" variant="ghost" className="text-danger-700" onClick={() => setCancel(true)}>
              <XCircle /> Cancel
            </Button>
          </>
        )}
      </div>
      <ConfirmDialog
        open={cancel}
        onOpenChange={setCancel}
        title="Cancel this session?"
        description="Students will be notified."
        destructive
        confirmLabel="Cancel session"
        onConfirm={async () => {
          const res = await cancelSession(s.id)
          if (res.ok) {
            toast.success('Session cancelled')
            setCancel(false)
            onClosed()
            router.refresh()
          } else toast.error(res.error.message)
        }}
      />
    </div>
  )
}

const toLocalInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3600_000)
  if (!iso) d.setMinutes(0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SessionEditor({
  open,
  onOpenChange,
  edit,
  mentees,
  fixedStudentId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  edit?: Session
  mentees: { id: string; name: string | null }[]
  fixedStudentId?: string
}) {
  const router = useRouter()
  const [v, setV] = React.useState({
    student_id: edit?.studentId ?? fixedStudentId ?? '',
    scheduled_at: toLocalInput(edit?.scheduledAt),
    duration_min: String(edit?.durationMin ?? 30),
    mode: edit?.mode ?? 'IN_PERSON',
    location_or_link: edit?.location ?? '',
    agenda: edit?.agenda ?? '',
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  const submit = async () => {
    setBusy(true)
    const payload = { ...v, scheduled_at: new Date(v.scheduled_at).toISOString() }
    const res = edit ? await updateSession(edit.id, payload) : await createSession(payload)
    setBusy(false)
    if (!res.ok) {
      setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
      toast.error(res.error.message)
      return
    }
    toast.success(edit ? 'Session updated — students notified' : 'Session scheduled — students notified')
    onOpenChange(false)
    router.refresh()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={edit ? 'Reschedule session' : 'Schedule a session'}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              {edit ? 'Save' : 'Schedule'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!fixedStudentId && !edit && (
            <Select id="s-student" label="With" value={v.student_id} onChange={(e) => setV({ ...v, student_id: e.target.value })} options={mentees.map((m) => ({ value: m.id, label: m.name ?? 'Unnamed' }))} placeholder="All my mentees (group)" />
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Input id="s-when" type="datetime-local" label="Date & time" value={v.scheduled_at} onChange={(e) => setV({ ...v, scheduled_at: e.target.value })} error={errors.scheduled_at} required />
            <Select
              id="s-dur"
              label="Duration"
              value={v.duration_min}
              onChange={(e) => setV({ ...v, duration_min: e.target.value })}
              options={[15, 30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min` }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <Select id="s-mode" label="Mode" value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value as 'IN_PERSON' | 'ONLINE' })} options={[{ value: 'IN_PERSON', label: 'In person' }, { value: 'ONLINE', label: 'Online' }]} />
            <Input id="s-loc" label={v.mode === 'ONLINE' ? 'Meeting link' : 'Location'} value={v.location_or_link} onChange={(e) => setV({ ...v, location_or_link: e.target.value })} />
          </div>
          <Textarea id="s-agenda" label="Agenda" rows={3} value={v.agenda} onChange={(e) => setV({ ...v, agenda: e.target.value })} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CompleteDialog({ s, onClose }: { s: Session; onClose: () => void }) {
  const router = useRouter()
  const [summary, setSummary] = React.useState('')
  const [items, setItems] = React.useState<{ title: string; due_date: string }[]>([])
  const [next, setNext] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Record session summary"
        description="Action items become tracked action points for the student."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true)
                const res = await completeSession({ id: s.id, summary, action_items: items.filter((i) => i.title.trim()), next_follow_up_date: next })
                setBusy(false)
                if (!res.ok) {
                  setErrors(Object.fromEntries(Object.entries(res.error.fieldErrors ?? {}).map(([k, m]) => [k, m[0] ?? ''])))
                  toast.error(res.error.message)
                  return
                }
                toast.success('Session completed')
                onClose()
                router.refresh()
              }}
            >
              Complete session
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea id="cs-summary" label="What did you discuss?" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} error={errors.summary} required />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-900">Action items</p>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_150px_auto] items-start gap-2">
                <Input id={`ai-${i}`} label="Action" value={it.title} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Input id={`ai-d-${i}`} type="date" label="Due" value={it.due_date} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" className="mt-1.5" aria-label="Remove action item" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </div>
            ))}
            {items.length < 10 && (
              <Button variant="soft" size="sm" onClick={() => setItems([...items, { title: '', due_date: '' }])}>
                <Plus /> Add action item
              </Button>
            )}
          </div>
          <Input id="cs-next" type="date" label="Next follow-up date" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
