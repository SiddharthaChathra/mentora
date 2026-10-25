import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/server/supabase'
import { actorOrThrow, assertCanAccessFile } from '@/server/authz'
import { handleRoute } from '@/server/handle'

/** Authorize, then hand out a signed URL that lives 60 seconds. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const actor = await actorOrThrow()
    const id = z.uuid().parse((await params).id)
    const db = await createClient()
    const file = await assertCanAccessFile(actor, id, db)
    const inline = req.nextUrl.searchParams.get('inline') === '1'
    const { data, error } = await db.storage.from('resources').createSignedUrl(file.file_path, 60, inline ? undefined : { download: file.file_name ?? true })
    if (error || !data) throw error ?? new Error('sign failed')
    if (actor.role === 'MENTEE') {
      await db.from('content_views').upsert({ user_id: actor.id, entity_type: 'resource', entity_id: id }, { onConflict: 'user_id,entity_type,entity_id', ignoreDuplicates: true })
    }
    return NextResponse.redirect(data.signedUrl, { headers: { 'Cache-Control': 'no-store' } })
  })
}
