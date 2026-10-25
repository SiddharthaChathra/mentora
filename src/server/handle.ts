import 'server-only'
import { ZodError } from 'zod'
import { NextResponse } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import type { ActionError, ActionResult, ErrorCode } from '@/lib/result'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
  }
}

export const forbidden = (msg = 'You do not have access to this.') => new AppError('FORBIDDEN', msg)
export const notFound = (msg = 'Not found.') => new AppError('NOT_FOUND', msg)
export const badRequest = (msg: string) => new AppError('BAD_REQUEST', msg)

type PgLike = { code?: string; message?: string; details?: string | null; hint?: string | null }

/** Map Postgres / PostgREST errors to safe, user-facing errors. */
export function fromDbError(e: PgLike): AppError {
  switch (e.code) {
    case '42501':
      return new AppError(
        'FORBIDDEN',
        !e.message || e.message.startsWith('new row violates') || e.message.startsWith('permission denied')
          ? 'You do not have permission to do that.'
          : e.message,
      )
    case 'P0001':
      return new AppError('BAD_REQUEST', e.message ?? 'Request rejected')
    case 'P0002':
    case 'PGRST116':
      return new AppError('NOT_FOUND', 'Not found.')
    case '23505':
      return new AppError('CONFLICT', conflictMessage(e))
    case '23514':
    case '22P02':
    case '22003':
      return new AppError('VALIDATION', 'Some values are out of the allowed range.')
    case '23503':
      return new AppError('CONFLICT', 'This record is linked to other data.')
    default:
      console.error('[mentora] db error', e)
      return new AppError('INTERNAL', 'Something went wrong. Please try again.')
  }
}

function conflictMessage(e: PgLike) {
  const m = `${e.message} ${e.details ?? ''}`
  if (m.includes('usn')) return 'That USN is already registered.'
  if (m.includes('faculty_id')) return 'That faculty ID is already registered.'
  if (m.includes('subjects_dept_code')) return 'A subject with this code already exists.'
  if (m.includes('semester_no')) return 'That semester already exists.'
  if (m.includes('email')) return 'That email is already registered.'
  return 'That record already exists.'
}

/** Throw on a Supabase error, return non-null data otherwise. */
export function must<T>(res: { data: T; error: PgLike | null }): NonNullable<T> {
  if (res.error) throw fromDbError(res.error)
  if (res.data == null) throw notFound()
  return res.data as NonNullable<T>
}

/** Throw on a Supabase error, allow empty data. */
export function check<T>(res: { data?: T; error: PgLike | null }): T {
  if (res.error) throw fromDbError(res.error)
  return res.data as T
}

function toActionError(e: unknown): ActionError {
  if (e instanceof AppError) return { code: e.code, message: e.message, fieldErrors: e.fieldErrors }
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of e.issues) {
      const key = issue.path.join('.') || '_'
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { code: 'VALIDATION', message: e.issues[0]?.message ?? 'Please check the highlighted fields.', fieldErrors }
  }
  if (e && typeof e === 'object' && 'code' in e && typeof (e as PgLike).code === 'string') {
    return toActionError(fromDbError(e as PgLike))
  }
  console.error('[mentora] unhandled error', e)
  return { code: 'INTERNAL', message: 'Something went wrong. Please try again.' }
}

/** Single wrapper for server actions: consistent result shape, safe messages, server-side logging. */
export async function handle<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (e) {
    unstable_rethrow(e)
    return { ok: false, error: toActionError(e) }
  }
}

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  BAD_REQUEST: 400,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

/** Same wrapper for route handlers → JSON { ok, data } | { ok, error } with a matching HTTP status. */
export async function handleRoute<T>(fn: () => Promise<T | Response>): Promise<Response> {
  try {
    const data = await fn()
    if (data instanceof Response) return data
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    const error = toActionError(e)
    return NextResponse.json({ ok: false, error }, { status: STATUS[error.code] })
  }
}
