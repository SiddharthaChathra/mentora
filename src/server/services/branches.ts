import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { createTokenClient, type DB } from '@/server/supabase'
import { loadBranchData } from './department'
import { slim, type SlimRoster } from './roster'

export type Branch = {
  id: string
  code: string
  name: string
  usnCode: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  displayOrder: number
  headId: string | null
  headName: string | null
  headSince: string | null
}

/** Every branch with its current HOD (RLS: any active account may read the branch list). */
export const listBranches = cache(async (db: DB, opts: { includeArchived?: boolean } = {}): Promise<Branch[]> => {
  const [{ data: depts }, { data: heads }] = await Promise.all([
    db.from('departments').select('id, code, name, usn_code, status, display_order').order('display_order').order('code'),
    db.from('department_heads').select('department_id, user_id, started_at').is('ended_at', null),
  ])
  const headIds = (heads ?? []).map((h) => h.user_id)
  const { data: names } = headIds.length ? await db.from('hod_profiles').select('user_id, full_name').in('user_id', headIds) : { data: [] }
  const nameBy = new Map((names ?? []).map((n) => [n.user_id, n.full_name]))
  const headBy = new Map((heads ?? []).map((h) => [h.department_id, h]))
  return (depts ?? [])
    .filter((d) => opts.includeArchived || d.status === 'ACTIVE')
    .map((d) => {
      const h = headBy.get(d.id)
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        usnCode: d.usn_code,
        status: d.status,
        displayOrder: d.display_order,
        headId: h?.user_id ?? null,
        headName: h ? (nameBy.get(h.user_id) ?? null) : null,
        headSince: h?.started_at ?? null,
      }
    })
})

export const BRANCH_COOKIE = 'm_branch'

/**
 * The Principal's branch switcher: the URL (?branch=CODE) wins, else the remembered cookie; null = all branches.
 * It only NARROWS what RLS already allows — an unknown code simply means "all branches".
 */
export async function principalBranch(db: DB, override?: string | null): Promise<Branch | null> {
  const code = (override ?? (await cookies()).get(BRANCH_COOKIE)?.value ?? '').trim().toUpperCase()
  if (!code || code === 'ALL') return null
  return (await listBranches(db, { includeArchived: true })).find((b) => b.code === code) ?? null
}

/** Per-branch rosters for the Principal (each branch resolved with its own grading scheme and thresholds). */
export async function loadCollege(db: DB, branches: Branch[], scope: number | null) {
  const parts = await Promise.all(branches.map(async (b) => ({ branch: b, ...(await loadBranchData(db, b.id, scope)) })))
  return parts
}
export type BranchData = Awaited<ReturnType<typeof loadCollege>>[number]

/** A branch roster without the per-semester results: enough for health, lists, flags and workload. */
export type BranchDigest = { branch: Branch; roster: (SlimRoster & { years: string[] })[]; mentors: BranchData['mentors'] }

export const ROSTER_TAG = 'college-roster'

const digestOf = (d: BranchData): BranchDigest => ({
  branch: d.branch,
  mentors: d.mentors,
  roster: d.roster.map((r) => ({ ...slim(r), years: [...new Set(r.semesters.map((s) => s.academicYear))] })),
})

/**
 * College-wide Principal views (overview, students, mentors, interventions) at college size: per-branch digests are
 * cached for 60 s per signed-in session and dropped on writes (revalidateTag(ROSTER_TAG)). The cached loader runs
 * with the caller's own access token, so RLS decides exactly as it does live; the token is part of the cache key.
 */
export async function loadCollegeDigest(db: DB, branches: Branch[], scope: number | null): Promise<BranchDigest[]> {
  const {
    data: { session },
  } = await db.auth.getSession()
  const token = session?.access_token
  if (!token) return (await loadCollege(db, branches, scope)).map(digestOf)
  return Promise.all(
    branches.map((b) =>
      unstable_cache(async () => digestOf({ branch: b, ...(await loadBranchData(createTokenClient(token), b.id, scope)) }), ['branch-digest', b.id, String(scope), token.slice(-32)], {
        revalidate: 60,
        tags: [ROSTER_TAG],
      })(),
    ),
  )
}

/** Branch health numbers derived from a loaded roster (no student ranking — only branch-level aggregates). */
export function branchHealth(d: { roster: Pick<SlimRoster, 'mentorId' | 'risk' | 'latestSgpa' | 'sgpaSeries' | 'onboardingCompletedAt' | 'hasRecords' | 'flags'>[]; mentors: BranchData['mentors'] }) {
  const students = d.roster.length
  const assigned = d.roster.filter((r) => r.mentorId).length
  const flagged = d.roster.filter((r) => r.risk !== 'none')
  const latest = d.roster.map((r) => r.latestSgpa).filter((v): v is number => v != null)
  const prev = d.roster.map((r) => (r.sgpaSeries.length > 1 ? r.sgpaSeries.at(-2)! : null)).filter((v): v is number => v != null)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const lastActivity = d.mentors.map((m) => m.lastActivity).filter(Boolean).sort().at(-1) ?? null
  return {
    students,
    mentors: d.mentors.filter((m) => m.status === 'ACTIVE').length,
    assigned,
    unassigned: students - assigned,
    coverage: students ? Math.round((assigned / students) * 100) : null,
    flagged: flagged.length,
    high: flagged.filter((r) => r.risk === 'high').length,
    incomplete: d.roster.filter((r) => !r.onboardingCompletedAt).length,
    missing: d.roster.filter((r) => !r.hasRecords || r.flags.some((f) => f.key === 'MISSING_RESULTS')).length,
    avgSgpa: avg(latest),
    prevSgpa: avg(prev),
    lastActivity,
  }
}

/** Light per-branch counts (no academics) for cards, pickers and switchers. */
export async function branchCounts(db: DB) {
  const [{ data: people }, { data: active }] = await Promise.all([
    db.from('users').select('department_id, role').in('role', ['MENTEE', 'MENTOR']).neq('status', 'SUSPENDED'),
    db.from('mentor_assignments').select('department_id').is('ended_at', null),
  ])
  const by = new Map<string, { students: number; mentors: number; assigned: number }>()
  const get = (id: string) => by.get(id) ?? (by.set(id, { students: 0, mentors: 0, assigned: 0 }), by.get(id)!)
  for (const p of people ?? []) if (p.department_id) get(p.department_id)[p.role === 'MENTEE' ? 'students' : 'mentors']++
  for (const a of active ?? []) get(a.department_id).assigned++
  return (id: string) => {
    const c = by.get(id) ?? { students: 0, mentors: 0, assigned: 0 }
    return { ...c, coverage: c.students ? Math.round((c.assigned / c.students) * 100) : null }
  }
}
