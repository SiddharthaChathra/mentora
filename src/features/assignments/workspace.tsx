'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ArrowRight, Columns3, GripVertical, History, MoreHorizontal, Table2, UserX } from 'lucide-react'
import { cn, fmtDate } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox, FilterSelect, Input } from '@/components/ui/field'
import { Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/overlay'
import { Pill } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/navigation'
import { EmptyState } from '@/components/ui/states'
import { assignStudents, undoAssignments } from '@/server/actions/admin'

export type BoardStudent = { id: string; name: string | null; usn: string | null; semester: number | null; section: string | null; mentorId: string | null; risk: 'none' | 'medium' | 'high'; hasAvatar: boolean }
export type BoardMentor = { id: string; name: string; capacity: number; hasAvatar: boolean }
export type HistoryItem = { id: string; studentId: string; studentName: string | null; mentorName: string | null; startedAt: string; endedAt: string | null; reason: string | null; endReason: string | null }

type Pending = { ids: string[]; to: string | null }

export function AssignmentsWorkspace({ students, mentors, history }: { students: BoardStudent[]; mentors: BoardMentor[]; history: HistoryItem[] }) {
  const sp = useSearchParams()
  const [mode, setMode] = React.useState<'board' | 'table' | 'history'>(sp.get('view') === 'table' || sp.get('filter') === 'unassigned' ? 'table' : 'board')
  const [selected, setSelected] = React.useState<string[]>(sp.get('student') ? [sp.get('student')!] : [])
  const [pending, setPending] = React.useState<Pending | null>(null)
  const [optimistic, setOptimistic] = React.useState<Record<string, string | null>>({})
  const mentorName = new Map(mentors.map((m) => [m.id, m.name]))
  const rows = students.map((s) => (s.id in optimistic ? { ...s, mentorId: optimistic[s.id]! } : s))

  const toggle = (id: string, on?: boolean) => setSelected((cur) => ((on ?? !cur.includes(id)) ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)))
  const request = (ids: string[], to: string | null) => {
    const moving = ids.filter((id) => rows.find((r) => r.id === id)?.mentorId !== to)
    if (!moving.length) return toast.info(to ? `Already assigned to ${mentorName.get(to)}` : 'Already unassigned')
    setPending({ ids: moving, to })
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Assignment view"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'board', label: 'Board', icon: Columns3 },
            { value: 'table', label: 'Table', icon: Table2 },
            { value: 'history', label: 'History', icon: History },
          ]}
        />
        {mode !== 'history' && selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-full bg-ink-900 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-3">
            <span className="num">{selected.length} selected</span>
            <ReassignMenu mentors={mentors} onPick={(to) => request(selected, to)} label="Reassign to…" dark />
            <button type="button" onClick={() => setSelected([])} className="h-8 rounded-full px-3 text-white/80 hover:text-white">
              Clear
            </button>
          </div>
        )}
      </div>

      {mode === 'board' && <Board rows={rows} mentors={mentors} selected={selected} toggle={toggle} request={request} />}
      {mode === 'table' && <TableMode rows={rows} mentors={mentors} selected={selected} setSelected={setSelected} request={request} initialFilter={sp.get('filter') === 'unassigned' ? 'unassigned' : (sp.get('mentor') ?? 'all')} />}
      {mode === 'history' && <HistoryList items={history} />}

      {pending && (
        <ConfirmChange
          pending={pending}
          rows={rows}
          mentorName={mentorName}
          mentors={mentors}
          onClose={() => setPending(null)}
          onDone={(changes) => {
            const map = Object.fromEntries(pending.ids.map((id) => [id, pending.to]))
            setOptimistic((o) => ({ ...o, ...map }))
            setSelected([])
            setPending(null)
            return changes
          }}
          revert={(changes) => setOptimistic((o) => ({ ...o, ...Object.fromEntries(changes.map((c) => [c.student_id, c.previous_mentor_id])) }))}
        />
      )}
    </div>
  )
}

