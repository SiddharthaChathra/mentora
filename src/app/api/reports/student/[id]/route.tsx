import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/server/supabase'
import { actorOrThrow, assertCanViewStudent } from '@/server/authz'
import { handleRoute, notFound } from '@/server/handle'
import { clientIp } from '@/server/rate-limit'
import { loadReportData } from '@/server/report/data'
import { StudentReport } from '@/server/report/document'
import { stampPageNumbers } from '@/server/report/paginate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Individual student PDF. The student's ACTIVE mentor, their branch HOD or the Principal (read-only); every download is audited. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const actor = await actorOrThrow('MENTOR', 'HOD', 'PRINCIPAL')
    const id = z.uuid().parse((await params).id)
    const db = await createClient()
    await assertCanViewStudent(actor, id, db)
    const data = await loadReportData(db, id)
    if (!data) throw notFound('Student not found.')
    const pdf = await stampPageNumbers(await renderToBuffer(<StudentReport data={data} />))
    await db.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'report.download',
      entity_type: 'student_report',
      entity_id: id,
      after: { semesters: data.semesters.length, mentoring_records: data.mentoring.length },
      ip: await clientIp(),
      user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
    })
    const slug = (data.student.usn ?? data.student.name).replace(/[^\w-]+/g, '_')
    const inline = req.nextUrl.searchParams.get('inline') === '1'
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="Mentora_Report_${slug}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  })
}
