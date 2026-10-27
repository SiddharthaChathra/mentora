'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { AppError, badRequest, check, handle, must } from '@/server/handle'
import { rateLimit } from '@/server/rate-limit'
import { inviteUser as adminInvite, resendInvite as adminResend, setAuthBan } from '@/server/admin/users'
import { writeSummary } from '@/server/services/academics'
import { validateScheme } from '@/lib/grading'
import { assignSchema, gradingSchemeSchema, inviteSchema, subjectSchema, thresholdsSchema } from '@/lib/validators'

const refreshHod = () => {
  revalidatePath('/hod', 'layout')
  revalidatePath('/principal', 'layout')
}

// ───────────────────────────── Users & roles ─────────────────────────────
export async function inviteUser(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD', 'PRINCIPAL')
    await rateLimit(`invite:${actor.id}`, 60, 60 * 60_000)
    const v = inviteSchema.parse(input)
    const res = await adminInvite(actor, v)
    if (actor.role === 'PRINCIPAL' && v.role === 'HOD' && v.appoint && v.department_id) {
      const db = await createClient()
      check(await db.rpc('appoint_hod', { p_department: v.department_id, p_user: res.id, p_reason: 'Appointed on invitation' }))
    }
    refreshHod()
    return res
  })
}

export async function resendInvite(userId: string) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD', 'PRINCIPAL')
    await rateLimit(`invite:${actor.id}`, 60, 60 * 60_000)
    await adminResend(actor, z.uuid().parse(userId))
    return null
  })
}

export async function changeRole(userId: string, role: string) {
  return handle(async () => {
    await actorOrThrow('HOD', 'PRINCIPAL')
    const db = await createClient()
    check(await db.rpc('set_user_role', { p_user: z.uuid().parse(userId), p_role: z.enum(['MENTEE', 'MENTOR']).parse(role) }))
    refreshHod()
    return null
  })
}

export async function changeStatus(userId: string, status: string) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD', 'PRINCIPAL')
    const id = z.uuid().parse(userId)
    const s = z.enum(['ACTIVE', 'SUSPENDED']).parse(status)
    const db = await createClient()
    check(await db.rpc('set_user_status', { p_user: id, p_status: s }))
    await setAuthBan(actor, id, s === 'SUSPENDED')
    refreshHod()
    return null
  })
}

// ───────────────────────────── Assignments ─────────────────────────────
export type AssignmentChange = { student_id: string; previous_mentor_id: string | null }

export async function assignStudents(input: unknown) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const v = assignSchema.parse(input)
    const db = await createClient()
    const res = await db.rpc('assign_students', { p_student_ids: v.student_ids, p_mentor: v.mentor_id as string, p_reason: v.reason ?? '', p_group: v.group_name ?? '' })
    check(res)
    refreshHod()
    revalidatePath('/mentor', 'layout')
    return ((res.data as { changed: AssignmentChange[] } | null)?.changed ?? []) as AssignmentChange[]
  })
}

export async function undoAssignments(changes: AssignmentChange[]) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const list = z.array(z.object({ student_id: z.uuid(), previous_mentor_id: z.uuid().nullable() })).max(500).parse(changes)
    const db = await createClient()
    const res = await db.rpc('restore_assignments', { p_previous: list })
    check(res)
    refreshHod()
    return res.data ?? 0
  })
}

// ───────────────────────────── Interventions ─────────────────────────────
export async function requestFollowups(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD')
    const v = z.object({ student_ids: z.array(z.uuid()).min(1).max(200), note: z.string().trim().min(3, 'Add a short note for the mentor').max(1000) }).parse(input)
    const db = await createClient()
    const { data: assigns } = await db.from('mentor_assignments').select('student_id, mentor_id').in('student_id', v.student_ids).is('ended_at', null)
    if (!assigns?.length) throw badRequest('None of the selected students has a mentor yet. Assign mentors first.')
    check(await db.from('intervention_followups').insert(assigns.map((a) => ({ student_id: a.student_id, mentor_id: a.mentor_id, requested_by: actor.id, note: v.note }))))
    revalidatePath('/hod/interventions')
    return { requested: assigns.length, skipped: v.student_ids.length - assigns.length }
  })
}

