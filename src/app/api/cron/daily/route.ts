import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { serverEnv } from '@/server/env'
import { runDailyReminders } from '@/server/admin/reminders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(req: NextRequest) {
  const secret = serverEnv.cronSecret
  const header = req.headers.get('authorization') ?? ''
  if (!secret || !header.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7))
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Daily reminders. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } }, { status: 401 })
  try {
    const data = await runDailyReminders()
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    console.error('[mentora] cron failed', e)
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Reminder job failed' } }, { status: 500 })
  }
}
