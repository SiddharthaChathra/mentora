import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * MB-21 scoping matrix: real signed-in clients (never the service role) × every student-data table × branch.
 * Requires: pnpm db:seed && pnpm db:seed:demo && pnpm exec tsx tests/fixtures/multibranch.seed.ts
 * Writes the allow/deny table to test-results/rls-matrix.md for E2E_REPORT.md.
 */
type DB = SupabaseClient<Database>
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const D = 'e2e.mentora.test'
const fresh = () => createClient<Database>(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
async function signIn(email: string, password: string) {
  const c = fresh()
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return { db: c, id: data.user.id }
}

const BRANCHES = ['CSE', 'ECE', 'ME'] as const
type Code = (typeof BRANCHES)[number]
const dept: Record<string, string> = {}
const studentsOf: Record<string, string[]> = {}
const semestersOf: Record<string, string[]> = {}
const actors: Record<string, { db: DB; id: string }> = {}
const report: string[] = []
let ramesh: string
let a1: string
let b1: string
let t1: string
let mEce2: string

// Tables whose rows carry the (trigger-filled) branch column.
const BRANCH_TABLES = ['academic_semesters', 'mentor_assignments', 'mentor_recommendations', 'record_change_requests', 'mentoring_sessions', 'learning_resources'] as const

async function countIn(c: DB, table: string, col: string, ids: string[]) {
  if (!ids.length) return 0
  let n = 0
  for (let i = 0; i < ids.length; i += 150) {
    const { count } = await (c.from(table as 'users').select('*', { count: 'exact', head: true }) as unknown as { in: (c: string, v: string[]) => Promise<{ count: number | null }> }).in(col, ids.slice(i, i + 150))
    n += count ?? 0
  }
  return n
}

/** Visible rows per branch for one table, plus the ground truth from the service role. */
async function perBranch(c: DB, table: string): Promise<Record<Code, { seen: number; total: number }>> {
  const out = {} as Record<Code, { seen: number; total: number }>
  for (const b of BRANCHES) {
    const [col, ids] =
      table === 'users' || table === 'student_profiles'
        ? [table === 'users' ? 'id' : 'user_id', studentsOf[b]!]
        : table === 'student_subject_results' || table === 'semester_summaries'
          ? ['academic_semester_id', semestersOf[b]!]
          : ['department_id', [dept[b]!]]
    out[b] = { seen: await countIn(c, table, col, ids), total: await countIn(admin, table, col, ids) }
  }
  return out
}

const STUDENT_TABLES = ['users', 'student_profiles', 'student_subject_results', 'semester_summaries', ...BRANCH_TABLES]

beforeAll(async () => {
  const { data: depts } = await admin.from('departments').select('id, code')
  for (const d of depts ?? []) dept[d.code] = d.id
  for (const b of BRANCHES) {
    const { data: st } = await admin.from('users').select('id').eq('role', 'MENTEE').eq('department_id', dept[b]!)
    studentsOf[b] = (st ?? []).map((s) => s.id)
    const { data: se } = await admin.from('academic_semesters').select('id').eq('department_id', dept[b]!)
    semestersOf[b] = (se ?? []).map((s) => s.id)
  }
  const E2E = process.env.E2E_PASSWORD!
  actors.P = await signIn(`principal@${D}`, E2E)
  actors.HOD_CSE = await signIn(process.env.SEED_HOD_EMAIL!, process.env.SEED_HOD_PASSWORD!)
  actors.HOD_ECE = await signIn(`hod.ece@${D}`, E2E)
  actors.FORMER_HOD = await signIn(`former.hod@${D}`, E2E)
  actors.SUSPENDED_HOD = await signIn(`suspended.hod@${D}`, E2E)
  actors.M_CSE_1 = await signIn('ramesh.rao@demo.mentora.edu', process.env.DEMO_PASSWORD!)
  actors.M_ECE_1 = await signIn(`m.ece1@${D}`, E2E)
  ramesh = actors.M_CSE_1.id
  const { data: mine } = await admin.from('mentor_assignments').select('student_id, users!mentor_assignments_student_id_fkey(email)').eq('mentor_id', ramesh).is('ended_at', null)
  const demo = (mine ?? []).find((m) => String((m.users as unknown as { email: string }).email).endsWith('@demo.mentora.edu'))!
  a1 = demo.student_id
  actors.A1 = await signIn((demo.users as unknown as { email: string }).email, process.env.DEMO_PASSWORD!)
  actors.M_CSE_2 = await signIn(`m.cse2@${D}`, E2E)
  actors.B1 = await signIn(`b1.ece@${D}`, E2E)
  b1 = actors.B1.id
  t1 = (await admin.from('users').select('id').eq('email', `t1.cse@${D}`).single()).data!.id
  mEce2 = (await admin.from('users').select('id').eq('email', `m.ece2@${D}`).single()).data!.id
  actors.anon = { db: fresh(), id: '' }
})

afterAll(() => {
  mkdirSync('test-results', { recursive: true })
  writeFileSync(
    'test-results/rls-matrix.md',
    ['| Actor | Table | CSE | ECE | ME | Expected |', '|---|---|---|---|---|---|', ...report].join('\n') + '\n',
  )
})

// Branches each actor may read student data from (mentors/mentees: only their own people, checked separately).
const EXPECT: Record<string, Code[] | 'own'> = {
  P: ['CSE', 'ECE', 'ME'],
  HOD_CSE: ['CSE'],
  HOD_ECE: ['ECE'],
  FORMER_HOD: [],
  SUSPENDED_HOD: [],
  M_CSE_1: 'own',
  M_ECE_1: 'own',
  A1: 'own',
  B1: 'own',
  anon: [],
}

describe('read matrix: actor × student-data table × branch', () => {
  for (const actor of Object.keys(EXPECT)) {
    it(`${actor} reads exactly its scope`, async () => {
      const exp = EXPECT[actor]!
      const own: Record<string, Code> = { M_CSE_1: 'CSE', M_ECE_1: 'ECE', A1: 'CSE', B1: 'ECE' }
      for (const table of STUDENT_TABLES) {
        const c = await perBranch(actors[actor]!.db, table)
        report.push(`| ${actor} | ${table} | ${c.CSE.seen}/${c.CSE.total} | ${c.ECE.seen}/${c.ECE.total} | ${c.ME.seen}/${c.ME.total} | ${exp === 'own' ? `own (${own[actor]})` : exp.join(', ') || 'none'} |`)
        for (const b of BRANCHES) {
          const allowed = exp === 'own' ? own[actor] === b : exp.includes(b)
          if (!allowed) expect(c[b].seen, `${actor} must not see ${b} ${table}`).toBe(0)
          else if (exp !== 'own') {
            // Principal never sees PRIVATE_MENTOR notes; everything else in scope is fully visible.
            const total = actor === 'P' && table === 'mentor_recommendations' ? await countPrivate(b, 'SHARED') : c[b].total
            expect(c[b].seen, `${actor} should see all ${b} ${table}`).toBe(total)
          } else expect(c[b].seen).toBeLessThanOrEqual(c[b].total)
        }
      }
    })
  }

  it('the Principal never sees a PRIVATE_MENTOR note; the branch HOD keeps the existing rule', async () => {
    const { count: p } = await actors.P!.db.from('mentor_recommendations').select('id', { count: 'exact', head: true }).eq('visibility', 'PRIVATE_MENTOR')
    expect(p).toBe(0)
    const { count: h } = await actors.HOD_ECE!.db.from('mentor_recommendations').select('id', { count: 'exact', head: true }).eq('visibility', 'PRIVATE_MENTOR')
    expect(h).toBeGreaterThan(0)
  })

  it('counts and totals only include in-scope rows', async () => {
    const { count } = await actors.HOD_CSE!.db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'MENTEE')
    expect(count).toBe(studentsOf.CSE!.length)
    const { count: flagged } = await actors.HOD_CSE!.db.from('mentor_assignments').select('id', { count: 'exact', head: true }).is('ended_at', null)
    const { count: truth } = await admin.from('mentor_assignments').select('id', { count: 'exact', head: true }).is('ended_at', null).eq('department_id', dept.CSE!)
    expect(flagged).toBe(truth)
  })

  it('ended or suspended HODs see nothing beyond their own row', async () => {
    for (const a of ['FORMER_HOD', 'SUSPENDED_HOD']) {
      const { data } = await actors[a]!.db.from('users').select('id')
      expect((data ?? []).map((u) => u.id).filter((id) => id !== actors[a]!.id)).toHaveLength(0)
      for (const t of ['audit_logs', 'student_branch_transfers', 'intervention_followups'] as const) {
        const { count } = await actors[a]!.db.from(t).select('*', { count: 'exact', head: true })
        expect(count ?? 0, `${a} ${t}`).toBe(0)
      }
    }
  })

  it('a branch without an HOD (ME) is visible only to the Principal and its own people', async () => {
    for (const a of ['HOD_CSE', 'HOD_ECE', 'M_CSE_1']) {
      expect(await countIn(actors[a]!.db, 'academic_semesters', 'department_id', [dept.ME!]), a).toBe(0)
    }
    expect(await countIn(actors.P!.db, 'academic_semesters', 'department_id', [dept.ME!])).toBeGreaterThan(0)
  })

  it('audit log: HOD sees only their branch, the Principal sees all', async () => {
    const { data } = await actors.HOD_CSE!.db.from('audit_logs').select('department_id').limit(1000)
    expect(new Set((data ?? []).map((r) => r.department_id))).toEqual(new Set([dept.CSE]))
    const { count: all } = await actors.P!.db.from('audit_logs').select('id', { count: 'exact', head: true })
    const { count: truth } = await admin.from('audit_logs').select('id', { count: 'exact', head: true })
    expect(all).toBe(truth)
  })
})

