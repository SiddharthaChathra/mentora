import 'server-only'
import type { DB } from '@/server/supabase'
import type { Actor } from '@/server/authz'

export type ViewEntity = 'recommendation' | 'resource' | 'session' | 'ai_summary'

export async function viewedSet(db: DB, userId: string, entity: ViewEntity, ids: string[]) {
  if (ids.length === 0) return new Set<string>()
  const { data } = await db.from('content_views').select('entity_id').eq('user_id', userId).eq('entity_type', entity).in('entity_id', ids)
  return new Set((data ?? []).map((r) => r.entity_id))
}

/** Sidebar badges: unseen feedback/resources for mentees, pending verifications for mentors. */
export async function shellBadges(db: DB, actor: Actor): Promise<Record<string, number>> {
  if (actor.role === 'MENTEE') {
    const [{ data: recs }, { data: res }] = await Promise.all([
      db.from('mentor_recommendations').select('id').eq('student_id', actor.id).eq('visibility', 'SHARED').limit(500),
      db.from('learning_resources').select('id').limit(500),
    ])
    const recIds = (recs ?? []).map((r) => r.id)
    const resIds = (res ?? []).map((r) => r.id)
    const [seenRecs, seenRes] = await Promise.all([viewedSet(db, actor.id, 'recommendation', recIds), viewedSet(db, actor.id, 'resource', resIds)])
    return { feedback: recIds.filter((id) => !seenRecs.has(id)).length, resources: resIds.filter((id) => !seenRes.has(id)).length }
  }
  if (actor.role === 'MENTOR') {
    const [{ count: subs }, { count: crs }] = await Promise.all([
      db.from('academic_semesters').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      db.from('record_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    ])
    return { verifications: (subs ?? 0) + (crs ?? 0) }
  }
  return {}
}
