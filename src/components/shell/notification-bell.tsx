'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { cn, fmtRelative } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks'
import { browserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger, Sheet, SheetContent } from '@/components/ui/overlay'
import { EmptyState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/primitives'
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from '@/server/actions/shell'

/** Shared cache key so the notification center can refresh the badge after inline actions. */
export const notificationsKey = (userId: string) => ['notifications', userId] as const

export function NotificationBell({ userId }: { userId: string }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = React.useState(false)
  const [pulse, setPulse] = React.useState(false)
  const router = useRouter()
  const qc = useQueryClient()
  const key = React.useMemo(() => notificationsKey(userId), [userId])
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await listNotifications()
      if (!res.ok) throw new Error(res.error.message)
      return res.data
    },
  })
  const items = data?.items ?? null
  const unread = data?.unread ?? 0
  const patch = React.useCallback(
    (fn: (d: { items: NotificationItem[]; unread: number }) => { items: NotificationItem[]; unread: number }) => qc.setQueryData<{ items: NotificationItem[]; unread: number }>(key, (d) => (d ? fn(d) : d)),
    [qc, key],
  )

  React.useEffect(() => {
    const supabase = browserClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as NotificationItem
        patch((d) => ({ items: [n, ...d.items].slice(0, 20), unread: d.unread + 1 }))
        setPulse(true)
        setTimeout(() => setPulse(false), 2400)
        router.refresh()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, patch, router])

  const openItem = async (n: NotificationItem) => {
    if (!n.read_at) {
      patch((d) => ({ items: d.items.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)), unread: Math.max(0, d.unread - 1) }))
      void markNotificationRead(n.id)
    }
    setOpen(false)
  }

  const readAll = async () => {
    patch((d) => ({ items: d.items.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })), unread: 0 }))
    await markAllNotificationsRead()
  }

  const trigger = (
    <button
      type="button"
      onClick={() => !isDesktop && setOpen(true)}
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className="relative grid size-11 place-items-center rounded-full bg-surface-muted text-ink-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
    >
      <Bell className={cn('size-5', pulse && 'animate-[pulse-ring_1.2s]')} strokeWidth={1.75} />
      {unread > 0 && (
        <span className="num absolute top-1 right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger-500 px-1 text-[0.625rem] font-bold text-white ring-2 ring-surface">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )

  const body = <NotificationList items={items} unread={unread} onOpen={openItem} onReadAll={readAll} />

  if (isDesktop)
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" className="w-[400px] p-0">
          {body}
        </PopoverContent>
      </Popover>
    )
  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Notifications" className="max-w-none">
          <div className="-m-5">{body}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function NotificationList({
  items,
  unread,
  onOpen,
  onReadAll,
}: {
  items: NotificationItem[] | null
  unread: number
  onOpen: (n: NotificationItem) => void
  onReadAll: () => void
}) {
  const today = new Date().toDateString()
  const groups = [
    { label: 'Today', list: (items ?? []).filter((n) => new Date(n.created_at).toDateString() === today) },
    { label: 'Earlier', list: (items ?? []).filter((n) => new Date(n.created_at).toDateString() !== today) },
  ].filter((g) => g.list.length)
  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">
          Notifications {unread > 0 && <span className="num ml-1 text-ink-500">· {unread} new</span>}
        </p>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={onReadAll}>
            <CheckCheck /> Mark all read
          </Button>
        )}
      </div>
      <div className="max-h-[70dvh] overflow-y-auto">
        {items == null ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-2 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState compact illustration="no-notifications" title="You're all caught up" description="New feedback, resources and updates will appear here." />
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <p className="eyebrow px-4 pt-3 pb-1">{g.label}</p>
              <ul>
                {g.list.map((n) => {
                  const inner = (
                    <>
                      <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-accent-500')} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm', n.read_at ? 'text-ink-700' : 'font-medium text-ink-900')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-500">{n.body}</span>}
                        <span className="mt-1 block text-[0.6875rem] text-ink-500">{fmtRelative(n.created_at)}</span>
                      </span>
                      {!n.read_at && <span className="sr-only">Unread</span>}
                    </>
                  )
                  const cls = 'flex gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted'
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => onOpen(n)} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => onOpen(n)} className={cn(cls, 'w-full')}>
                          {inner}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-line p-2">
        <Link href="/notifications" className="flex h-10 items-center justify-center rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50">
          View all notifications
        </Link>
      </div>
    </div>
  )
}
