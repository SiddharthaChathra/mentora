import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Runs against the local Supabase stack with seeded demo data (pnpm db:seed && pnpm db:seed:demo). */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
type DB = SupabaseClient<Database>

const fresh = () => createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
async function signIn(email: string, password: string) {
  const c = fresh()
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return { db: c, id: data.user.id }
}

let hod: { db: DB; id: string }
let mentor: { db: DB; id: string }
let mentee: { db: DB; id: string }
let otherMenteeId: string

beforeAll(async () => {
  hod = await signIn(process.env.SEED_HOD_EMAIL!, process.env.SEED_HOD_PASSWORD!)
  mentor = await signIn('ramesh.rao@demo.mentora.edu', process.env.DEMO_PASSWORD!)
  // A mentee actively assigned to this mentor, and one who is not.
  const { data: mine } = await hod.db.from('mentor_assignments').select('student_id').eq('mentor_id', mentor.id).is('ended_at', null)
  const { data: others } = await hod.db.from('mentor_assignments').select('student_id').neq('mentor_id', mentor.id).is('ended_at', null).limit(1)
  const menteeId = mine![0]!.student_id
  otherMenteeId = others![0]!.student_id
  const { data: u } = await hod.db.from('users').select('email').eq('id', menteeId).single()
  mentee = await signIn(u!.email, process.env.DEMO_PASSWORD!)
})

describe('anonymous', () => {
  it('reads nothing', async () => {
    const anon = fresh()
    for (const t of ['users', 'student_profiles', 'academic_semesters', 'mentor_recommendations', 'notifications'] as const) {
      const { data } = await anon.from(t).select('*').limit(5)
      expect(data ?? []).toHaveLength(0)
    }
  })
})

describe('mentee', () => {
  it('sees only their own profile and records', async () => {
    const { data: own } = await mentee.db.from('student_profiles').select('user_id')
    expect(own?.map((r) => r.user_id)).toEqual([mentee.id])
    const { data: other } = await mentee.db.from('academic_semesters').select('id').eq('student_id', otherMenteeId)
    expect(other ?? []).toHaveLength(0)
    const { data: results } = await mentee.db.from('student_subject_results').select('id, academic_semesters!inner(student_id)').neq('academic_semesters.student_id', mentee.id)
    expect(results ?? []).toHaveLength(0)
  })

  it('never sees private mentor notes', async () => {
    const { data } = await mentee.db.from('mentor_recommendations').select('id').eq('visibility', 'PRIVATE_MENTOR')
    expect(data ?? []).toHaveLength(0)
  })

  it('cannot change their own role', async () => {
    await mentee.db.from('users').update({ role: 'HOD' }).eq('id', mentee.id)
    const { data } = await hod.db.from('users').select('role').eq('id', mentee.id).single()
    expect(data?.role).toBe('MENTEE')
    const { error } = await mentee.db.rpc('set_user_role', { p_user: mentee.id, p_role: 'HOD' })
    expect(error).not.toBeNull()
  })

  it('cannot create notifications or edit their content, but can snooze them', async () => {
    const ins = await mentee.db.from('notifications').insert({ user_id: mentee.id, type: 'x', title: 'spoof' })
    expect(ins.error).not.toBeNull()
    const { data: n } = await mentee.db.from('notifications').select('id, title').limit(1).single()
    if (!n) return
    const edit = await mentee.db.from('notifications').update({ title: 'changed' }).eq('id', n.id)
    expect(edit.error).not.toBeNull()
    const snooze = await mentee.db.from('notifications').update({ snoozed_until: new Date(Date.now() + 60_000).toISOString() }).eq('id', n.id)
    expect(snooze.error).toBeNull()
    await mentee.db.from('notifications').update({ snoozed_until: null }).eq('id', n.id)
  })

  it('cannot edit marks in a verified semester', async () => {
    const { data: r } = await mentee.db
      .from('student_subject_results')
      .select('id, mse_marks, academic_semesters!inner(student_id, status)')
      .eq('academic_semesters.student_id', mentee.id)
      .in('academic_semesters.status', ['VERIFIED', 'FINALIZED'])
      .limit(1)
      .maybeSingle()
    if (!r) return
    await mentee.db.from('student_subject_results').update({ mse_marks: 0 }).eq('id', r.id)
    const { data: after } = await hod.db.from('student_subject_results').select('mse_marks').eq('id', r.id).single()
    expect(after?.mse_marks).toBe(r.mse_marks)
  })

  it('cannot read the audit log', async () => {
    const { data } = await mentee.db.from('audit_logs').select('id').limit(1)
    expect(data ?? []).toHaveLength(0)
  })
})