// ───────────────────────────── Settings ─────────────────────────────
/**
 * Saving a scheme creates a new version; finalized history keeps its own snapshot.
 * Principal: the college default (department_id NULL). HOD: their branch override — RLS only allows it while
 * the Principal has "Allow branch-specific grading" switched on.
 */
export async function saveGradingScheme(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD', 'PRINCIPAL')
    const dept = actor.role === 'PRINCIPAL' ? null : actor.departmentId!
    const v = gradingSchemeSchema.parse(input)
    const scheme = { bands: v.bands, pass_pct: v.pass_pct, mse_weight: v.mse_weight, see_weight: Number((1 - v.mse_weight).toFixed(3)), max_grade_points: 10 }
    const problems = validateScheme(scheme)
    if (problems.length) throw new AppError('VALIDATION', problems[0]!, { bands: problems })
    const db = await createClient()
    const own = <Q extends { eq: (c: 'department_id', v: string) => Q; is: (c: 'department_id', v: null) => Q }>(q: Q) => (dept ? q.eq('department_id', dept) : q.is('department_id', null))
    const { data: latest } = await own(db.from('grading_schemes').select('version')).order('version', { ascending: false }).limit(1).maybeSingle()
    check(await own(db.from('grading_schemes').update({ active: false })).eq('active', true))
    const row = must(
      await db
        .from('grading_schemes')
        .insert({ department_id: dept, name: v.name, version: (latest?.version ?? 0) + 1, ...scheme, active: true, created_by: actor.id })
        .select('id, version')
        .single(),
    )
    revalidatePath('/', 'layout')
    return row
  })
}

/** Recompute stored SGPA/CGPA snapshots. Drafts by default; 'all' rewrites verified snapshots too (explicit + audited). */
export async function recomputeSummaries(scope: 'drafts' | 'all') {
  return handle(async () => {
    const actor = await actorOrThrow('HOD')
    const s = z.enum(['drafts', 'all']).parse(scope)
    const db = await createClient()
    const statuses = s === 'all' ? (['DRAFT', 'SUBMITTED', 'VERIFIED'] as const) : (['DRAFT', 'SUBMITTED'] as const)
    const { data: sems } = await db.from('academic_semesters').select('id, student_id').in('status', [...statuses]).limit(5000)
    let n = 0
    for (const sem of sems ?? []) {
      await writeSummary(db, sem.student_id, sem.id, actor.departmentId)
      n++
    }
    await db.from('audit_logs').insert({ actor_id: actor.id, action: 'grading.recompute', entity_type: 'semester_summaries', entity_id: s, after: { recomputed: n, scope: s } })
    revalidatePath('/', 'layout')
    return { recomputed: n }
  })
}

export async function saveThresholds(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD', 'PRINCIPAL')
    const dept = actor.role === 'PRINCIPAL' ? null : actor.departmentId!
    const v = thresholdsSchema.parse(input)
    const db = await createClient()
    check(
      await db
        .from('risk_thresholds')
        .upsert(Object.entries(v).map(([rule_key, value]) => ({ department_id: dept, rule_key, value, updated_by: actor.id, updated_at: new Date().toISOString() })), { onConflict: 'department_id,rule_key' }),
    )
    revalidatePath('/', 'layout')
    return null
  })
}

