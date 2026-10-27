'use server'

import { z } from 'zod'
import { revalidatePath, updateTag } from 'next/cache'
import { ROSTER_TAG } from '@/server/services/branches'
import { createClient } from '@/server/supabase'
import { actorOrThrow, assertCanEditMentoring } from '@/server/authz'
import { AppError, badRequest, check, forbidden, handle, must } from '@/server/handle'
import { rateLimit } from '@/server/rate-limit'
import { getSettings } from '@/server/services/people'
import { recommendationSchema, resourceSchema, sessionCompleteSchema, sessionSchema } from '@/lib/validators'
import { sniffFile } from '@/server/files'

const refresh = () => {
  revalidatePath('/mentee', 'layout')
  revalidatePath('/mentor', 'layout')
  updateTag(ROSTER_TAG)
}

// ───────────────────────────── Recommendations ─────────────────────────────
export async function createRecommendation(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const v = recommendationSchema.parse(input)
    await assertCanEditMentoring(actor, v.student_id)
    const db = await createClient()
    if (v.category === 'ATTENDANCE' && !(await getSettings(db)).attendanceEnabled) throw badRequest('The attendance category is turned off by your HOD.')
    if (v.visibility === 'PRIVATE_MENTOR' && v.include_in_report) throw badRequest('Private notes cannot be included in reports.')
    if (v.parent_id) {
      const parent = must(await db.from('mentor_recommendations').select('student_id').eq('id', v.parent_id).maybeSingle())
      if (parent.student_id !== v.student_id) throw forbidden()
    }
    const row = must(
      await db
        .from('mentor_recommendations')
        .insert({
          student_id: v.student_id,
          mentor_id: actor.id,
          kind: v.kind,
          category: v.category,
          title: v.title,
          body: v.body,
          subject_id: v.subject_id ?? null,
          due_date: v.due_date ?? null,
          review_date: v.review_date ?? null,
          visibility: v.visibility,
          include_in_report: v.include_in_report,
          parent_id: v.parent_id ?? null,
          target_metric: v.target_metric ?? null,
          steps: v.steps,
        })
        .select('id')
        .single(),
    )
    refresh()
    return row
  })
}

export async function updateRecommendation(id: string, input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const v = recommendationSchema.parse(input)
    await assertCanEditMentoring(actor, v.student_id)
    const db = await createClient()
    if (v.visibility === 'PRIVATE_MENTOR' && v.include_in_report) throw badRequest('Private notes cannot be included in reports.')
    check(
      await db
        .from('mentor_recommendations')
        .update({
          kind: v.kind,
          category: v.category,
          title: v.title,
          body: v.body,
          subject_id: v.subject_id ?? null,
          due_date: v.due_date ?? null,
          review_date: v.review_date ?? null,
          visibility: v.visibility,
          include_in_report: v.include_in_report,
          target_metric: v.target_metric ?? null,
          steps: v.steps,
        })
        .eq('id', z.uuid().parse(id))
        .eq('student_id', v.student_id),
    )
    refresh()
    return null
  })
}

export async function deleteRecommendation(id: string) {
  return handle(async () => {
    await actorOrThrow('MENTOR')
    const db = await createClient()
    const res = await db.from('mentor_recommendations').delete().eq('id', z.uuid().parse(id)).select('id')
    check(res)
    if (!res.data?.length) throw forbidden('Only the author can delete this item.')
    refresh()
    return null
  })
}

const statusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'])

/** Mentor or mentee (for shared goals / action points). RLS + trigger enforce who may change what. */
export async function setRecommendationStatus(id: string, status: string) {
  return handle(async () => {
    await actorOrThrow('MENTOR', 'MENTEE')
    const db = await createClient()
    const res = await db.from('mentor_recommendations').update({ status: statusSchema.parse(status) }).eq('id', z.uuid().parse(id)).select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    return null
  })
}

