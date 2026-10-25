import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/server/supabase'

const SAFE_NEXT = /^\/(accept-invite|reset-password|setup|dashboard)(\/|$|\?)/

/** Handles invite / recovery / magic-link email links (token_hash or PKCE code). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') ?? ''
  const fallback = type === 'recovery' ? '/reset-password' : type === 'invite' ? '/accept-invite' : '/dashboard'
  const next = SAFE_NEXT.test(rawNext) ? rawNext : fallback

  const db = await createClient()
  let ok = false
  if (tokenHash && type) ok = !(await db.auth.verifyOtp({ type, token_hash: tokenHash })).error
  else if (code) ok = !(await db.auth.exchangeCodeForSession(code)).error

  const dest = request.nextUrl.clone()
  dest.search = ''
  if (ok) {
    dest.pathname = next.split('?')[0]!
    return NextResponse.redirect(dest)
  }
  dest.pathname = '/login'
  dest.searchParams.set('error', 'link')
  return NextResponse.redirect(dest)
}
