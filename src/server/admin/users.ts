import 'server-only'
import type { Actor } from '@/server/authz'
import { AppError, forbidden } from '@/server/handle'
import { serverEnv } from '@/server/env'
import { createAdminClient } from './client'
import { emailLayout, sendEmail } from '@/server/email'

type Role = 'MENTEE' | 'MENTOR' | 'HOD'

/**
 * The branch an account action targets. HOD: always their own branch, MENTEE/MENTOR only.
 * Principal: any active branch (checked against the DB). Runs BEFORE any service-role call.
 */
async function targetBranch(actor: Actor, role: Role, requested?: string | null): Promise<string> {
  if (actor.status !== 'ACTIVE') throw forbidden()
  if (actor.role === 'HOD' && actor.hodActive && actor.departmentId) {
    if (role === 'HOD') throw forbidden('Only the Principal can add a Head of Department.')
    if (requested && requested !== actor.departmentId) throw forbidden('You can only add people to your own branch.')
    return actor.departmentId
  }
  if (actor.role === 'PRINCIPAL') {
    if (!requested) throw new AppError('VALIDATION', 'Choose a branch.', { department_id: ['Choose a branch'] })
    const { data } = await createAdminClient().from('departments').select('id').eq('id', requested).eq('status', 'ACTIVE').maybeSingle()
    if (!data) throw new AppError('VALIDATION', 'Choose an active branch.', { department_id: ['Choose an active branch'] })
    return data.id
  }
  throw forbidden('Only an HOD or the Principal can manage accounts.')
}

/** Existing account the actor may manage: HOD → mentee/mentor of own branch; Principal → anyone but a Principal. */
async function manageable(actor: Actor, userId: string) {
  const { data: u } = await createAdminClient().from('users').select('id, email, status, role, department_id').eq('id', userId).maybeSingle()
  if (!u) throw forbidden()
  if (actor.role === 'PRINCIPAL' && actor.status === 'ACTIVE' && u.role !== 'PRINCIPAL') return u
  if (actor.role === 'HOD' && actor.hodActive && u.department_id === actor.departmentId && (u.role === 'MENTEE' || u.role === 'MENTOR')) return u
  throw forbidden()
}

/**
 * Invite (or re-invite) a user into a branch. Uses the service-role client ONLY after the scope check.
 * Role and branch live in public.users — never in client-editable metadata.
 */
export async function inviteUser(actor: Actor, input: { email: string; role: Role; full_name?: string; department_id?: string }, opts: { sendEmail?: boolean } = {}) {
  const branch = await targetBranch(actor, input.role, input.department_id)
  const admin = createAdminClient()
  const redirectTo = `${serverEnv.siteUrl}/auth/confirm?type=invite&next=/accept-invite`
  const { data: existing } = await admin.from('users').select('id, status, department_id').eq('email', input.email).maybeSingle()
  if (existing && existing.status !== 'INVITED') throw new AppError('CONFLICT', 'That email already has an active account.')
  if (existing && existing.department_id !== branch) throw forbidden('That account belongs to another branch.')

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
    { id: userId, email: input.email, role: input.role, status: 'INVITED', department_id: branch, invited_by: actor.id },
    { onConflict: 'id' },
  )
  if (upErr) throw new AppError('INTERNAL', 'Could not save the account.')
  const table = input.role === 'MENTEE' ? 'student_profiles' : input.role === 'MENTOR' ? 'mentor_profiles' : 'hod_profiles'
  await admin.from(table).upsert({ user_id: userId, full_name: input.full_name?.trim() || null }, { onConflict: 'user_id', ignoreDuplicates: true })
  return { id: userId }
}

export async function resendInvite(actor: Actor, userId: string) {
  const u = await manageable(actor, userId)
  const admin = createAdminClient()
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
  await manageable(actor, userId)
  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(userId, { ban_duration: banned ? '876000h' : 'none' })
}
