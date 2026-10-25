'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/server/supabase'
import { actorOrThrow, assertCanViewStudent } from '@/server/authz'
import { AppError, badRequest, check, forbidden, handle, must } from '@/server/handle'
import { writeSummary } from '@/server/services/academics'
import { changeRequestSchema, resultRowSchema, semesterSchema, subjectSchema } from '@/lib/validators'

const revalidateAcademics = () => {
  revalidatePath('/mentee', 'layout')
  revalidatePath('/mentor', 'layout')
  revalidatePath('/hod', 'layout')
  revalidatePath('/setup')
}

async function semesterOwner(semesterId: string) {
  const db = await createClient()
  const sem = must(await db.from('academic_semesters').select('id, student_id, status, semester_no').eq('id', z.uuid().parse(semesterId)).maybeSingle())
  return { db, sem }
}

export async function createSemester(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = semesterSchema.parse(input)
    const db = await createClient()
    const row = must(
      await db.from('academic_semesters').insert({ student_id: actor.id, semester_no: v.semester_no, academic_year: v.academic_year, status: 'DRAFT' }).select('id, semester_no').single(),
    )
    revalidateAcademics()
    return row
  })
}

export async function updateSemesterMeta(semesterId: string, input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = z
      .object({
        academic_year: semesterSchema.shape.academic_year.optional(),
        manual_sgpa: z.coerce.number().min(0).max(10).nullable().optional(),
        manual_cgpa: z.coerce.number().min(0).max(10).nullable().optional(),
      })
      .parse(input)
    const { db, sem } = await semesterOwner(semesterId)
    if (sem.student_id !== actor.id) throw forbidden()
    if (sem.status !== 'DRAFT') throw badRequest('This semester is locked. Request a correction instead.')
    check(await db.from('academic_semesters').update(v).eq('id', sem.id))
    revalidateAcademics()
    return null
  })
}

export async function deleteSemester(semesterId: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const { db, sem } = await semesterOwner(semesterId)
    if (sem.student_id !== actor.id) throw forbidden()
    if (sem.status !== 'DRAFT') throw badRequest('Only draft semesters can be deleted.')
    check(await db.from('academic_semesters').delete().eq('id', sem.id))
    revalidateAcademics()
    return null
  })
}

export async function saveResult(semesterId: string, input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = resultRowSchema.parse(input)
    const { db, sem } = await semesterOwner(semesterId)
    if (sem.student_id !== actor.id) throw forbidden()
    if (sem.status !== 'DRAFT') throw badRequest('This semester is locked. Request a correction instead.')
    const payload = {
      academic_semester_id: sem.id,
      subject_id: v.subject_id,
      attempt: v.attempt,
      credits: v.credits,
      mse_marks: v.mse_marks,
      mse_max: v.mse_max,
      see_marks: v.see_marks,
      see_max: v.see_max,
      ia: v.ia,
      grade: v.grade ?? null,
      grade_points: v.grade_points,
      result: v.result,
    }
    const row = v.id
      ? must(await db.from('student_subject_results').update(payload).eq('id', v.id).eq('academic_semester_id', sem.id).select('id').single())
      : must(await db.from('student_subject_results').upsert(payload, { onConflict: 'academic_semester_id,subject_id,attempt' }).select('id').single())
    revalidateAcademics()
    return row
  })
}

export async function deleteResult(semesterId: string, resultId: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const { db, sem } = await semesterOwner(semesterId)
    if (sem.student_id !== actor.id) throw forbidden()
    check(await db.from('student_subject_results').delete().eq('id', z.uuid().parse(resultId)).eq('academic_semester_id', sem.id))
    revalidateAcademics()
    return null
  })
}

export async function createSubject(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const v = subjectSchema.parse(input)
    if (!actor.departmentId) throw badRequest('Your account has no department yet.')
    const db = await createClient()
    const row = must(
      await db
        .from('subjects')
        .insert({
          department_id: actor.departmentId,
          code: v.code,
          name: v.name,
          credits: v.credits,
          semester: v.semester ?? null,
          mse_max: v.mse_max,
          see_max: v.see_max,
          has_mse: v.mse_max != null,
          has_see: v.see_max != null,
          is_verified: actor.role === 'HOD',
          created_by: actor.id,
        })
        .select('id, code, name, credits, semester, mse_max, see_max')
        .single(),
    )
    return row
  })
}

export async function submitSemester(semesterId: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const { db, sem } = await semesterOwner(semesterId)
    if (sem.student_id !== actor.id) throw forbidden()
    if (sem.status !== 'DRAFT') throw badRequest('This semester was already submitted.')
    const { count } = await db.from('student_subject_results').select('id', { count: 'exact', head: true }).eq('academic_semester_id', sem.id)
    if (!count) throw badRequest('Add at least one subject before submitting.')
    await writeSummary(db, actor.id, sem.id, actor.departmentId)
    check(await db.from('academic_semesters').update({ status: 'SUBMITTED' }).eq('id', sem.id))
    revalidateAcademics()
    return null
  })
}

