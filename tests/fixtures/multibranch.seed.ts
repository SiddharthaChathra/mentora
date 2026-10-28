/**
 * Multi-branch E2E fixture (dev DB only, idempotent). All passwords = E2E_PASSWORD.
 * Run after `pnpm db:seed && pnpm db:seed:demo`:  pnpm exec tsx tests/fixtures/multibranch.seed.ts
 *
 * Branches: CSE (existing demo data, HOD_CSE = the seeded HOD), ECE (HOD_ECE), ME (no HOD), ARCHV (archived, empty).
 * People:   P (Principal), HOD_CSE, HOD_ECE, FORMER_HOD (ISE, appointment ended), SUSPENDED_HOD (AIML, suspended),
 *           M_CSE_1 (the demo mentor with mentees A1, A2), M_CSE_2 (mentor of T1 only), M_ECE_1 (B1), M_ECE_2, M_ME_1 (C1),
 *           A1, A2 (CSE demo mentees), A3 (CSE, unassigned), B1 (ECE), C1 (ME), T1 (CSE, moved to ECE by tests).
 * Each fixture student has DRAFT/VERIFIED/FINALIZED semesters, SHARED + PRIVATE_MENTOR records, a resource file,
 * a session and a change request.
 */
import { admin, ensureAuthUser, env, must } from '../../supabase/seed/lib'

const db = admin()
const PW = env('E2E_PASSWORD')
const D = 'e2e.mentora.test'
export const FIXTURE = {
  principal: `principal@${D}`,
  hodEce: `hod.ece@${D}`,
  formerHod: `former.hod@${D}`,
  suspendedHod: `suspended.hod@${D}`,
  mCse2: `m.cse2@${D}`,
  mEce1: `m.ece1@${D}`,
  mEce2: `m.ece2@${D}`,
  mMe1: `m.me1@${D}`,
  a3: `a3.cse@${D}`,
  b1: `b1.ece@${D}`,
  c1: `c1.me@${D}`,
  t1: `t1.cse@${D}`,
}

async function branch(code: string, name: string, extra: Record<string, unknown> = {}) {
  return must(await db.from('departments').upsert({ code, name, ...extra }, { onConflict: 'code' }).select('id, code').single(), `branch ${code}`)
}

async function person(email: string, role: 'MENTEE' | 'MENTOR' | 'HOD' | 'PRINCIPAL', dept: string | null, name: string, opts: { status?: 'ACTIVE' | 'SUSPENDED'; usn?: string; semester?: number } = {}) {
  const id = await ensureAuthUser(db, email, PW)
  must(
    await db.from('users').upsert({ id, email, role, status: opts.status ?? 'ACTIVE', department_id: dept, onboarding_completed_at: new Date().toISOString() }, { onConflict: 'id' }),
    `user ${email}`,
  )
  if (role === 'MENTEE') {
    must(await db.from('student_profiles').upsert({ user_id: id, full_name: name, usn: opts.usn, current_semester: opts.semester ?? 4, program: 'B.E.', admission_year: 2023, phone: '+91 90000 00000', profile_completion: 90 }, { onConflict: 'user_id' }), `profile ${email}`)
  } else if (role === 'MENTOR') {
    must(await db.from('mentor_profiles').upsert({ user_id: id, full_name: name, designation: 'Assistant Professor', capacity: 20 }, { onConflict: 'user_id' }), `profile ${email}`)
  } else {
    must(await db.from('hod_profiles').upsert({ user_id: id, full_name: name, designation: role === 'PRINCIPAL' ? 'Principal' : 'Professor & Head' }, { onConflict: 'user_id' }), `profile ${email}`)
  }
  return id
}

async function appoint(dept: string, userId: string) {
  await db.from('department_heads').update({ ended_at: new Date().toISOString(), end_reason: 'fixture reset' }).eq('department_id', dept).is('ended_at', null).neq('user_id', userId)
  await db.from('department_heads').update({ ended_at: new Date().toISOString(), end_reason: 'fixture reset' }).eq('user_id', userId).is('ended_at', null).neq('department_id', dept)
  const { data } = await db.from('department_heads').select('id').eq('department_id', dept).eq('user_id', userId).is('ended_at', null).maybeSingle()
  if (!data) must(await db.from('department_heads').insert({ department_id: dept, user_id: userId, reason: 'fixture' }), 'appoint')
}

