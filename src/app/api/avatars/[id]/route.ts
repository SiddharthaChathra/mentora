import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/server/supabase'
import { getActor } from '@/server/authz'

/**
 * Streams a profile photo from the private `avatars` bucket. The download runs as the signed-in
 * user, so storage RLS (app.can_view_avatar) decides access; nothing is ever public.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = z.uuid().safeParse(id)
  const actor = await getActor()
  if (!parsed.success || !actor || actor.status === 'SUSPENDED') return new NextResponse(null, { status: 404 })
  const db = await createClient()
  const { data: u } = await db.from('users').select('role').eq('id', id).maybeSingle()
  if (!u) return new NextResponse(null, { status: 404 })
  const table = u.role === 'MENTEE' ? 'student_profiles' : u.role === 'MENTOR' ? 'mentor_profiles' : 'hod_profiles'
  const { data: p } = await db.from(table).select('avatar_path').eq('user_id', id).maybeSingle()
  if (!p?.avatar_path) return new NextResponse(null, { status: 404 })
  const { data: blob } = await db.storage.from('avatars').download(p.avatar_path)
  if (!blob) return new NextResponse(null, { status: 404 })
  return new NextResponse(blob, {
    headers: {
      'Content-Type': blob.type || 'image/webp',
      'Cache-Control': 'private, max-age=600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