/** Mentor (active) or HOD verifies submitted semesters. Summaries are re-snapshotted from the engine. */
export async function verifySemesters(semesterIds: string[]) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR', 'HOD')
    const ids = z.array(z.uuid()).min(1).max(100).parse(semesterIds)
    const db = await createClient()
    const sems = check(await db.from('academic_semesters').select('id, student_id, status').in('id', ids)) ?? []
    if (sems.length !== ids.length) throw forbidden('Some records are not available to you.')
    let done = 0
    for (const s of sems) {
      if (s.status !== 'SUBMITTED') continue
      await assertCanViewStudent(actor, s.student_id, db)
      const { data: u } = await db.from('users').select('department_id').eq('id', s.student_id).maybeSingle()
      await writeSummary(db, s.student_id, s.id, u?.department_id ?? actor.departmentId)
      check(await db.from('academic_semesters').update({ status: 'VERIFIED' }).eq('id', s.id))
      done++
    }
    revalidateAcademics()
    return { verified: done }
  })
}

export async function returnSemester(semesterId: string, note: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR', 'HOD')
    const reason = z.string().trim().min(5, 'Tell the student what to fix (at least 5 characters)').max(1000).parse(note)
    const { db, sem } = await semesterOwner(semesterId)
    await assertCanViewStudent(actor, sem.student_id, db)
    if (sem.status !== 'SUBMITTED' && actor.role !== 'HOD') throw badRequest('Only submitted semesters can be returned.')
    check(await db.from('academic_semesters').update({ status: 'DRAFT', return_note: reason }).eq('id', sem.id))
    revalidateAcademics()
    return null
  })
}

export async function finalizeSemesters(semesterIds: string[]) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const ids = z.array(z.uuid()).min(1).max(200).parse(semesterIds)
    const db = await createClient()
    const res = await db.from('academic_semesters').update({ status: 'FINALIZED' }).in('id', ids).in('status', ['VERIFIED']).select('id')
    check(res)
    revalidateAcademics()
    return { finalized: res.data?.length ?? 0 }
  })
}

export async function requestCorrection(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = changeRequestSchema.parse(input)
    const db = await createClient()
    const sem = must(await db.from('academic_semesters').select('id, student_id, status').eq('id', v.academic_semester_id).maybeSingle())
    if (sem.student_id !== actor.id) throw forbidden()
    if (sem.status !== 'VERIFIED' && sem.status !== 'FINALIZED') throw badRequest('Draft records can be edited directly.')
    // Validate the proposal against the same rules as a direct edit, and snapshot current values.
    let current: Record<string, unknown> = {}
    let proposed: Record<string, unknown> = {}
    if (v.target_table === 'student_subject_results') {
      const row = must(await db.from('student_subject_results').select('*').eq('id', v.target_id).eq('academic_semester_id', sem.id).maybeSingle())
      const merged = resultRowSchema.parse({ ...row, ...v.proposed, subject_id: row.subject_id })
      const keys = ['mse_marks', 'mse_max', 'see_marks', 'see_max', 'ia', 'grade', 'grade_points', 'result', 'credits_earned'] as const
      for (const k of keys) {
        if (k in v.proposed && JSON.stringify((merged as Record<string, unknown>)[k] ?? null) !== JSON.stringify(row[k] ?? null)) {
          proposed[k] = (merged as Record<string, unknown>)[k] ?? null
          current[k] = row[k]
        }
      }
    } else {
      const row = must(await db.from('academic_semesters').select('academic_year, manual_sgpa, manual_cgpa').eq('id', sem.id).maybeSingle())
      const parsed = z
        .object({
          academic_year: semesterSchema.shape.academic_year.optional(),
          manual_sgpa: z.coerce.number().min(0).max(10).nullable().optional(),
          manual_cgpa: z.coerce.number().min(0).max(10).nullable().optional(),
        })
        .parse(v.proposed)
      proposed = Object.fromEntries(Object.entries(parsed).filter(([k, val]) => val !== undefined && val !== (row as Record<string, unknown>)[k]))
      current = Object.fromEntries(Object.keys(proposed).map((k) => [k, (row as Record<string, unknown>)[k]]))
    }
    if (Object.keys(proposed).length === 0) throw badRequest('Change at least one value to request a correction.')
    const { data: pending } = await db.from('record_change_requests').select('id').eq('target_id', v.target_id).eq('status', 'PENDING').maybeSingle()
    if (pending) throw new AppError('CONFLICT', 'A correction for this record is already waiting for review.')
    const row = must(
      await db
        .from('record_change_requests')
        .insert({
          student_id: actor.id,
          academic_semester_id: sem.id,
          target_table: v.target_table,
          target_id: v.target_id,
          current_values: current as never,
          proposed: proposed as never,
          reason: v.reason,
          created_by: actor.id,
        })
        .select('id')
        .single(),
    )
    revalidateAcademics()
    return row
  })
}

export async function reviewChangeRequest(id: string, approve: boolean, note?: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR', 'HOD')
    const db = await createClient()
    const res = await db.rpc('review_change_request', { p_id: z.uuid().parse(id), p_approve: approve, p_note: z.string().max(1000).optional().parse(note) ?? '' })
    check(res)
    const out = res.data as { academic_semester_id: string } | null
    if (approve && out) {
      const { data: sem } = await db.from('academic_semesters').select('student_id').eq('id', out.academic_semester_id).maybeSingle()
      if (sem) {
        const { data: u } = await db.from('users').select('department_id').eq('id', sem.student_id).maybeSingle()
        await writeSummary(db, sem.student_id, out.academic_semester_id, u?.department_id ?? actor.departmentId)
      }
    }
    revalidateAcademics()
    return null
  })
}