export async function toggleStep(id: string, stepId: string, done: boolean) {
  return handle(async () => {
    await actorOrThrow('MENTOR', 'MENTEE')
    const db = await createClient()
    const rec = must(await db.from('mentor_recommendations').select('id, steps, status').eq('id', z.uuid().parse(id)).maybeSingle())
    const steps = (Array.isArray(rec.steps) ? rec.steps : []) as { id: string; label: string; done: boolean }[]
    if (!steps.some((s) => s.id === stepId)) throw badRequest('Unknown step')
    const next = steps.map((s) => (s.id === stepId ? { ...s, done } : s))
    const allDone = next.every((s) => s.done)
    const status = allDone ? 'COMPLETED' : next.some((s) => s.done) ? 'IN_PROGRESS' : rec.status === 'COMPLETED' ? 'IN_PROGRESS' : rec.status
    const res = await db.from('mentor_recommendations').update({ steps: next, status }).eq('id', rec.id).select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    return { status }
  })
}

export async function saveReflection(id: string, text: string) {
  return handle(async () => {
    await actorOrThrow('MENTEE')
    const db = await createClient()
    const reflection = z.string().trim().max(2000).parse(text)
    const res = await db.from('mentor_recommendations').update({ reflection: reflection || null }).eq('id', z.uuid().parse(id)).select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    return null
  })
}

export async function confirmCompletion(id: string) {
  return handle(async () => {
    await actorOrThrow('MENTOR')
    const db = await createClient()
    const res = await db
      .from('mentor_recommendations')
      .update({ status: 'COMPLETED', completion_confirmed_at: new Date().toISOString() })
      .eq('id', z.uuid().parse(id))
      .select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    return null
  })
}

// ───────────────────────────── Seen / new ─────────────────────────────
const entitySchema = z.enum(['recommendation', 'resource', 'session', 'ai_summary'])

export async function markSeen(entity: string, ids: string[]) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const e = entitySchema.parse(entity)
    const list = z.array(z.uuid()).max(500).parse(ids)
    if (!list.length) return 0
    const db = await createClient()
    check(
      await db.from('content_views').upsert(
        list.map((id) => ({ user_id: actor.id, entity_type: e, entity_id: id })),
        { onConflict: 'user_id,entity_type,entity_id', ignoreDuplicates: true },
      ),
    )
    revalidatePath('/mentee', 'layout')
    return list.length
  })
}

// ───────────────────────────── Resources ─────────────────────────────
const MAX_BYTES = 25 * 1024 * 1024

export async function createResource(form: FormData) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    await rateLimit(`upload:${actor.id}`, 30, 60 * 60_000)
    const v = resourceSchema.parse({
      title: form.get('title'),
      instructions: form.get('instructions') ?? '',
      student_id: form.get('student_id') ?? '',
      subject_id: form.get('subject_id') ?? '',
      external_url: form.get('external_url') ?? '',
    })
    if (v.student_id) await assertCanEditMentoring(actor, v.student_id)
    const file = form.get('file')
    const hasFile = file instanceof File && file.size > 0
    if (!hasFile && !v.external_url) throw new AppError('VALIDATION', 'Attach a file or add a link.', { file: ['Attach a file or add a link'] })
    const db = await createClient()
    const id = crypto.randomUUID()
    let filePath: string | null = null
    let mime: string | null = null
    if (hasFile) {
      if (file.size > MAX_BYTES) throw new AppError('VALIDATION', 'Files must be 25 MB or smaller.', { file: ['Max 25 MB'] })
      const buf = new Uint8Array(await file.arrayBuffer())
      const sniffed = sniffFile(file.name, file.type, buf, 'resource')
      if (!sniffed.ok) throw new AppError('VALIDATION', sniffed.reason, { file: [sniffed.reason] })
      mime = sniffed.mime
      const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(-120)
      filePath = `${actor.id}/${id}/${safeName}`
      const up = await db.storage.from('resources').upload(filePath, buf, { contentType: mime, upsert: false })
      if (up.error) throw new AppError('INTERNAL', 'Upload failed. Please try again.')
    }
    const ins = await db
      .from('learning_resources')
      .insert({
        id,
        mentor_id: actor.id,
        student_id: v.student_id ?? null,
        title: v.title,
        instructions: v.instructions,
        file_path: filePath,
        file_name: hasFile ? (file as File).name.slice(-160) : null,
        mime,
        size_bytes: hasFile ? (file as File).size : null,
        external_url: v.external_url ?? null,
        subject_id: v.subject_id ?? null,
      })
      .select('id')
      .single()
    if (ins.error && filePath) await db.storage.from('resources').remove([filePath])
    const row = must(ins)
    refresh()
    return row
  })
}

