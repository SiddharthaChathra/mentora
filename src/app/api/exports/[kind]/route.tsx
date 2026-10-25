import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { forbidden, handleRoute } from '@/server/handle'
import { clientIp } from '@/server/rate-limit'
import { buildExport } from '@/server/exports'
import { toCsv, toXlsx } from '@/server/imports'
import { getSettings } from '@/server/services/people'
import { TableReport } from '@/server/report/table-document'
import { stampPageNumbers } from '@/server/report/paginate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS = ['department-summary', 'mentor-workload', 'assignments', 'interventions', 'academic-summary', 'my-mentees'] as const

/** Controlled exports: HOD for department reports, mentors only for their own mentee list. Every export is audited. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  return handleRoute(async () => {
    const kind = z.enum(KINDS).parse((await params).kind)
    const actor = await actorOrThrow('HOD', 'MENTOR')
    if (actor.role === 'MENTOR' && kind !== 'my-mentees') throw forbidden()
    if (actor.role === 'HOD' && kind === 'my-mentees') throw forbidden()
    const sp = req.nextUrl.searchParams
    const format = z.enum(['csv', 'xlsx', 'pdf']).parse(sp.get('format') ?? 'csv')
    const db = await createClient()
    const table = await buildExport(db, actor, kind, { section: sp.get('section') || undefined, semester: sp.get('semester') || undefined })
    await db.from('audit_logs').insert({ actor_id: actor.id, action: 'export.download', entity_type: 'export', entity_id: kind, after: { format, rows: table.rows.length, section: sp.get('section'), semester: sp.get('semester') }, ip: await clientIp(), user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null })
    const name = `mentora-${kind}-${new Date().toISOString().slice(0, 10)}.${format}`
    if (format === 'csv') {
      return new Response('﻿' + toCsv(table.columns.map((c) => c.key), table.rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
    }
    if (format === 'xlsx') {
      const buf = await toXlsx(table.title.slice(0, 31), table.columns, table.rows)
      return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
    }
    const settings = await getSettings(db)
    const pdf = await stampPageNumbers(await renderToBuffer(<TableReport table={table} institution={settings.institutionName} generatedAt={new Date()} />))
    return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } })
  })
}
