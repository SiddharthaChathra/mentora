import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/server/supabase'
import { actorOrThrow } from '@/server/authz'
import { handleRoute, must } from '@/server/handle'
import { toCsv } from '@/server/imports'

/** CSV error report for an import job (row number + problems). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await actorOrThrow('HOD')
    const db = await createClient()
    const job = must(await db.from('import_jobs').select('id, file_name, errors').eq('id', z.uuid().parse((await params).id)).maybeSingle())
    const rows = ((job.errors as { row: number; errors: string[] }[]) ?? []).map((e) => ({ row: e.row, problems: e.errors.join('; ') }))
    return new Response(toCsv(['row', 'problems'], rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="errors-${job.file_name.replace(/\.[^.]+$/, '')}.csv"` },
    })
  })
}
