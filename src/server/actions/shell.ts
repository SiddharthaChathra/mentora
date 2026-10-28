'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { check, handle } from '@/server/handle'
import { awakeFilter } from '@/lib/notifications'

const awake = () => awakeFilter()

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

export async function listNotifications(input: { before?: string; unreadOnly?: boolean } = {}) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const db = await createClient()
    let q = db
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .eq('user_id', actor.id)
      .or(awake())
      .order('created_at', { ascending: false })
      .limit(20)
    if (input.before) q = q.lt('created_at', z.iso.datetime({ offset: true }).parse(input.before))
    if (input.unreadOnly) q = q.is('read_at', null)
    const items = check(await q) as NotificationItem[]
    const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', actor.id).is('read_at', null).or(awake())
    return { items, unread: count ?? 0 }
  })
}

export async function markNotificationRead(id: string) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const db = await createClient()
    check(await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', z.uuid().parse(id)).eq('user_id', actor.id))
    return null
  })
}

/** Undo-able: mark one notification done (read) or back to unread. */
export async function setNotificationRead(id: string, read: boolean) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const db = await createClient()
    check(await db.from('notifications').update({ read_at: read ? new Date().toISOString() : null }).eq('id', z.uuid().parse(id)).eq('user_id', actor.id))
    return null
  })
}

/** UX2-10 Snooze for one day (or un-snooze with `false`). */
export async function snoozeNotification(id: string, snooze: boolean) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const db = await createClient()
    const until = snooze ? new Date(Date.now() + 86_400_000).toISOString() : null
    check(await db.from('notifications').update({ snoozed_until: until }).eq('id', z.uuid().parse(id)).eq('user_id', actor.id))
    return until
  })
}

export async function markAllNotificationsRead() {
  return handle(async () => {
    await actorOrThrow()
    const db = await createClient()
    const { data, error } = await db.rpc('mark_all_notifications_read')
    check({ error })
    revalidatePath('/notifications')
    return data ?? 0
  })
}

export type SearchHit = { id: string; name: string; sub: string; href: string }

/** Command palette search — scoped by RLS to what the actor may see. */
export async function commandSearch(q: string) {
  return handle(async (): Promise<SearchHit[]> => {
    const actor = await actorOrThrow()
    const term = z.string().trim().max(60).parse(q)
    if (term.length < 2 || actor.role === 'MENTEE') return []
    const db = await createClient()
    const like = `%${term.replace(/[%_,()]/g, ' ')}%`
    const { data } = await db
      .from('student_profiles')
      .select('user_id, full_name, usn, current_semester')
      .or(`full_name.ilike.${like},usn.ilike.${like}`)
      .limit(8)
    // RLS decides which rows come back (HOD: own branch, Principal: every branch, mentor: active mentees).
    const base = actor.role === 'PRINCIPAL' ? '/principal/students' : actor.role === 'HOD' ? '/hod/students' : '/mentor/mentees'
    const hits: SearchHit[] = (data ?? []).map((s) => ({
      id: s.user_id,
      name: s.full_name ?? 'Unnamed student',
      sub: [s.usn, s.current_semester ? `Semester ${s.current_semester}` : null].filter(Boolean).join(' · '),
      href: `${base}/${s.user_id}`,
    }))
    if (actor.role === 'HOD' || actor.role === 'PRINCIPAL') {
      const { data: mentors } = await db.from('mentor_profiles').select('user_id, full_name, designation').ilike('full_name', like).limit(5)
      const href = (m: { user_id: string; full_name: string | null }) =>
        actor.role === 'HOD' ? `/hod/mentors/${m.user_id}` : `/principal/mentors?q=${encodeURIComponent(m.full_name ?? '')}`
      hits.push(...(mentors ?? []).map((m) => ({ id: m.user_id, name: m.full_name ?? 'Mentor', sub: m.designation ?? 'Mentor', href: href(m) })))
    }
    return hits
  })
}

export async function signOut(scope: 'local' | 'global' = 'local') {
  const db = await createClient()
  await db.auth.signOut({ scope })
  const jar = await cookies()
  jar.delete('m_lowbw')
  // The semester / branch filters were this person's choice; the next person starts fresh.
  jar.delete('m_sem')
  jar.delete('m_branch')
  redirect('/login?signedOut=1')
}
