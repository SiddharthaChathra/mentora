import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { actorOrThrow } from '@/server/authz'
import { handleRoute } from '@/server/handle'
import { IMPORT_KINDS, toCsv, toXlsx } from '@/server/imports'

/** Downloadable import templates (CSV or XLSX) with one example row. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  return handleRoute(async () => {
    await actorOrThrow('HOD')
    const kind = z.enum(['students', 'mentors', 'subjects', 'results']).parse((await params).kind)
    const def = IMPORT_KINDS[kind]
    const xlsx = req.nextUrl.searchParams.get('format') === 'xlsx'
    const body = xlsx ? await toXlsx(def.label, def.columns.map((c) => ({ key: c, header: c })), [def.example]) : toCsv(def.columns, [def.example])
    return new Response(typeof body === 'string' ? body : new Uint8Array(body), {
      headers: {
        'Content-Type': xlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mentora-${kind}-template.${xlsx ? 'xlsx' : 'csv'}"`,
      },
    })
  })
}
