'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/server/supabase'
import { serverEnv } from '@/server/env'
import { AppError, handle } from '@/server/handle'
import { rateLimit } from '@/server/rate-limit'
import { forgotSchema, loginSchema, setPasswordSchema, signupSchema } from '@/lib/validators'
import { ROLE_HOME } from '@/lib/roles'

/** View filters belong to a person, not the browser: every sign-in starts on all semesters / all branches. */
async function clearViewFilters() {
  const jar = await cookies()
  jar.delete('m_sem')
  jar.delete('m_branch')
}

const GENERIC_LOGIN = 'That email and password combination didn’t work. Check both and try again.'

export async function signIn(input: unknown) {
  const res = await handle(async () => {
    const { email, password, next } = loginSchema.parse(input)
    await rateLimit('login', 10, 10 * 60_000)
    const db = await createClient()
    const { data, error } = await db.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      // Suspended accounts are banned in Auth; send them to the explanation page instead of a generic error.
      if (error?.code === 'user_banned') return '/suspended'
      if (error?.status === 429) throw new AppError('RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.')
      throw new AppError('UNAUTHENTICATED', GENERIC_LOGIN)
    }
    await clearViewFilters()
    // Role + status come from the database, never from the auth payload.
    const { data: u } = await db.from('users').select('role, status, onboarding_completed_at').eq('id', data.user.id).maybeSingle()
    if (!u) {
      await db.auth.signOut()
      throw new AppError('FORBIDDEN', 'Your account has not been set up yet. Please contact your HOD.')
    }
    if (u.status === 'SUSPENDED') return '/suspended'
    if (u.status === 'INVITED') return '/accept-invite'
    if (!u.onboarding_completed_at) return '/setup'
    const home = ROLE_HOME[u.role]
    return next && next.startsWith(home) && !next.startsWith('//') ? next : home
  })
  if (res.ok) redirect(res.data)
  return res
}

/**
 * Self sign-up for students. The database trigger (migration 010) creates the MENTEE account;
 * the role is never taken from this request. Returns 'check-email' when the project requires email confirmation.
 */
export async function signUp(input: unknown) {
  const res = await handle(async () => {
    const { full_name, email, password } = signupSchema.parse(input)
    await rateLimit('signup', 5, 15 * 60_000)
    const db = await createClient()
    // Rule check first (USN shape, known branch, domain, sign-up open): Auth would hide the trigger's reason.
    const { data: problem } = await db.rpc('signup_email_problem', { p_email: email })
    if (problem) throw new AppError('VALIDATION', problem, { email: [problem] })
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { signup: 'self', full_name }, emailRedirectTo: `${serverEnv.siteUrl}/auth/confirm?type=signup&next=/setup` },
    })
    if (error) {
      if (error.status === 429) throw new AppError('RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.')
      if (/turned off/i.test(error.message)) throw new AppError('FORBIDDEN', 'Sign-up is turned off. Ask your HOD for an invitation.')
      // The only rule left for the trigger is a USN that is already registered; answer like any existing account.
      throw new AppError('BAD_REQUEST', 'We couldn’t create your account. If you already have one, sign in or reset your password.')
    }
    // Existing emails come back without identities; answer the same way so accounts can't be probed.
    if (!data.session) return 'check-email' as const
    return '/setup'
  })
  if (res.ok && res.data !== 'check-email') redirect(res.data)
  return res
}

export async function requestPasswordReset(input: unknown) {
  return handle(async () => {
    const { email } = forgotSchema.parse(input)
    await rateLimit('forgot', 5, 15 * 60_000)
    const db = await createClient()
    // Always report success so the response never reveals whether an account exists.
    await db.auth.resetPasswordForEmail(email, { redirectTo: `${serverEnv.siteUrl}/auth/confirm?type=recovery&next=/reset-password` })
    return null
  })
}

/** Used by both the reset-password and accept-invite flows (the email link already created a session). */
export async function setNewPassword(input: unknown, mode: 'reset' | 'invite') {
  const res = await handle(async () => {
    const { password } = setPasswordSchema.parse(input)
    await rateLimit('set-password', 10, 15 * 60_000)
    const db = await createClient()
    const { data: auth } = await db.auth.getUser()
    if (!auth.user) throw new AppError('UNAUTHENTICATED', 'This link has expired. Request a new one.')
    const { error } = await db.auth.updateUser({ password })
    if (error) {
      throw new AppError(
        'BAD_REQUEST',
        error.code === 'same_password' ? 'Choose a password you have not used before.' : 'We could not update your password. Try a stronger one.',
      )
    }
    if (mode === 'invite') await db.rpc('activate_my_account')
    const { data: u } = await db.from('users').select('role, status, onboarding_completed_at').eq('id', auth.user.id).maybeSingle()
    if (!u) return '/login'
    if (u.status === 'SUSPENDED') return '/suspended'
    if (!u.onboarding_completed_at) return '/setup'
    return ROLE_HOME[u.role]
  })
  if (res.ok) redirect(res.data)
  return res
}