async function countPrivate(code: Code, visibility: 'SHARED' | 'PRIVATE_MENTOR') {
  const { count } = await admin.from('mentor_recommendations').select('id', { count: 'exact', head: true }).eq('department_id', dept[code]!).eq('visibility', visibility)
  return count ?? 0
}

describe('writes that try to cross a branch', () => {
  it('HOD_CSE cannot change an ECE record, and cannot move a CSE record into ECE', async () => {
    const { data: sem } = await admin.from('academic_semesters').select('id').eq('student_id', b1).limit(1).single()
    const { data } = await actors.HOD_CSE!.db.from('academic_semesters').update({ manual_sgpa: 9.9 }).eq('id', sem!.id).select('id')
    expect(data ?? []).toHaveLength(0)
    const { data: own } = await admin.from('academic_semesters').select('id').eq('department_id', dept.CSE!).eq('status', 'DRAFT').limit(1).single()
    await actors.HOD_CSE!.db.from('academic_semesters').update({ department_id: dept.ECE! } as never).eq('id', own!.id)
    const { data: after } = await admin.from('academic_semesters').select('department_id').eq('id', own!.id).single()
    expect(after!.department_id).toBe(dept.CSE)
  })

  it('HOD_CSE cannot add an ECE subject', async () => {
    const { error } = await actors.HOD_CSE!.db.from('subjects').insert({ department_id: dept.ECE!, code: 'HACK101', name: 'Cross branch', credits: 3, created_by: actors.HOD_CSE!.id, is_verified: true })
    expect(error).not.toBeNull()
  })

  it('cross-branch mentor assignments are refused (RPC and the MB_CROSS_BRANCH trigger)', async () => {
    const r1 = await actors.HOD_CSE!.db.rpc('assign_students', { p_student_ids: [b1], p_mentor: ramesh })
    expect(r1.error).not.toBeNull()
    const { data: a3 } = await admin.from('users').select('id').eq('email', `a3.cse@${D}`).single()
    const { data: mEce1 } = await admin.from('users').select('id').eq('email', `m.ece1@${D}`).single()
    const r2 = await actors.HOD_CSE!.db.rpc('assign_students', { p_student_ids: [a3!.id], p_mentor: mEce1!.id })
    expect(r2.error).not.toBeNull()
    const r3 = await admin.from('mentor_assignments').insert({ student_id: a3!.id, mentor_id: mEce1!.id })
    expect(r3.error?.message).toMatch(/MB_CROSS_BRANCH/)
  })

  it('the Principal cannot write student data', async () => {
    const P = actors.P!.db
    const { data: sem } = await admin.from('academic_semesters').select('id, student_id').eq('student_id', b1).limit(1).single()
    expect((await P.from('academic_semesters').update({ status: 'FINALIZED' }).eq('id', sem!.id).select('id')).data ?? []).toHaveLength(0)
    expect((await P.from('student_profiles').update({ full_name: 'Hacked' }).eq('user_id', b1).select('user_id')).data ?? []).toHaveLength(0)
    expect((await P.from('mentor_recommendations').insert({ student_id: b1, mentor_id: actors.P!.id, kind: 'FEEDBACK', title: 'x' })).error).not.toBeNull()
    expect((await P.rpc('assign_students', { p_student_ids: [b1], p_mentor: null as unknown as string })).error).not.toBeNull()
    const { data: cr } = await admin.from('record_change_requests').select('id').eq('student_id', b1).eq('status', 'PENDING').limit(1).maybeSingle()
    if (cr) expect((await P.rpc('review_change_request', { p_id: cr.id, p_approve: true })).error).not.toBeNull()
  })

  it('branch structure is the Principal’s: HODs cannot rename branches or appoint HODs', async () => {
    const { data } = await actors.HOD_CSE!.db.from('departments').update({ name: 'Hacked' }).eq('id', dept.CSE!).select('id')
    expect(data ?? []).toHaveLength(0)
    expect((await actors.HOD_CSE!.db.rpc('appoint_hod', { p_department: dept.ECE!, p_user: actors.HOD_CSE!.id })).error).not.toBeNull()
    const { data: ok } = await actors.P!.db.from('departments').update({ display_order: 4 }).eq('code', 'ECE').select('id')
    expect(ok).toHaveLength(1)
  })

  it('storage: cross-branch resource files are denied to HODs and mentors, readable by the Principal', async () => {
    const { data: res } = await admin.from('learning_resources').select('file_path').eq('student_id', b1).not('file_path', 'is', null).limit(1).single()
    expect((await actors.HOD_CSE!.db.storage.from('resources').download(res!.file_path!)).error).not.toBeNull()
    expect((await actors.M_CSE_1!.db.storage.from('resources').download(res!.file_path!)).error).not.toBeNull()
    expect((await actors.P!.db.storage.from('resources').download(res!.file_path!)).error).toBeNull()
    expect((await actors.HOD_ECE!.db.storage.from('resources').download(res!.file_path!)).error).toBeNull()
  })
})

