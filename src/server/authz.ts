import 'server-only'
import { cache } from 'react'
import { notFound as nextNotFound, redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { createClient, type DB } from './supabase'
import { AppError, forbidden, notFound } from './handle'

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
  /** The actor's branch. For an HOD this is the branch they currently head (null once the appointment ends). */
  departmentId: string | null
  /** HOD only: true while they hold an active appointment (department_heads.ended_at IS NULL). */
  hodActive: boolean
  onboardingCompletedAt: string | null
  preferences: Preferences
  name: string | null
  avatarPath: string | null
  createdAt: string
}

export const ROLE_HOME: Record<Role, string> = { MENTEE: '/mentee', MENTOR: '/mentor', HOD: '/hod', PRINCIPAL: '/principal' }

/** What the actor may see. Always derived from current DB rows, never from the client. */
export type Scope =
  | { kind: 'SELF'; studentId: string }
  | { kind: 'MENTOR'; mentorId: string }
  | { kind: 'BRANCH'; departmentId: string }
  | { kind: 'COLLEGE' }
  | { kind: 'NONE' }

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
  const [{ data: p }, { data: head }] = await Promise.all([
    db.from(table).select('full_name, avatar_path').eq('user_id', u.id).maybeSingle(),
    u.role === 'HOD' ? db.from('department_heads').select('department_id').eq('user_id', u.id).is('ended_at', null).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const hodActive = u.role === 'HOD' && !!head && head.department_id === u.department_id
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    departmentId: u.role === 'HOD' ? (hodActive ? u.department_id : null) : u.department_id,
    hodActive,
    onboardingCompletedAt: u.onboarding_completed_at,
    preferences: (u.preferences ?? {}) as Preferences,
    name: p?.full_name ?? null,
    avatarPath: p?.avatar_path ?? null,
    createdAt: u.created_at,
  }
})

/** Page/layout guard: redirects instead of throwing. */
export async function requireUser(opts: { allowIncompleteOnboarding?: boolean; allowEndedHod?: boolean } = {}): Promise<Actor> {
  const actor = await getActor()
  if (!actor) redirect('/login')
  if (actor.status === 'SUSPENDED') redirect('/suspended')
  if (actor.status === 'INVITED') redirect('/accept-invite')
  if (!opts.allowIncompleteOnboarding && !actor.onboardingCompletedAt) redirect('/setup')
  if (actor.role === 'HOD' && !actor.hodActive && !opts.allowEndedHod) redirect('/hod-access-ended')
  return actor
}

export function getScope(actor: Actor): Scope {
  if (actor.status !== 'ACTIVE') return { kind: 'NONE' }
  if (actor.role === 'MENTEE') return { kind: 'SELF', studentId: actor.id }
  if (actor.role === 'MENTOR') return { kind: 'MENTOR', mentorId: actor.id }
  if (actor.role === 'PRINCIPAL') return { kind: 'COLLEGE' }
  return actor.hodActive && actor.departmentId ? { kind: 'BRANCH', departmentId: actor.departmentId } : { kind: 'NONE' }
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
  if (actor.role === 'HOD' && !actor.hodActive) throw forbidden('Your HOD access has ended.')
  return actor
}

export function assertPrincipal(actor: Actor) {
  if (actor.role !== 'PRINCIPAL' || actor.status !== 'ACTIVE') throw forbidden()
}

/** Branch read access: the Principal reads every branch, an HOD only their own. Anything else is "not found". */
export function assertCanReadDepartment(actor: Actor, departmentId: string) {
  const s = getScope(actor)
  if (s.kind === 'COLLEGE' || (s.kind === 'BRANCH' && s.departmentId === departmentId)) return
  throw notFound()
}

/** Branch write access (student data): only the branch's own HOD — never the Principal. */
export function assertCanManageDepartment(actor: Actor, departmentId: string) {
  const s = getScope(actor)
  if (s.kind === 'BRANCH' && s.departmentId === departmentId) return
  throw notFound()
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
  // HOD: own branch only. Principal: any branch. Out of scope looks exactly like "not found".
  const { data } = await db.from('users').select('department_id, role').eq('id', studentId).maybeSingle()
  if (!data || data.role !== 'MENTEE') throw notFound()
  const scope = getScope(actor)
  if (scope.kind === 'COLLEGE') return
  if (scope.kind !== 'BRANCH' || data.department_id !== scope.departmentId) throw notFound()
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
    if (e instanceof AppError && e.code === 'NOT_FOUND') nextNotFound()
    if (e instanceof AppError) redirect(e.code === 'UNAUTHENTICATED' ? '/login' : '/403')
    throw e
  }
}