export async function deleteResource(id: string) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const db = await createClient()
    const r = must(await db.from('learning_resources').select('id, file_path, mentor_id').eq('id', z.uuid().parse(id)).maybeSingle())
    if (r.mentor_id !== actor.id) throw forbidden()
    check(await db.from('learning_resources').delete().eq('id', r.id))
    if (r.file_path) await db.storage.from('resources').remove([r.file_path])
    refresh()
    return null
  })
}

// ───────────────────────────── Sessions ─────────────────────────────
export async function createSession(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const v = sessionSchema.parse(input)
    if (v.student_id) await assertCanEditMentoring(actor, v.student_id)
    if (new Date(v.scheduled_at).getTime() < Date.now() - 60 * 60_000) throw new AppError('VALIDATION', 'Pick a time in the future.', { scheduled_at: ['Pick a time in the future'] })
    const db = await createClient()
    const row = must(
      await db
        .from('mentoring_sessions')
        .insert({
          mentor_id: actor.id,
          student_id: v.student_id ?? null,
          group_name: v.student_id ? null : (v.group_name ?? 'All my mentees'),
          scheduled_at: new Date(v.scheduled_at).toISOString(),
          duration_min: v.duration_min,
          mode: v.mode,
          location_or_link: v.location_or_link ?? null,
          agenda: v.agenda,
          status: 'SCHEDULED',
        })
        .select('id')
        .single(),
    )
    refresh()
    return row
  })
}

export async function updateSession(id: string, input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const v = sessionSchema.parse(input)
    if (v.student_id) await assertCanEditMentoring(actor, v.student_id)
    const db = await createClient()
    const res = await db
      .from('mentoring_sessions')
      .update({
        scheduled_at: new Date(v.scheduled_at).toISOString(),
        duration_min: v.duration_min,
        mode: v.mode,
        location_or_link: v.location_or_link ?? null,
        agenda: v.agenda,
      })
      .eq('id', z.uuid().parse(id))
      .eq('status', 'SCHEDULED')
      .select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    return null
  })
}

export async function cancelSession(id: string) {
  return handle(async () => {
    await actorOrThrow('MENTOR')
    const db = await createClient()
    const res = await db.from('mentoring_sessions').update({ status: 'CANCELLED' }).eq('id', z.uuid().parse(id)).eq('status', 'SCHEDULED').select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    return null
  })
}

/** Complete a session; each action item becomes a tracked ACTION_POINT for the student. */
export async function completeSession(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const v = sessionCompleteSchema.parse(input)
    const db = await createClient()
    const s = must(await db.from('mentoring_sessions').select('id, student_id, mentor_id, status').eq('id', v.id).maybeSingle())
    if (s.mentor_id !== actor.id) throw forbidden()
    if (s.status === 'CANCELLED') throw badRequest('This session was cancelled.')
    check(
      await db
        .from('mentoring_sessions')
        .update({ status: 'COMPLETED', summary: v.summary, action_items: v.action_items, next_follow_up_date: v.next_follow_up_date ?? null, completed_at: new Date().toISOString() })
        .eq('id', s.id),
    )
    if (s.student_id && v.action_items.length) {
      await assertCanEditMentoring(actor, s.student_id, db)
      check(
        await db.from('mentor_recommendations').insert(
          v.action_items.map((a) => ({
            student_id: s.student_id!,
            mentor_id: actor.id,
            kind: 'ACTION_POINT' as const,
            category: 'ACADEMIC_PROGRESS' as const,
            title: a.title,
            body: 'Agreed during a mentoring session.',
            due_date: a.due_date ?? null,
            review_date: v.next_follow_up_date ?? null,
            visibility: 'SHARED' as const,
            include_in_report: true,
          })),
        ),
      )
    }
    refresh()
    return null
  })
}

export async function resolveFollowup(id: string, note: string) {
  return handle(async () => {
    await actorOrThrow('MENTOR', 'HOD')
    const db = await createClient()
    const res = await db
      .from('intervention_followups')
      .update({ status: 'RESOLVED', resolution_note: z.string().trim().max(1000).parse(note) || null, resolved_at: new Date().toISOString() })
      .eq('id', z.uuid().parse(id))
      .select('id')
    check(res)
    if (!res.data?.length) throw forbidden()
    refresh()
    revalidatePath('/hod/interventions')
    return null
  })
}
