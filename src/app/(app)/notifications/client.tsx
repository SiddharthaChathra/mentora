'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlarmClockOff, ArrowUpRight, Check, CheckCheck, Clock3, Undo2 } from 'lucide-react'
import { isThisWeek, isToday } from 'date-fns'
import { cn, fmtRelative } from '@/lib/utils'
import { useSyncedState } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/primitives'
import { markAllNotificationsRead, setNotificationRead, snoozeNotification } from '@/server/actions/shell'

export type NotificationRow = { id: string; type: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string; snoozed_until: string | null }

export function MarkAllRead() {
  const router = useRouter()
  const qc = useQueryClient()
  const [busy, setBusy] = React.useState(false)
  return (
    <Button
      variant="secondary"
      loading={busy}
      onClick={async () => {
        setBusy(true)
        const res = await markAllNotificationsRead()
        setBusy(false)
        if (res.ok) {
          toast.success('All caught up')
          router.refresh()
          void qc.invalidateQueries({ queryKey: ['notifications'] })
        }
      }}
    >
      <CheckCheck /> Mark all as read
    </Button>
  )
}

/** UX2-10: grouped list with inline Mark done / Open / Snooze, applied optimistically with Undo. */
export function NotificationList({ items, snoozedView }: { items: NotificationRow[]; snoozedView?: boolean }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [rows, setRows] = useSyncedState(items)
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())
  // Keeps the header bell's badge in step with inline actions here.
  const refresh = () => {
    router.refresh()
    void qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const patch = (id: string, p: Partial<NotificationRow>) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const hide = (id: string, on: boolean) =>
    setHidden((cur) => {
      const next = new Set(cur)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const markDone = async (n: NotificationRow, read: boolean) => {
    const prev = n.read_at
    patch(n.id, { read_at: read ? new Date().toISOString() : null })
    const res = await setNotificationRead(n.id, read)
    if (!res.ok) {
      patch(n.id, { read_at: prev })
      return toast.error(res.error.message)
    }
    refresh()
    toast.success(read ? 'Marked done' : 'Marked unread', {
      action: {
        label: 'Undo',
        onClick: async () => {
          patch(n.id, { read_at: prev })
          await setNotificationRead(n.id, !read)
          refresh()
        },
      },
    })
  }

  const snooze = async (n: NotificationRow, on: boolean) => {
    hide(n.id, true)
    const res = await snoozeNotification(n.id, on)
    if (!res.ok) {
      hide(n.id, false)
      return toast.error(res.error.message)
    }
    refresh()
    toast.success(on ? 'Snoozed until this time tomorrow' : 'Back in your notifications', {
      action: {
        label: 'Undo',
        onClick: async () => {
          hide(n.id, false)
          await snoozeNotification(n.id, !on)
          refresh()
        },
      },
    })
  }

  const visible = rows.filter((r) => !hidden.has(r.id))
  const groups = snoozedView
    ? [{ label: 'Snoozed', list: visible }]
    : [
        { label: 'Today', list: visible.filter((n) => isToday(new Date(n.created_at))) },
        { label: 'This week', list: visible.filter((n) => !isToday(new Date(n.created_at)) && isThisWeek(new Date(n.created_at), { weekStartsOn: 1 })) },
        { label: 'Earlier', list: visible.filter((n) => !isThisWeek(new Date(n.created_at), { weekStartsOn: 1 })) },
      ]

  return (
    <div className="space-y-6">
      {groups
        .filter((g) => g.list.length)
        .map((g) => (
          <section key={g.label} aria-labelledby={`g-${g.label}`}>
            <h2 id={`g-${g.label}`} className="eyebrow mb-2">
              {g.label} <span className="num text-ink-400">· {g.list.length}</span>
            </h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line/70">
                {g.list.map((n) => (
                  <li key={n.id} className={cn('group flex flex-col gap-3 px-4 py-4 transition-colors sm:flex-row sm:items-start sm:px-5', !n.read_at && 'bg-primary-50/40')}>
                    <span aria-hidden className={cn('mt-2 hidden size-2 shrink-0 rounded-full sm:block', n.read_at ? 'bg-transparent' : 'bg-primary-600')} />
                    <div className="min-w-0 flex-1">
                      <p className={cn(n.read_at ? 'text-ink-700' : 'font-semibold text-ink-900')}>
                        {!n.read_at && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-sm text-ink-500">{n.body}</p>}
                      <p className="mt-1 text-xs text-ink-500">
                        {fmtRelative(n.created_at)}
                        {snoozedView && n.snoozed_until && ` · wakes ${fmtRelative(n.snoozed_until)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => !n.read_at && void setNotificationRead(n.id, true)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-50 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                        >
                          Open <ArrowUpRight className="size-3.5" />
                        </Link>
                      )}
                      {n.read_at ? (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => markDone(n, false)}>
                          <Undo2 /> Mark unread
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => markDone(n, true)}>
                          <Check /> Mark done
                        </Button>
                      )}
                      {snoozedView ? (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => snooze(n, false)}>
                          <AlarmClockOff /> Wake now
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => snooze(n, true)} aria-label={`Snooze “${n.title}” for 1 day`}>
                          <Clock3 /> Snooze 1 day
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
    </div>
  )
}
