import 'server-only'
import type { DB } from '@/server/supabase'
import { computeCgpa } from '@/lib/grading'
import { evaluateRisk, type RiskFlag } from '@/lib/risk'
import { loadManyAcademics, loadThresholds, toEngineInput, toInsightSemesters, type SemesterBundle } from './academics'

export type RosterEntry = {
  id: string
  name: string | null
  usn: string | null
  avatarPath: string | null
  currentSemester: number | null
  sectionId: string | null
  sectionName: string | null
  mentorId: string | null
  mentorName: string | null
  createdAt: string
  onboardingCompletedAt: string | null
  profileCompletion: number
  status: string
  cgpa: number | null
  sgpaSeries: number[]
  latestSgpa: number | null
  semesters: SemesterBundle[]
  flags: RiskFlag[]
  risk: 'none' | 'medium' | 'high'
  openFollowUps: number
  lastSession: string | null
  nextSession: string | null
  submittedCount: number
  hasRecords: boolean
}

/** Batched roster for mentor and HOD views. RLS limits rows to what the caller may see. */
export async function loadRoster(db: DB, studentIds: string[], departmentId: string | null): Promise<RosterEntry[]> {
  if (!studentIds.length) return []
  const chunks: string[][] = []
  for (let i = 0; i < studentIds.length; i += 150) chunks.push(studentIds.slice(i, i + 150))

  const [profiles, users, assignments, recs, sessions] = await Promise.all([
    Promise.all(chunks.map((c) => db.from('student_profiles').select('user_id, full_name, usn, avatar_path, current_semester, section_id, profile_completion, sections(name)').in('user_id', c))),
    Promise.all(chunks.map((c) => db.from('users').select('id, created_at, onboarding_completed_at, status').in('id', c))),
    Promise.all(chunks.map((c) => db.from('mentor_assignments').select('student_id, mentor_id').is('ended_at', null).in('student_id', c))),
    Promise.all(chunks.map((c) => db.from('mentor_recommendations').select('student_id, status, kind, due_date, review_date').in('student_id', c).in('kind', ['GOAL', 'ACTION_POINT']).neq('status', 'COMPLETED'))),
    Promise.all(chunks.map((c) => db.from('mentoring_sessions').select('student_id, scheduled_at, status').in('student_id', c).neq('status', 'CANCELLED'))),
  ])
  const [{ byStudent, scheme }, thresholds] = await Promise.all([loadManyAcademics(db, studentIds, departmentId), loadThresholds(db, departmentId)])

  const pBy = new Map(profiles.flatMap((r) => r.data ?? []).map((p) => [p.user_id, p]))
  const uBy = new Map(users.flatMap((r) => r.data ?? []).map((u) => [u.id, u]))
  const aBy = new Map(assignments.flatMap((r) => r.data ?? []).map((a) => [a.student_id, a.mentor_id]))
  const mentorIds = [...new Set(aBy.values())]
  const { data: mentors } = mentorIds.length ? await db.from('mentor_profiles').select('user_id, full_name').in('user_id', mentorIds) : { data: [] }
  const mName = new Map((mentors ?? []).map((m) => [m.user_id, m.full_name]))
  const today = new Date().toISOString().slice(0, 10)
  const followBy = new Map<string, number>()
  for (const r of recs.flatMap((x) => x.data ?? [])) {
    const due = r.review_date ?? r.due_date
    if (due && due <= today) followBy.set(r.student_id, (followBy.get(r.student_id) ?? 0) + 1)
  }
  const now = Date.now()
  const sessBy = new Map<string, { last: string | null; next: string | null }>()
  for (const s of sessions.flatMap((x) => x.data ?? [])) {
    if (!s.student_id) continue
    const cur = sessBy.get(s.student_id) ?? { last: null, next: null }
    const t = new Date(s.scheduled_at).getTime()
    if (t <= now && (!cur.last || t > new Date(cur.last).getTime())) cur.last = s.scheduled_at
    if (t > now && s.status === 'SCHEDULED' && (!cur.next || t < new Date(cur.next).getTime())) cur.next = s.scheduled_at
    sessBy.set(s.student_id, cur)
  }

  return studentIds.map((id) => {
    const p = pBy.get(id)
    const u = uBy.get(id)
    const semesters = byStudent.get(id) ?? []
    const cg = computeCgpa(semesters.map((s) => ({ semesterNo: s.semesterNo, results: s.results.map(toEngineInput) })), scheme)
    const flags = evaluateRisk(
      { createdAt: u?.created_at ?? new Date().toISOString(), onboardingCompletedAt: u?.onboarding_completed_at ?? null, currentSemester: p?.current_semester ?? null, semesters: toInsightSemesters(semesters) },
      thresholds,
    )
    const series = semesters.filter((s) => s.displaySgpa != null).map((s) => s.displaySgpa!)
    const mentorId = aBy.get(id) ?? null
    return {
      id,
      name: p?.full_name ?? null,
      usn: p?.usn ?? null,
      avatarPath: p?.avatar_path ?? null,
      currentSemester: p?.current_semester ?? null,
      sectionId: p?.section_id ?? null,
      sectionName: (p?.sections as { name: string } | null)?.name ?? null,
      mentorId,
      mentorName: mentorId ? (mName.get(mentorId) ?? null) : null,
      createdAt: u?.created_at ?? '',
      onboardingCompletedAt: u?.onboarding_completed_at ?? null,
      profileCompletion: p?.profile_completion ?? 0,
      status: u?.status ?? 'ACTIVE',
      cgpa: cg.value?.cgpa ?? null,
      sgpaSeries: series,
      latestSgpa: series.at(-1) ?? null,
      semesters,
      flags,
      risk: flags.some((f) => f.severity === 'high') ? 'high' : flags.length ? 'medium' : 'none',
      openFollowUps: followBy.get(id) ?? 0,
      lastSession: sessBy.get(id)?.last ?? null,
      nextSession: sessBy.get(id)?.next ?? null,
      submittedCount: semesters.filter((s) => s.status === 'SUBMITTED').length,
      hasRecords: semesters.length > 0,
    } satisfies RosterEntry
  })
}

/** Light version without semesters for client payloads. */
export function slim(r: RosterEntry) {
  const { semesters: _s, ...rest } = r
  void _s
  return rest
}
export type SlimRoster = ReturnType<typeof slim>