describe('mentor', () => {
  it('sees active assigned mentees only', async () => {
    const { data: assigned } = await mentor.db.from('student_profiles').select('user_id').eq('user_id', mentee.id)
    expect(assigned).toHaveLength(1)
    const { data: other } = await mentor.db.from('student_profiles').select('user_id').eq('user_id', otherMenteeId)
    expect(other ?? []).toHaveLength(0)
    const { data: otherSem } = await mentor.db.from('academic_semesters').select('id').eq('student_id', otherMenteeId)
    expect(otherSem ?? []).toHaveLength(0)
  })

  it('cannot assign students to themselves', async () => {
    const { error } = await mentor.db.from('mentor_assignments').insert({ student_id: otherMenteeId, mentor_id: mentor.id })
    expect(error).not.toBeNull()
  })

  it('cannot read the audit log', async () => {
    const { data } = await mentor.db.from('audit_logs').select('id').limit(1)
    expect(data ?? []).toHaveLength(0)
  })
})

describe('hod', () => {
  it('sees the whole department', async () => {
    const { count } = await hod.db.from('student_profiles').select('user_id', { count: 'exact', head: true })
    expect(count ?? 0).toBeGreaterThanOrEqual(60)
  })
})

/** A unique USN-shaped local part: 4-letter test prefix, 2-digit year, branch code, 3-digit roll. */
const usn = (branch: string) => `${Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')}23${branch}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

describe('self sign-up', () => {
  it('always creates an ACTIVE MENTEE in the branch named by the USN, whatever the client sends', async () => {
    const c = fresh()
    const local = usn('cs')
    const { data, error } = await c.auth.signUp({ email: `${local}@example.com`, password: 'Signup-Test-123', options: { data: { signup: 'self', full_name: 'Test Student', role: 'HOD', department_id: 'x' } } })
    expect(error).toBeNull()
    const { data: u } = await hod.db.from('users').select('role, status, department_id').eq('id', data.user!.id).single()
    const { data: cse } = await hod.db.from('departments').select('id').eq('code', 'CSE').single()
    expect(u).toEqual({ role: 'MENTEE', status: 'ACTIVE', department_id: cse!.id })
    const { data: p } = await hod.db.from('student_profiles').select('usn, admission_year').eq('user_id', data.user!.id).single()
    expect(p).toEqual({ usn: local.toUpperCase(), admission_year: 2023 })
  })

  it('rejects an email that is not a USN, and a USN for a branch that is not set up', async () => {
    const bad = await fresh().auth.signUp({ email: `not.a.usn.${Date.now()}@example.com`, password: 'Signup-Test-123', options: { data: { signup: 'self' } } })
    expect(bad.error).not.toBeNull()
    const unknown = await fresh().auth.signUp({ email: `${usn('zz')}@example.com`, password: 'Signup-Test-123', options: { data: { signup: 'self' } } })
    expect(unknown.error).not.toBeNull()
  })

  it('creates no app account without the sign-up marker', async () => {
    const c = fresh()
    const { data } = await c.auth.signUp({ email: `rls.raw.${Date.now()}@example.com`, password: 'Signup-Test-123' })
    const { data: u } = await hod.db.from('users').select('id').eq('id', data.user!.id).maybeSingle()
    expect(u).toBeNull()
  })
})

