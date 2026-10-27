import 'server-only'
import type { DB } from '@/server/supabase'
import type { Actor } from '@/server/authz'
import { inScope } from '@/lib/scope'
import { loadRoster } from './roster'

export type MentorRow = {
  id: string
  name: string | null
  email: string
  avatarPath: string | null
  designation: string | null
  facultyId: string | null
  expertise: string[]
  capacity: number
  status: string
  mentees: string[]
  activity30: number
  lastActivity: string | null
}

/** All mentees + mentors of the HOD's own branch. */
export async function loadDepartment(db: DB, actor: Actor, scope: number | null = null) {
  return loadBranchData(db, actor.departmentId!, scope)
}

/**
 * All mentees + mentors of one branch. RLS still decides what comes back (HOD: own branch only,
 * Principal: any branch); the explicit branch filter keeps a Principal's view to the branch asked for.
 * With a semester scope, the roster and each mentor's mentee list cover only students currently in that semester.
 */
export async function loadBranchData(db: DB, departmentId: string, scope: number | null = null) {
  const [{ data: students }, { data: mentorUsers }, { data: assignments }] = await Promise.all([
    db.from('users').select('id').eq('role', 'MENTEE').eq('department_id', departmentId).neq('status', 'SUSPENDED'),
    db.from('users').select('id, email, status').eq('role', 'MENTOR').eq('department_id', departmentId),
    db.from('mentor_assignments').select('student_id, mentor_id').is('ended_at', null).eq('department_id', departmentId),
  ])
  const mentorIds = (mentorUsers ?? []).map((m) => m.id)
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ data: profiles }, { data: recs }, { data: sessions }] = await Promise.all([
    mentorIds.length ? db.from('mentor_profiles').select('*').in('user_id', mentorIds) : Promise.resolve({ data: [] }),
    mentorIds.length ? db.from('mentor_recommendations').select('mentor_id, created_at').in('mentor_id', mentorIds).gte('created_at', since) : Promise.resolve({ data: [] }),
    mentorIds.length ? db.from('mentoring_sessions').select('mentor_id, scheduled_at, status').in('mentor_id', mentorIds).gte('scheduled_at', since) : Promise.resolve({ data: [] }),
  ])
  const pBy = new Map((profiles ?? []).map((p) => [p.user_id, p]))
  const menteesBy = new Map<string, string[]>()
  for (const a of assignments ?? []) menteesBy.set(a.mentor_id, [...(menteesBy.get(a.mentor_id) ?? []), a.student_id])
  const act = new Map<string, { n: number; last: string | null }>()
  const bump = (id: string, at: string) => {
    const cur = act.get(id) ?? { n: 0, last: null }
    cur.n++
    if (!cur.last || at > cur.last) cur.last = at
    act.set(id, cur)
  }
  for (const r of recs ?? []) bump(r.mentor_id, r.created_at)
  for (const s of sessions ?? []) if (s.status === 'COMPLETED') bump(s.mentor_id, s.scheduled_at)

  const mentors: MentorRow[] = (mentorUsers ?? [])
    .map((m) => {
      const p = pBy.get(m.id)
      return {
        id: m.id,
        name: p?.full_name ?? null,
        email: m.email,
        avatarPath: p?.avatar_path ?? null,
        designation: p?.designation ?? null,
        facultyId: p?.faculty_id ?? null,
        expertise: p?.expertise ?? [],
        capacity: p?.capacity ?? 20,
        status: m.status,
        mentees: menteesBy.get(m.id) ?? [],
        activity30: act.get(m.id)?.n ?? 0,
        lastActivity: act.get(m.id)?.last ?? null,
      }
    })
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))

  const roster = inScope(await loadRoster(db, (students ?? []).map((s) => s.id), departmentId), scope)
  if (!scope) return { roster, mentors }
  const inRoster = new Set(roster.map((r) => r.id))
  return { roster, mentors: mentors.map((m) => ({ ...m, mentees: m.mentees.filter((id) => inRoster.has(id)) })) }
}