function ReassignMenu({ mentors, onPick, label, dark }: { mentors: BoardMentor[]; onPick: (to: string | null) => void; label: string; dark?: boolean }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium', dark ? 'bg-white text-ink-900' : 'border border-line bg-surface text-ink-900 shadow-1')}>
          {label}
        </button>
      </MenuTrigger>
      <MenuContent className="max-h-80 overflow-y-auto">
        <MenuLabel>Move to mentor</MenuLabel>
        {mentors.map((m) => (
          <MenuItem key={m.id} onSelect={() => onPick(m.id)}>
            {m.name}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem icon={UserX} destructive onSelect={() => onPick(null)}>
          Unassign
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

function Board({
  rows,
  mentors,
  selected,
  toggle,
  request,
}: {
  rows: BoardStudent[]
  mentors: BoardMentor[]
  selected: string[]
  toggle: (id: string, on?: boolean) => void
  request: (ids: string[], to: string | null) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))
  const [dragging, setDragging] = React.useState<string | null>(null)
  const onEnd = (e: DragEndEvent) => {
    setDragging(null)
    if (!e.over) return
    const to = e.over.id === 'unassigned' ? null : String(e.over.id)
    const id = String(e.active.id)
    const ids = selected.includes(id) ? selected : [id]
    request(ids, to)
  }
  const draggingRow = rows.find((r) => r.id === dragging)
  const columns: { id: string; title: string; mentor?: BoardMentor }[] = [{ id: 'unassigned', title: 'Unassigned' }, ...mentors.map((m) => ({ id: m.id, title: m.name, mentor: m }))]
  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragging(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
      <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {columns.map((c) => (
          <Column key={c.id} id={c.id} title={c.title} mentor={c.mentor} rows={rows.filter((r) => (c.id === 'unassigned' ? !r.mentorId : r.mentorId === c.id))} selected={selected} toggle={toggle} mentors={mentors} request={request} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2,0.8,0.2,1)' }}>
        {draggingRow ? (
          <div className="relative">
            <StudentChip s={draggingRow} lifted />
            {selected.includes(draggingRow.id) && selected.length > 1 && (
              <span className="num absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white shadow-2">{selected.length}</span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  id,
  title,
  mentor,
  rows,
  selected,
  toggle,
  mentors,
  request,
}: {
  id: string
  title: string
  mentor?: BoardMentor
  rows: BoardStudent[]
  selected: string[]
  toggle: (id: string, on?: boolean) => void
  mentors: BoardMentor[]
  request: (ids: string[], to: string | null) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const over = mentor && rows.length > mentor.capacity
  return (
    <section
      ref={setNodeRef}
      aria-label={`${title}, ${rows.length} students`}
      className={cn(
        'flex w-[280px] shrink-0 snap-start flex-col rounded-xl border bg-surface-muted/70 transition-colors',
        isOver ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-100' : 'border-line/70',
        id === 'unassigned' && 'border-dashed',
      )}
    >
      <header className="rounded-t-xl border-b border-line/70 bg-surface/80 p-3.5">
        <div className="flex items-center gap-2.5">
          {mentor ? <Avatar userId={mentor.id} name={mentor.name} hasImage={mentor.hasAvatar} size="sm" /> : <span className="grid size-9 place-items-center rounded-2xl bg-accent-100 text-accent-700"><UserX className="size-4" /></span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{title}</p>
            <p className={cn('num text-xs', over ? 'font-semibold text-danger-700' : 'text-ink-500')}>
              {rows.length}
              {mentor ? ` / ${mentor.capacity}${over ? ' · over capacity' : ''}` : ' students'}
            </p>
          </div>
        </div>
        {mentor && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className={cn('h-full rounded-full', over ? 'bg-danger-500' : 'bg-gradient-primary')} style={{ width: `${Math.min(100, (rows.length / mentor.capacity) * 100)}%` }} />
          </div>
        )}
      </header>
      <ul className="flex max-h-[60dvh] min-h-32 flex-col gap-2 overflow-y-auto p-2.5">
        {rows.length === 0 && <li className="grid flex-1 place-items-center rounded-lg border border-dashed border-line-strong p-4 text-center text-xs text-ink-500">Drop students here</li>}
        {rows.map((s) => (
          <DraggableStudent key={s.id} s={s} selected={selected.includes(s.id)} toggle={toggle} mentors={mentors} request={request} />
        ))}
      </ul>
    </section>
  )
}

function DraggableStudent({ s, selected, toggle, mentors, request }: { s: BoardStudent; selected: boolean; toggle: (id: string, on?: boolean) => void; mentors: BoardMentor[]; request: (ids: string[], to: string | null) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: s.id })
  return (
    <li ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <div className={cn('group flex items-center gap-2 rounded-lg border bg-surface p-2 shadow-1', selected ? 'border-primary-500 ring-2 ring-primary-100' : 'border-line/70')}>
        <button type="button" {...listeners} {...attributes} aria-label={`Drag ${s.name}`} className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-ink-400 hover:bg-surface-muted hover:text-ink-700 active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
        <Checkbox id={`sel-${s.id}`} label={<span className="sr-only">Select {s.name}</span>} checked={selected} onCheckedChange={(v) => toggle(s.id, v === true)} className="items-center" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{s.name ?? 'New student'}</p>
          <p className="num truncate text-[0.6875rem] text-ink-500">
            {s.usn ?? '—'} · S{s.semester ?? '?'}
            {s.section ? ` · ${s.section}` : ''}
          </p>
        </div>
        {s.risk !== 'none' && <span className={cn('size-2 shrink-0 rounded-full', s.risk === 'high' ? 'bg-danger-500' : 'bg-warning-500')} title={s.risk === 'high' ? 'High priority' : 'Watch'} />}
        <Menu>
          <MenuTrigger asChild>
            <button type="button" aria-label={`Move ${s.name}`} className="grid size-8 shrink-0 place-items-center rounded-md text-ink-500 hover:bg-surface-muted">
              <MoreHorizontal className="size-4" />
            </button>
          </MenuTrigger>
          <MenuContent className="max-h-80 overflow-y-auto">
            <MenuLabel>Move {s.name?.split(' ')[0]} to</MenuLabel>
            {mentors.map((m) => (
              <MenuItem key={m.id} disabled={m.id === s.mentorId} onSelect={() => request([s.id], m.id)}>
                {m.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={UserX} destructive disabled={!s.mentorId} onSelect={() => request([s.id], null)}>
              Unassign
            </MenuItem>
            <MenuSeparator />
            <MenuItem asChild>
              <Link href={`/hod/students/${s.id}`}>Open profile</Link>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </li>
  )
}

function StudentChip({ s, lifted }: { s: BoardStudent; lifted?: boolean }) {
  return (
    <div className={cn('flex w-[256px] items-center gap-2 rounded-lg border border-primary-500 bg-surface p-2.5', lifted && 'rotate-2 shadow-3')}>
      <Avatar userId={s.id} name={s.name} hasImage={s.hasAvatar} size="xs" />
      <p className="truncate text-sm font-medium text-ink-900">{s.name}</p>
    </div>
  )
}

function TableMode({
  rows,
  mentors,
  selected,
  setSelected,
  request,
  initialFilter,
}: {
  rows: BoardStudent[]
  mentors: BoardMentor[]
  selected: string[]
  setSelected: (v: string[]) => void
  request: (ids: string[], to: string | null) => void
  initialFilter: string
}) {
  const [mentor, setMentor] = React.useState(initialFilter)
  const [semester, setSemester] = React.useState('all')
  const [section, setSection] = React.useState('all')
  const [q, setQ] = React.useState('')
  const name = new Map(mentors.map((m) => [m.id, m.name]))
  const sections = [...new Set(rows.map((r) => r.section).filter(Boolean))].sort() as string[]
  const shown = rows.filter(
    (r) =>
      (mentor === 'all' || (mentor === 'unassigned' ? !r.mentorId : r.mentorId === mentor)) &&
      (semester === 'all' || String(r.semester) === semester) &&
      (section === 'all' || r.section === section) &&
      (!q || `${r.name} ${r.usn}`.toLowerCase().includes(q.toLowerCase())),
  )
  const allSel = shown.length > 0 && shown.every((r) => selected.includes(r.id))
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input type="search" aria-label="Search students" placeholder="Search name or USN…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm shadow-1 sm:w-64" />
        <FilterSelect label="Mentor" value={mentor} onChange={(e) => setMentor(e.target.value)} options={[{ value: 'all', label: 'All mentors' }, { value: 'unassigned', label: 'Unassigned only' }, ...mentors.map((m) => ({ value: m.id, label: m.name }))]} />
        <FilterSelect label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} options={[{ value: 'all', label: 'All semesters' }, ...Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))]} />
        <FilterSelect label="Section" value={section} onChange={(e) => setSection(e.target.value)} options={[{ value: 'all', label: 'All sections' }, ...sections.map((s) => ({ value: s, label: `Section ${s}` }))]} />
      </div>
      {shown.length === 0 ? (
        <EmptyState illustration="no-results" title="No students match" description="Change the filters." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-2">
          <div className="flex items-center gap-3 border-b border-line bg-surface-muted px-4 py-2.5">
            <Checkbox id="t-all" label={`Select ${shown.length} shown`} checked={allSel} onCheckedChange={(v) => setSelected(v ? [...new Set([...selected, ...shown.map((r) => r.id)])] : selected.filter((id) => !shown.some((r) => r.id === id)))} />
          </div>
          <ul className="divide-y divide-line/70">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Checkbox id={`t-${r.id}`} label={<span className="sr-only">Select {r.name}</span>} checked={selected.includes(r.id)} onCheckedChange={(v) => setSelected(v ? [...selected, r.id] : selected.filter((x) => x !== r.id))} />
                <Avatar userId={r.id} name={r.name} hasImage={r.hasAvatar} size="xs" />
                <div className="min-w-0 flex-1">
                  <Link href={`/hod/students/${r.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-primary-700">
                    {r.name ?? 'New student'}
                  </Link>
                  <p className="num text-xs text-ink-500">
                    {r.usn} · Sem {r.semester ?? '—'} · {r.section ?? '—'}
                  </p>
                </div>
                <span className="text-sm text-ink-700">{r.mentorId ? name.get(r.mentorId) : <Pill tone="accent">Unassigned</Pill>}</span>
                <ReassignMenu mentors={mentors} onPick={(to) => request([r.id], to)} label="Change" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function HistoryList({ items }: { items: HistoryItem[] }) {
  if (!items.length) return <EmptyState illustration="no-mentees" title="No assignment history yet" description="Every assignment and reassignment will be recorded here permanently." />
  return (
    <ol className="space-y-2">
      {items.map((h) => (
        <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-2">
          <span className={cn('size-2.5 rounded-full', h.endedAt ? 'bg-ink-400' : 'bg-success-500')} />
          <Link href={`/hod/students/${h.studentId}`} className="font-medium text-ink-900 hover:text-primary-700">
            {h.studentName ?? 'Student'}
          </Link>
          <ArrowRight className="size-4 text-ink-400" />
          <span className="text-ink-700">{h.mentorName ?? 'Mentor'}</span>
          <span className="text-xs text-ink-500">
            {fmtDate(h.startedAt)} → {h.endedAt ? fmtDate(h.endedAt) : 'current'}
            {h.reason ? ` · ${h.reason}` : ''}
            {h.endReason ? ` · ended: ${h.endReason}` : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ConfirmChange({
  pending,
  rows,
  mentorName,
  mentors,
  onClose,
  onDone,
  revert,
}: {
  pending: Pending
  rows: BoardStudent[]
  mentorName: Map<string, string>
  mentors: BoardMentor[]
  onClose: () => void
  onDone: (changes: { student_id: string; previous_mentor_id: string | null }[]) => void
  revert: (changes: { student_id: string; previous_mentor_id: string | null }[]) => void
}) {
  const router = useRouter()
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const moving = rows.filter((r) => pending.ids.includes(r.id))
  const from = [...new Set(moving.map((r) => r.mentorId))]
  const fromLabel = from.length === 1 ? (from[0] ? mentorName.get(from[0]) : 'Unassigned') : `${from.length} mentors`
  const toLabel = pending.to ? mentorName.get(pending.to) : 'Unassigned'
  const target = pending.to ? mentors.find((m) => m.id === pending.to) : null
  const after = target ? rows.filter((r) => r.mentorId === target.id).length + moving.length : 0
  const n = moving.length
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Move ${n} student${n === 1 ? '' : 's'}`}
        description={`From ${fromLabel} to ${toLabel}.`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true)
                const res = await assignStudents({ student_ids: pending.ids, mentor_id: pending.to, reason: reason || undefined })
                setBusy(false)
                if (!res.ok) return toast.error(res.error.message)
                const changes = res.data
                onDone(changes)
                router.refresh()
                toast.success(`Moved ${n} student${n === 1 ? '' : 's'} to ${toLabel}`, {
                  description: 'Previous mentors lost access immediately.',
                  duration: 10_000,
                  action: {
                    label: 'Undo',
                    onClick: async () => {
                      const u = await undoAssignments(changes)
                      if (u.ok) {
                        revert(changes)
                        router.refresh()
                        toast.success('Change undone')
                      } else toast.error(u.error.message)
                    },
                  },
                })
              }}
            >
              Confirm move
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl bg-surface-muted p-3 text-sm">
            {moving.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-ink-900">{r.name}</span>
                <span className="shrink-0 text-xs text-ink-500">{r.mentorId ? mentorName.get(r.mentorId) : 'Unassigned'}</span>
              </li>
            ))}
          </ul>
          {target && after > target.capacity && (
            <p className="rounded-lg bg-warning-100 px-3 py-2 text-sm text-warning-700">
              {target.name} will have {after} mentees — above their capacity of {target.capacity}.
            </p>
          )}
          <Input id="assign-reason" label="Reason (optional, recorded in history)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="text-xs text-ink-500">Students and both mentors are notified. The change is audited and can be undone for 10 seconds.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
