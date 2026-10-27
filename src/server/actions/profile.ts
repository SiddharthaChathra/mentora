'use server'

import { z } from 'zod'
import { revalidatePath, updateTag } from 'next/cache'
import { ROSTER_TAG } from '@/server/services/branches'
import { cookies } from 'next/headers'
import { createClient } from '@/server/supabase'
import { actorOrThrow, ROLE_HOME, type Role } from '@/server/authz'
import { AppError, check, handle, must } from '@/server/handle'
import { rateLimit } from '@/server/rate-limit'
import { sniffFile } from '@/server/files'
import { getSettings } from '@/server/services/people'
import { studentCompletion } from '@/lib/profile-completion'
import { hodProfileSchema, mentorProfileSchema, passwordSchema, studentAboutSchema, studentAcademicSchema, studentPersonalSchema } from '@/lib/validators'

const profileTable = (role: Role) => (role === 'MENTEE' ? 'student_profiles' : role === 'MENTOR' ? 'mentor_profiles' : 'hod_profiles')

async function ensureProfileRow(role: Role, userId: string) {
  const db = await createClient()
  const table = profileTable(role)
  const { data } = await db.from(table).select('user_id').eq('user_id', userId).maybeSingle()
  if (!data) check(await db.from(table).insert({ user_id: userId }))
  return db
}

async function recomputeStudentCompletion(userId: string) {
  const db = await createClient()
  const { data: p } = await db.from('student_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (!p) return
  const { count } = await db.from('academic_semesters').select('id', { count: 'exact', head: true }).eq('student_id', userId)
  check(await db.from('student_profiles').update({ profile_completion: studentCompletion(p, (count ?? 0) > 0) }).eq('user_id', userId))
}

const refresh = () => {
  revalidatePath('/setup')
  revalidatePath('/mentee', 'layout')
  revalidatePath('/mentor', 'layout')
  revalidatePath('/hod', 'layout')
  updateTag(ROSTER_TAG)
}

/** Autosave of in-progress wizard values (debounced on the client). Nothing here is validated or published. */
export async function saveDraft(step: number, values: Record<string, unknown>) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const s = z.number().int().min(0).max(10).parse(step)
    const v = z.record(z.string(), z.unknown()).parse(values)
    if (JSON.stringify(v).length > 20_000) throw new AppError('BAD_REQUEST', 'Draft too large')
    const db = await ensureProfileRow(actor.role, actor.id)
    if (actor.role === 'HOD' || actor.role === 'PRINCIPAL') return { savedAt: new Date().toISOString() }
    const table = actor.role === 'MENTEE' ? 'student_profiles' : 'mentor_profiles'
    check(await db.from(table).update({ draft: v as never, draft_step: s }).eq('user_id', actor.id))
    return { savedAt: new Date().toISOString() }
  })
}

export async function saveStudentPersonal(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = studentPersonalSchema.parse(input)
    const db = await ensureProfileRow('MENTEE', actor.id)
    const { optionalFields } = await getSettings(db)
    check(
      await db
        .from('student_profiles')
        .update({
          full_name: v.full_name,
          phone: v.phone,
          dob: optionalFields.dob ? (v.dob ?? null) : null,
          gender: optionalFields.gender ? (v.gender ?? null) : null,
          address: optionalFields.address ? (v.address ?? null) : null,
        })
        .eq('user_id', actor.id),
    )
    await recomputeStudentCompletion(actor.id)
    refresh()
    return null
  })
}

export async function saveStudentAcademic(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = studentAcademicSchema.parse(input)
    const db = await ensureProfileRow('MENTEE', actor.id)
    const { data: sec } = await db.from('sections').select('id').eq('id', v.section_id).maybeSingle()
    if (!sec) throw new AppError('VALIDATION', 'Choose a section from your department.', { section_id: ['Choose a section'] })
    check(await db.from('student_profiles').update(v).eq('user_id', actor.id))
    await recomputeStudentCompletion(actor.id)
    refresh()
    return null
  })
}

export async function saveStudentAbout(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTEE')
    const v = studentAboutSchema.parse(input)
    const db = await ensureProfileRow('MENTEE', actor.id)
    check(await db.from('student_profiles').update(v).eq('user_id', actor.id))
    await recomputeStudentCompletion(actor.id)
    refresh()
    return null
  })
}

export async function saveMentorProfile(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('MENTOR')
    const v = mentorProfileSchema.parse(input)
    const db = await ensureProfileRow('MENTOR', actor.id)
    check(await db.from('mentor_profiles').update(v).eq('user_id', actor.id))
    refresh()
    return null
  })
}

export async function saveHodProfile(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow('HOD', 'PRINCIPAL')
    const v = hodProfileSchema.parse(input)
    const db = await ensureProfileRow(actor.role, actor.id)
    check(await db.from('hod_profiles').update({ full_name: v.full_name, phone: v.phone ?? null, designation: v.designation ?? null }).eq('user_id', actor.id))
    refresh()
    return null
  })
}