describe('revocation', () => {
  it('changing an HOD revokes the old HOD on the next request and grants the new one', async () => {
    const P = actors.P!.db
    expect((await P.rpc('appoint_hod', { p_department: dept.ECE!, p_user: mEce2, p_reason: 'revocation test' })).error).toBeNull()
    expect(await countIn(actors.HOD_ECE!.db, 'academic_semesters', 'department_id', [dept.ECE!])).toBe(0)
    const newHod = await signIn(`m.ece2@${D}`, process.env.E2E_PASSWORD!)
    expect(await countIn(newHod.db, 'academic_semesters', 'department_id', [dept.ECE!])).toBeGreaterThan(0)
    // Restore: HOD_ECE heads ECE again, M_ECE_2 goes back to mentoring.
    expect((await P.rpc('appoint_hod', { p_department: dept.ECE!, p_user: actors.HOD_ECE!.id, p_reason: 'restore' })).error).toBeNull()
    expect((await P.rpc('set_user_role', { p_user: mEce2, p_role: 'MENTOR' })).error).toBeNull()
    expect(await countIn(actors.HOD_ECE!.db, 'academic_semesters', 'department_id', [dept.ECE!])).toBeGreaterThan(0)
    expect(await countIn(newHod.db, 'academic_semesters', 'department_id', [dept.ECE!])).toBe(0)
  })

  it('a branch transfer moves the student and their history, ends the mentor link and revokes old access', async () => {
    const { data: req, error } = await actors.HOD_CSE!.db.rpc('request_branch_transfer', { p_student: t1, p_to: dept.ECE!, p_reason: 'revocation test' })
    expect(error).toBeNull()
    expect((await actors.HOD_ECE!.db.rpc('decide_branch_transfer', { p_id: req as string, p_approve: true })).error).not.toBeNull()
    expect((await actors.P!.db.rpc('decide_branch_transfer', { p_id: req as string, p_approve: true, p_note: 'ok' })).error).toBeNull()
    expect((await admin.from('users').select('department_id').eq('id', t1).single()).data!.department_id).toBe(dept.ECE)
    expect((await admin.from('mentor_assignments').select('id').eq('student_id', t1).is('ended_at', null)).data).toHaveLength(0)
    expect(await countIn(actors.HOD_CSE!.db, 'academic_semesters', 'student_id', [t1])).toBe(0)
    expect(await countIn(actors.M_CSE_2!.db, 'academic_semesters', 'student_id', [t1])).toBe(0)
    expect(await countIn(actors.HOD_ECE!.db, 'academic_semesters', 'student_id', [t1])).toBeGreaterThan(0)
    expect(await countIn(actors.HOD_ECE!.db, 'mentor_recommendations', 'student_id', [t1])).toBeGreaterThan(0)
    const { count: audited } = await admin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('entity_type', 'student_branch_transfers').eq('entity_id', req as string)
    expect(audited).toBeGreaterThan(0)
    // Restore for the next run.
    expect((await actors.P!.db.rpc('move_student_branch', { p_student: t1, p_to: dept.CSE!, p_reason: 'restore fixture' })).error).toBeNull()
  })

  it('a branch with active students cannot be archived', async () => {
    const { error } = await actors.P!.db.from('departments').update({ status: 'ARCHIVED' }).eq('code', 'ME')
    expect(error?.message).toMatch(/active students or staff/)
  })
})
