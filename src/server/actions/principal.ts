'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { badRequest, check, handle, must } from '@/server/handle'

const refresh = () => {
  revalidatePath('/principal', 'layout')
  revalidatePath('/hod', 'layout')
}

const branchSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/, 'Use 2–12 letters or digits, e.g. CSE'),
  name: z.string().trim().min(2, 'Enter the branch name').max(120),
  usn_code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([a-z]{2,3})?$/, 'Two or three letters, as on USNs (e.g. cs)')
    .optional()
    .transform((v) => v || null),
})

// ───────────────────────────── Branches (Principal) ─────────────────────────────
export async function createBranch(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('PRINCIPAL')
    const v = branchSchema.parse(input)
    const db = await createClient()
    const { count } = await db.from('departments').select('id', { count: 'exact', head: true })
    const row = must(await db.from('departments').insert({ ...v, display_order: count ?? 0, created_by: actor.id }).select('id, code').single())
    // Sections are branch-owned (the HOD manages them); a new branch starts with the usual three.
    check(await db.rpc('seed_branch_sections', { p_department: row.id }))
    refresh()
    return row
  })
}

export async function updateBranch(id: string, input: unknown) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const v = branchSchema.omit({ code: true }).parse(input)
    const db = await createClient()
    const res = await db.from('departments').update(v).eq('id', z.uuid().parse(id)).select('id')
    check(res)
    if (!res.data?.length) throw badRequest('Branch not found.')
    refresh()
    return null
  })
}

/** Archive is refused by the database while the branch still has active students or staff. */
export async function setBranchStatus(id: string, status: 'ACTIVE' | 'ARCHIVED') {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const db = await createClient()
    check(await db.from('departments').update({ status: z.enum(['ACTIVE', 'ARCHIVED']).parse(status) }).eq('id', z.uuid().parse(id)))
    refresh()
    return null
  })
}

export async function reorderBranches(ids: string[]) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const list = z.array(z.uuid()).max(100).parse(ids)
    const db = await createClient()
    for (const [i, id] of list.entries()) check(await db.from('departments').update({ display_order: i }).eq('id', id))
    refresh()
    return null
  })
}

// ───────────────────────────── HOD appointments (Principal) ─────────────────────────────
export async function appointHod(departmentId: string, userId: string, reason: string) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const db = await createClient()
    check(await db.rpc('appoint_hod', { p_department: z.uuid().parse(departmentId), p_user: z.uuid().parse(userId), p_reason: z.string().trim().max(500).parse(reason) }))
    refresh()
    return null
  })
}

export async function endHodAppointment(departmentId: string, reason: string) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const db = await createClient()
    check(await db.rpc('end_hod_appointment', { p_department: z.uuid().parse(departmentId), p_reason: z.string().trim().max(500).parse(reason) }))
    refresh()
    return null
  })
}

// ───────────────────────────── Branch transfers ─────────────────────────────
const transferSchema = z.object({
  student_id: z.uuid(),
  to_department_id: z.uuid('Choose the target branch'),
  reason: z.string().trim().min(3, 'Give a short reason').max(1000),
})

/** HOD: asks the Principal to move one of their students to another branch. */
export async function requestTransfer(input: unknown) {
  return handle(async () => {
    await actorOrThrow('HOD')
    const v = transferSchema.parse(input)
    const db = await createClient()
    const res = await db.rpc('request_branch_transfer', { p_student: v.student_id, p_to: v.to_department_id, p_reason: v.reason })
    check(res)
    refresh()
    return res.data
  })
}

export async function decideTransfer(id: string, approve: boolean, note: string) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const db = await createClient()
    check(await db.rpc('decide_branch_transfer', { p_id: z.uuid().parse(id), p_approve: z.boolean().parse(approve), p_note: z.string().trim().max(1000).parse(note) }))
    refresh()
    revalidatePath('/mentor', 'layout')
    return null
  })
}

/** Principal: move a student directly (ends the active mentor assignment in the same transaction). */
export async function moveStudent(input: unknown) {
  return handle(async () => {
    await actorOrThrow('PRINCIPAL')
    const v = transferSchema.parse(input)
    const db = await createClient()
    const res = await db.rpc('move_student_branch', { p_student: v.student_id, p_to: v.to_department_id, p_reason: v.reason })
    check(res)
    refresh()
    revalidatePath('/mentor', 'layout')
    return res.data
  })
}

// ───────────────────────────── Interventions ─────────────────────────────
/** Principal: nudge a branch HOD about flagged students (read-only otherwise). */
export async function notifyHod(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('PRINCIPAL')
    const v = z.object({ department_id: z.uuid(), note: z.string().trim().min(3, 'Add a short note').max(500), count: z.number().int().min(0).max(5000) }).parse(input)
    const db = await createClient()
    const res = await db.rpc('notify_branch_hod', { p_department: v.department_id, p_title: `The Principal asked you to review ${v.count} flagged student${v.count === 1 ? '' : 's'}`, p_body: v.note })
    check(res)
    await db.from('audit_logs').insert({ actor_id: actor.id, action: 'intervention.notify_hod', entity_type: 'departments', entity_id: v.department_id, after: { count: v.count, note: v.note } })
    return { notified: res.data }
  })
}