async function assign(student: string, mentor: string | null) {
  await db.from('mentor_assignments').update({ ended_at: new Date().toISOString(), end_reason: 'fixture reset' }).eq('student_id', student).is('ended_at', null)
  if (mentor) must(await db.from('mentor_assignments').insert({ student_id: student, mentor_id: mentor, reason: 'fixture' }), 'assign')
}

async function subjectsFor(dept: string, code: string) {
  const rows = [1, 2, 3].map((n) => ({ department_id: dept, code: `${code}${n}01`, name: `${code} Core ${n}`, credits: 4, semester: n, mse_max: 50, see_max: 100, is_verified: true }))
  return must(await db.from('subjects').upsert(rows, { onConflict: 'department_id,code' }).select('id, semester'), `subjects ${code}`)
}

/** Three semesters (FINALIZED, VERIFIED, DRAFT), shared + private records, a file resource, a session, a change request. */
async function studentData(student: string, mentor: string | null, subjects: { id: string; semester: number | null }[], tag: string) {
  const statuses = ['FINALIZED', 'VERIFIED', 'DRAFT'] as const
  for (const [i, status] of statuses.entries()) {
    const sem = must(
      await db
        .from('academic_semesters')
        .upsert({ student_id: student, semester_no: i + 1, academic_year: `202${3 + Math.floor(i / 2)}-2${4 + Math.floor(i / 2)}`, status: 'DRAFT' }, { onConflict: 'student_id,semester_no' })
        .select('id')
        .single(),
      'semester',
    )
    const subj = subjects.find((s) => s.semester === i + 1)!
    await db.from('student_subject_results').upsert({ academic_semester_id: sem.id, subject_id: subj.id, attempt: 1, credits: 4, mse_marks: 30 + i * 5, mse_max: 50, see_marks: 55 + i * 8, see_max: 100, result: 'PASS' }, { onConflict: 'academic_semester_id,subject_id,attempt' })
    await db.from('semester_summaries').upsert({ academic_semester_id: sem.id, sgpa: 6.5 + i * 0.5, credits_registered: 4, credits_earned: 4, computed: true })
    const now = new Date().toISOString()
    if (status !== 'DRAFT') must(await db.from('academic_semesters').update({ status, submitted_at: now, verified_at: now, finalized_at: status === 'FINALIZED' ? now : null }).eq('id', sem.id), 'status')
    if (status === 'VERIFIED') {
      const { data: cr } = await db.from('record_change_requests').select('id').eq('academic_semester_id', sem.id).maybeSingle()
      if (!cr) await db.from('record_change_requests').insert({ student_id: student, academic_semester_id: sem.id, target_table: 'academic_semesters', target_id: sem.id, proposed: { manual_sgpa: 7.1 }, reason: `fixture ${tag} correction`, created_by: student })
    }
  }
  if (!mentor) return
  const { count } = await db.from('mentor_recommendations').select('id', { count: 'exact', head: true }).eq('student_id', student)
  if (!count) {
    must(
      await db.from('mentor_recommendations').insert([
        { student_id: student, mentor_id: mentor, kind: 'RECOMMENDATION', title: `Shared note ${tag}`, body: 'Practice past papers.', visibility: 'SHARED' },
        { student_id: student, mentor_id: mentor, kind: 'FEEDBACK', title: `Private note ${tag}`, body: 'Confidential observation.', visibility: 'PRIVATE_MENTOR' },
      ]),
      'recommendations',
    )
    const path = `${mentor}/fixture-${tag}.txt`
    await db.storage.from('resources').upload(path, new Blob([`resource for ${tag}`], { type: 'text/plain' }), { upsert: true })
    must(await db.from('learning_resources').insert({ mentor_id: mentor, student_id: student, title: `Resource ${tag}`, file_path: path, file_name: `fixture-${tag}.txt`, mime: 'text/plain', size_bytes: 20 }), 'resource')
    must(await db.from('mentoring_sessions').insert({ mentor_id: mentor, student_id: student, scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString(), agenda: `Check-in ${tag}` }), 'session')
  }
}

