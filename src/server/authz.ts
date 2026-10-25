import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { createClient, type DB } from './supabase'
import { AppError, forbidden } from './handle'

export type Role = Database['public']['Enums']['user_role']
export type Status = Database['public']['Enums']['user_status']

export type Preferences = {
  email_notifications?: boolean
  reminder_emails?: boolean
  low_bandwidth?: boolean
}

export type Actor = {
  id: string
  email: string
  role: Role
  status: Status
  departmentId: string | null
  onboardingCompletedAt: string | null
  preferences: Preferences
  name: string | null
  avatarPath: string | null
  createdAt: string
}

export const ROLE_HOME: Record<Role, string> = { MENTEE: '/mentee', MENTOR: '/mentor', HOD: '/hod' }

/**
 * Identity is verified with Supabase Auth (getUser validates the JWT with the auth server), and
 * role/status come from public.users on the server — never from user_metadata, cookies, URL or body.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const db = await createClient()
  const { data: auth } = await db.auth.getUser()
  if (!auth.user) return null
  const { data: u } = await db
    .from('users')
    .select('id, email, role, status, department_id, onboarding_completed_at, preferences, created_at')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!u) return null
  const table = u.role === 'MENTEE' ? 'student_profiles' : u.role === 'MENTOR' ? 'mentor_profiles' : 'hod_profiles'
  const { data: p } = await db.from(table).select('full_name, avatar_path').eq('user_id', u.id).maybeSingle()
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    departmentId: u.department_id,
    onboardingCompletedAt: u.onboarding_completed_at,
    preferences: (u.preferences ?? {}) as Preferences,
    name: p?.full_name ?? null,
    avatarPath: p?.avatar_path ?? null,
    createdAt: u.created_at,
  }
})

/** Page/layout guard: redirects instead of throwing. */
export async function requireUser(opts: { allowIncompleteOnboarding?: boolean } = {}): Promise<Actor> {
  const actor = await getActor()
  if (!actor) redirect('/login')
  if (actor.status === 'SUSPENDED') redirect('/suspended')
  if (actor.status === 'INVITED') redirect('/accept-invite')
  if (!opts.allowIncompleteOnboarding && !actor.onboardingCompletedAt) redirect('/setup')
  return actor
}

export async function requireRole(...roles: Role[]): Promise<Actor> {
  const actor = await requireUser()
  if (!roles.includes(actor.role)) redirect(ROLE_HOME[actor.role])
  return actor
}

/** Action/route guard: throws AppError, mapped to 401/403 by handle(). */
export async function actorOrThrow(...roles: Role[]): Promise<Actor> {
  const actor = await getActor()
  if (!actor) throw new AppError('UNAUTHENTICATED', 'Please sign in again.')
  if (actor.status !== 'ACTIVE') throw forbidden('Your account is not active.')
  if (roles.length && !roles.includes(actor.role)) throw forbidden()
  return actor
}

export async function isActiveMentorOf(db: DB, mentorId: string, studentId: string) {
  const { data } = await db
    .from('mentor_assignments')
    .select('id')
    .eq('mentor_id', mentorId)
    .eq('student_id', studentId)
    .is('ended_at', null)
    .maybeSingle()
  return !!data
}

export async function assertCanViewStudent(actor: Actor, studentId: string, db?: DB) {
  db ??= await createClient()
  if (actor.role === 'MENTEE') {
    if (actor.id !== studentId) throw forbidden()
    return
  }
  if (actor.role === 'MENTOR') {
    if (!(await isActiveMentorOf(db, actor.id, studentId))) throw forbidden('This student is not assigned to you.')
    return
  }
  const { data } = await db.from('users').select('department_id, role').eq('id', studentId).maybeSingle()
  if (!data || data.role !== 'MENTEE' || data.department_id !== actor.departmentId) throw forbidden()
}

export async function assertCanEditMentoring(actor: Actor, studentId: string, db?: DB) {
  if (actor.role !== 'MENTOR') throw forbidden('Only the assigned mentor can do this.')
  db ??= await createClient()
  if (!(await isActiveMentorOf(db, actor.id, studentId))) throw forbidden('This student is not assigned to you.')
}

export async function assertCanAccessFile(actor: Actor, resourceId: string, db?: DB) {
  db ??= await createClient()
  // RLS on learning_resources decides visibility; no row means no access.
  const { data } = await db
    .from('learning_resources')
    .select('id, file_path, file_name, mime, student_id, mentor_id')
    .eq('id', resourceId)
    .maybeSingle()
  if (!data || !data.file_path) throw forbidden('You do not have access to this file.')
  if (actor.role === 'MENTOR' && data.mentor_id !== actor.id) throw forbidden()
  if (actor.role === 'MENTEE' && data.student_id && data.student_id !== actor.id) throw forbidden()
  return data as typeof data & { file_path: string }
}

/** Use a throwing guard in a page: forbidden → /403. */
export async function pageGuard(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e) {
    if (e instanceof AppError) redirect(e.code === 'UNAUTHENTICATED' ? '/login' : '/403')
    throw e
  }
}
