import 'server-only'
import type { Actor } from '@/server/authz'
import { AppError, forbidden } from '@/server/handle'
import { serverEnv } from '@/server/env'
import { createAdminClient } from './client'
import { emailLayout, sendEmail } from '@/server/email'

type Role = 'MENTEE' | 'MENTOR' | 'HOD'

function assertHod(actor: Actor) {
  if (actor.role !== 'HOD' || actor.status !== 'ACTIVE' || !actor.departmentId) throw forbidden('Only the HOD can manage accounts.')
}

/**
 * Invite (or re-invite) a user into the HOD's department. Uses the service-role client ONLY after the HOD check.
 * Role and department live in public.users — never in client-editable metadata.
 */
export async function inviteUser(actor: Actor, input: { email: string; role: Role; full_name?: string }, opts: { sendEmail?: boolean } = {}) {
  assertHod(actor)
  const admin = createAdminClient()
  const redirectTo = `${serverEnv.siteUrl}/auth/confirm?type=invite&next=/accept-invite`
  const { data: existing } = await admin.from('users').select('id, status, department_id').eq('email', input.email).maybeSingle()
  if (existing && existing.status !== 'INVITED') throw new AppError('CONFLICT', 'That email already has an active account.')
  if (existing && existing.department_id !== actor.departmentId) throw forbidden('That account belongs to another department.')

  let userId = existing?.id ?? null
  if (opts.sendEmail === false) {
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({ email: input.email, email_confirm: false })
      if (error || !data.user) throw new AppError('INTERNAL', 'Could not create the account.')
      userId = data.user.id
    }
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, { redirectTo })
    if (error && !userId) {
      if (/already/i.test(error.message)) throw new AppError('CONFLICT', 'That email is already registered.')
      throw new AppError('INTERNAL', 'The invitation email could not be sent. Check the SMTP settings.')
    }
    userId = data?.user?.id ?? userId
  }
  if (!userId) throw new AppError('INTERNAL', 'Could not create the account.')

  const { error: upErr } = await admin.from('users').upsert(
    { id: userId, email: input.email, role: input.role, status: 'INVITED', department_id: actor.departmentId, invited_by: actor.id },
    { onConflict: 'id' },
  )
  if (upErr) throw new AppError('INTERNAL', 'Could not save the account.')
  const table = input.role === 'MENTEE' ? 'student_profiles' : input.role === 'MENTOR' ? 'mentor_profiles' : 'hod_profiles'
  await admin.from(table).upsert({ user_id: userId, full_name: input.full_name?.trim() || null }, { onConflict: 'user_id', ignoreDuplicates: true })
  return { id: userId }
}

export async function resendInvite(actor: Actor, userId: string) {
  assertHod(actor)
  const admin = createAdminClient()
  const { data: u } = await admin.from('users').select('email, status, department_id').eq('id', userId).maybeSingle()
  if (!u || u.department_id !== actor.departmentId) throw forbidden()
  if (u.status !== 'INVITED') throw new AppError('BAD_REQUEST', 'This user has already accepted their invitation.')
  const { error } = await admin.auth.admin.inviteUserByEmail(u.email, { redirectTo: `${serverEnv.siteUrl}/auth/confirm?type=invite&next=/accept-invite` })
  if (error) {
    // The auth user already exists: generate a fresh sign-in link and email it ourselves.
    const { data, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.email })
    const tokenHash = data?.properties?.hashed_token
    if (linkErr || !tokenHash) throw new AppError('INTERNAL', 'The invitation could not be resent.')
    const href = `${serverEnv.siteUrl}/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=/accept-invite`
    const sent = await sendEmail(
      u.email,
      'Your Mentora invitation',
      emailLayout({ heading: 'You’re invited to Mentora', intro: 'Your department has invited you to Mentora. Use the button below to set your password and finish setting up your profile.', cta: { label: 'Accept invitation', href }, footnote: 'This link works once and expires soon. If you weren’t expecting it, you can ignore this email.' }),
    )
    if (!sent) throw new AppError('BAD_REQUEST', 'Email sending is not configured (RESEND_API_KEY). The invitation could not be resent.')
  }
}

/** Mirror account suspension at the auth layer so existing refresh tokens stop working too. */
export async function setAuthBan(actor: Actor, userId: string, banned: boolean) {
  assertHod(actor)
  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(userId, { ban_duration: banned ? '876000h' : 'none' })
}
