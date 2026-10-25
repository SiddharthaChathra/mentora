export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'BAD_REQUEST' | 'RATE_LIMITED' | 'INTERNAL'

export type ActionError = { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> }
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ActionError }