/** College-wide settings: the Principal only. */
export async function saveAppSettings(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('PRINCIPAL')
    const v = z
      .object({
        institution_name: z.string().trim().min(2).max(120).optional(),
        program_total_credits: z.coerce.number().int().min(1).max(400).nullable().optional(),
        optional_profile_fields: z.object({ dob: z.boolean(), gender: z.boolean(), address: z.boolean() }).optional(),
        attendance_category_enabled: z.boolean().optional(),
        ai_insights_enabled: z.boolean().optional(),
      })
      .parse(input)
    const db = await createClient()
    const rows = Object.entries(v)
      .filter(([, val]) => val !== undefined)
      .map(([key, value]) => ({ key, value: value as never, updated_by: actor.id, updated_at: new Date().toISOString() }))
    if (rows.length) check(await db.from('app_settings').upsert(rows, { onConflict: 'key' }))
    revalidatePath('/', 'layout')
    return null
  })
}

export async function saveCollegeSettings(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('PRINCIPAL')
    const v = z
      .object({
        allowBranchGrading: z.boolean(),
        selfSignup: z.boolean(),
        studentEmailDomain: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$|^$/, 'Enter a domain like college.edu.in'),
      })
      .parse(input)
    const db = await createClient()
    const at = new Date().toISOString()
    check(
      await db.from('app_settings').upsert(
        [
          { key: 'allow_branch_grading', value: v.allowBranchGrading, updated_by: actor.id, updated_at: at },
          { key: 'self_signup', value: v.selfSignup, updated_by: actor.id, updated_at: at },
          { key: 'student_email_domain', value: v.studentEmailDomain as never, updated_by: actor.id, updated_at: at },
        ],
        { onConflict: 'key' },
      ),
    )
    revalidatePath('/', 'layout')
    return null
  })
}

export async function saveSection(name: string) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD')
    const db = await createClient()
    check(await db.from('sections').insert({ department_id: actor.departmentId!, name: z.string().trim().toUpperCase().min(1).max(20).parse(name) }))
    revalidatePath('/hod/settings')
    return null
  })
}

export async function deleteSection(id: string) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const db = await createClient()
    const { count } = await db.from('student_profiles').select('user_id', { count: 'exact', head: true }).eq('section_id', z.uuid().parse(id))
    if (count) throw badRequest(`${count} student${count === 1 ? ' is' : 's are'} in this section. Move them first.`)
    check(await db.from('sections').delete().eq('id', id))
    revalidatePath('/hod/settings')
    return null
  })
}

export async function saveAcademicYear(input: unknown) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const v = z.object({ label: z.string().regex(/^\d{4}-\d{2}$/), starts_on: z.string(), ends_on: z.string(), is_current: z.boolean() }).parse(input)
    const db = await createClient()
    if (v.is_current) check(await db.from('academic_years').update({ is_current: false }).eq('is_current', true))
    check(await db.from('academic_years').upsert(v, { onConflict: 'label' }))
    revalidatePath('/hod/settings')
    revalidatePath('/principal/settings')
    return null
  })
}

export async function saveSubject(input: unknown, id?: string) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD')
    const v = subjectSchema.parse(input)
    const db = await createClient()
    const row = { department_id: actor.departmentId!, code: v.code, name: v.name, credits: v.credits, semester: v.semester ?? null, mse_max: v.mse_max, see_max: v.see_max, has_mse: v.mse_max != null, has_see: v.see_max != null, is_verified: true }
    if (id) check(await db.from('subjects').update(row).eq('id', z.uuid().parse(id)))
    else check(await db.from('subjects').insert({ ...row, created_by: actor.id }))
    revalidatePath('/hod/settings')
    return null
  })
}

export async function verifySubject(id: string) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const db = await createClient()
    check(await db.from('subjects').update({ is_verified: true }).eq('id', z.uuid().parse(id)))
    revalidatePath('/hod/settings')
    return null
  })
}

export async function setMentorCapacity(mentorId: string, capacity: number) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const db = await createClient()
    const res = await db.from('mentor_profiles').update({ capacity: z.number().int().min(1).max(200).parse(capacity) }).eq('user_id', z.uuid().parse(mentorId)).select('user_id')
    check(res)
    if (!res.data?.length) throw badRequest('Mentor profile not found.')
    refreshHod()
    return null
  })
}
