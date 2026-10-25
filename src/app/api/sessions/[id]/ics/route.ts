import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { handleRoute, must } from '@/server/handle'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** iCalendar export for one session (RLS decides visibility). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await actorOrThrow()
    const id = z.uuid().parse((await params).id)
    const db = await createClient()
    const s = must(await db.from('mentoring_sessions').select('id, scheduled_at, duration_min, agenda, location_or_link, mode, mentor_id').eq('id', id).maybeSingle())
    const { data: m } = await db.from('mentor_profiles').select('full_name').eq('user_id', s.mentor_id).maybeSingle()
    const start = new Date(s.scheduled_at)
    const end = new Date(start.getTime() + s.duration_min * 60_000)
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mentora//Mentoring Sessions//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${s.id}@mentora`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`Mentoring session${m?.full_name ? ` with ${m.full_name}` : ''}`)}`,
      `DESCRIPTION:${esc(s.agenda || 'Mentoring session')}`,
      s.location_or_link ? `LOCATION:${esc(s.location_or_link)}` : '',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Mentoring session in 30 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n')
    return new Response(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="mentora-session-${start.toISOString().slice(0, 10)}.ics"`,
        'Cache-Control': 'no-store',
      },
    })
  })
}
