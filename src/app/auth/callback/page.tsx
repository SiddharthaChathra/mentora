'use client'

import * as React from 'react'
import { browserClient } from '@/lib/supabase-browser'

const SAFE_NEXT = /^\/(accept-invite|reset-password|setup|dashboard)(\/|$|\?)/

/**
 * Completes email links that use Supabase's implicit flow (session in the #fragment):
 * invites, password resets and sign-up confirmations sent with the default templates.
 */
export default function AuthCallbackPage() {
  React.useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const rawNext = new URLSearchParams(window.location.search).get('next') ?? ''
    const type = hash.get('type')
    const fallback = type === 'recovery' ? '/reset-password' : type === 'invite' ? '/accept-invite' : '/dashboard'
    const next = SAFE_NEXT.test(rawNext) ? rawNext : fallback
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    const fail = () => window.location.replace('/login?error=link')
    if (!access_token || !refresh_token) return fail()
    browserClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => (error ? fail() : window.location.replace(next)))
      .catch(fail)
  }, [])
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
      <p className="text-sm text-ink-500" role="status">
        Signing you in…
      </p>
    </main>
  )
}