/** Cropped photo from the client (already resized to ≤ 512px). */
export async function uploadAvatar(form: FormData) {
  return handle(async () => {
    const actor = await actorOrThrow()
    await rateLimit(`avatar:${actor.id}`, 20, 60 * 60_000)
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) throw new AppError('VALIDATION', 'Choose a photo.')
    if (file.size > 2 * 1024 * 1024) throw new AppError('VALIDATION', 'Photos must be 2 MB or smaller.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const sniffed = sniffFile(file.name || 'avatar.webp', file.type, bytes, 'avatar')
    if (!sniffed.ok) throw new AppError('VALIDATION', sniffed.reason)
    const ext = sniffed.mime === 'image/webp' ? 'webp' : sniffed.mime === 'image/png' ? 'png' : 'jpg'
    const db = await ensureProfileRow(actor.role, actor.id)
    const path = `${actor.id}/avatar-${Date.now()}.${ext}`
    const up = await db.storage.from('avatars').upload(path, bytes, { contentType: sniffed.mime, upsert: false })
    if (up.error) throw new AppError('INTERNAL', 'Upload failed. Please try again.')
    const table = profileTable(actor.role)
    const { data: old } = await db.from(table).select('avatar_path').eq('user_id', actor.id).maybeSingle()
    check(await db.from(table).update({ avatar_path: path }).eq('user_id', actor.id))
    if (old?.avatar_path) await db.storage.from('avatars').remove([old.avatar_path])
    if (actor.role === 'MENTEE') await recomputeStudentCompletion(actor.id)
    refresh()
    return { path }
  })
}

export async function removeAvatar() {
  return handle(async () => {
    const actor = await actorOrThrow()
    const db = await createClient()
    const table = profileTable(actor.role)
    const { data: old } = await db.from(table).select('avatar_path').eq('user_id', actor.id).maybeSingle()
    check(await db.from(table).update({ avatar_path: null }).eq('user_id', actor.id))
    if (old?.avatar_path) await db.storage.from('avatars').remove([old.avatar_path])
    refresh()
    return null
  })
}

export async function finishOnboarding() {
  return handle(async () => {
    const actor = await actorOrThrow()
    const db = await createClient()
    check(await db.rpc('complete_onboarding'))
    if (actor.role === 'MENTEE') {
      await recomputeStudentCompletion(actor.id)
      check(await db.from('student_profiles').update({ draft: {} }).eq('user_id', actor.id))
    } else if (actor.role === 'MENTOR') {
      check(await db.from('mentor_profiles').update({ draft: {} }).eq('user_id', actor.id))
    }
    // No revalidation here: re-rendering /setup now would redirect before the celebration screen shows.
    return ROLE_HOME[actor.role]
  })
}

export async function updatePreferences(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow()
    const v = z
      .object({
        email_notifications: z.boolean().optional(),
        reminder_emails: z.boolean().optional(),
        low_bandwidth: z.boolean().optional(),
      })
      .parse(input)
    const db = await createClient()
    const prefs = { ...actor.preferences, ...v }
    must(await db.from('users').update({ preferences: prefs }).eq('id', actor.id).select('id').single())
    const jar = await cookies()
    if (v.low_bandwidth != null) jar.set('m_lowbw', v.low_bandwidth ? '1' : '0', { path: '/', maxAge: 31536000, sameSite: 'lax' })
    revalidatePath('/account')
    return prefs
  })
}

export async function changePassword(input: unknown) {
  return handle(async () => {
    const actor = await actorOrThrow()
    await rateLimit(`pw:${actor.id}`, 8, 15 * 60_000)
    const v = z
      .object({ current: z.string().min(1, 'Enter your current password'), password: passwordSchema, confirm: z.string() })
      .refine((x) => x.password === x.confirm, { path: ['confirm'], message: 'Passwords do not match' })
      .parse(input)
    const db = await createClient()
    // Re-verify the current password before allowing a change.
    const { error: reauth } = await db.auth.signInWithPassword({ email: actor.email, password: v.current })
    if (reauth) throw new AppError('VALIDATION', 'Your current password is incorrect.', { current: ['Incorrect password'] })
    const { error } = await db.auth.updateUser({ password: v.password })
    if (error) throw new AppError('BAD_REQUEST', error.code === 'same_password' ? 'Choose a different password.' : 'Could not update your password.')
    await db.from('audit_logs').insert({ actor_id: actor.id, action: 'account.password_changed', entity_type: 'users', entity_id: actor.id })
    return null
  })
}

export async function revokeSession(sessionId: string) {
  return handle(async () => {
    await actorOrThrow()
    const db = await createClient()
    check(await db.rpc('revoke_my_session', { p_session: z.uuid().parse(sessionId) }))
    revalidatePath('/account')
    return null
  })
}