export async function seedMultibranch() {
  const cse = await branch('CSE', 'Computer Science and Engineering')
  const ece = await branch('ECE', 'Electronics and Communication Engineering', { usn_code: 'ec' })
  const me = await branch('ME', 'Mechanical Engineering', { usn_code: 'me' })
  const ise = await branch('ISE', 'Information Science and Engineering', { usn_code: 'is' })
  const aiml = await branch('AIML', 'Artificial Intelligence and Machine Learning', { usn_code: 'ml' })
  await branch('ARCHV', 'Archived Test Branch', { status: 'ARCHIVED', display_order: 99 })
  for (const d of [ece, me]) for (const name of ['A', 'B']) await db.from('sections').upsert({ department_id: d.id, name }, { onConflict: 'department_id,name' })

  const P = await person(FIXTURE.principal, 'PRINCIPAL', null, 'E2E Principal')
  const hodEce = await person(FIXTURE.hodEce, 'HOD', ece.id, 'E2E HOD ECE')
  await appoint(ece.id, hodEce)
  const former = await person(FIXTURE.formerHod, 'HOD', ise.id, 'E2E Former HOD')
  await db.from('department_heads').update({ ended_at: new Date().toISOString(), end_reason: 'fixture: former HOD' }).eq('user_id', former).is('ended_at', null)
  const { data: formerHist } = await db.from('department_heads').select('id').eq('user_id', former).limit(1)
  if (!formerHist?.length) {
    await db.from('department_heads').insert({ department_id: ise.id, user_id: former, reason: 'fixture' })
    await db.from('department_heads').update({ ended_at: new Date().toISOString(), end_reason: 'fixture: former HOD' }).eq('user_id', former).is('ended_at', null)
  }
  const suspended = await person(FIXTURE.suspendedHod, 'HOD', aiml.id, 'E2E Suspended HOD')
  await appoint(aiml.id, suspended)
  await db.from('users').update({ status: 'SUSPENDED' }).eq('id', suspended)
  await db.from('department_heads').update({ ended_at: new Date().toISOString(), end_reason: 'fixture: ME has no HOD' }).eq('department_id', me.id).is('ended_at', null)

  const mCse2 = await person(FIXTURE.mCse2, 'MENTOR', cse.id, 'E2E Mentor CSE 2')
  const mEce1 = await person(FIXTURE.mEce1, 'MENTOR', ece.id, 'E2E Mentor ECE 1')
  await person(FIXTURE.mEce2, 'MENTOR', ece.id, 'E2E Mentor ECE 2')
  const mMe1 = await person(FIXTURE.mMe1, 'MENTOR', me.id, 'E2E Mentor ME 1')

  const a3 = await person(FIXTURE.a3, 'MENTEE', cse.id, 'E2E Asha CSE Three', { usn: 'E2E23CS003' })
  const t1 = await person(FIXTURE.t1, 'MENTEE', cse.id, 'E2E Tarun Transfer', { usn: 'E2E23CS901' })
  // T1 always starts in CSE (the transfer test moves it to ECE).
  if ((await db.from('users').select('department_id').eq('id', t1).single()).data?.department_id !== cse.id) {
    await db.from('mentor_assignments').update({ ended_at: new Date().toISOString(), end_reason: 'fixture reset' }).eq('student_id', t1).is('ended_at', null)
    must(await db.from('users').update({ department_id: cse.id }).eq('id', t1), 'reset T1')
  }
  const b1 = await person(FIXTURE.b1, 'MENTEE', ece.id, 'E2E Bhavya ECE One', { usn: 'E2E23EC001' })
  const c1 = await person(FIXTURE.c1, 'MENTEE', me.id, 'E2E Chetan ME One', { usn: 'E2E23ME001' })

  const { data: mCse1Row } = await db.from('users').select('id').eq('email', 'ramesh.rao@demo.mentora.edu').single()
  const mCse1 = mCse1Row!.id
  await assign(a3, null)
  await assign(t1, mCse2)
  await assign(b1, mEce1)
  await assign(c1, mMe1)

  const [sCse, sEce, sMe] = await Promise.all([subjectsFor(cse.id, 'XCS'), subjectsFor(ece.id, 'XEC'), subjectsFor(me.id, 'XME')])
  await studentData(t1, mCse2, sCse, 'T1')
  await studentData(a3, null, sCse, 'A3')
  await studentData(b1, mEce1, sEce, 'B1')
  await studentData(c1, mMe1, sMe, 'C1')
  for (const [u, t] of [[b1, 'B1'], [c1, 'C1']] as const) {
    const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', u).eq('type', 'fixture')
    if (!count) await db.from('notifications').insert({ user_id: u, type: 'fixture', title: `Fixture notice ${t}` })
  }
  void P
  console.log('✔ Multi-branch fixture ready (CSE, ECE, ME, ARCHV; P, HOD_ECE, FORMER_HOD, SUSPENDED_HOD, mentors, A3, B1, C1, T1)')
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/multibranch.seed.ts')) {
  seedMultibranch().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
