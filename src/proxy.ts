import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/mentee', '/mentor', '/hod', '/principal', '/hod-access-ended', '/setup', '/account', '/notifications', '/dashboard', '/accept-invite']
const AUTH_PAGES = ['/login', '/forgot-password', '/signup']

/**
 * Refreshes the Supabase session cookie and does a coarse "signed in?" check.
 * Role routing and every permission check happen server-side in layouts, actions and RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) response.cookies.set(name, value, options)
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))

  if (!data.user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = path === '/dashboard' ? '' : `?next=${encodeURIComponent(path + request.nextUrl.search)}`
    return NextResponse.redirect(url)
  }
  // A Principal following an HOD link (e.g. from a notification) lands on the matching read-only Principal page.
  if (data.user && (path === '/hod' || path.startsWith('/hod/'))) {
    const { data: me } = await supabase.from('users').select('role').eq('id', data.user.id).maybeSingle()
    if (me?.role === 'PRINCIPAL') {
      const url = request.nextUrl.clone()
      url.pathname = principalPathFor(path)
      return NextResponse.redirect(url)
    }
  }
  if (data.user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

const PRINCIPAL_TWINS = ['students', 'mentors', 'analytics', 'interventions', 'users', 'imports', 'exports', 'settings', 'audit']

function principalPathFor(hodPath: string) {
  const [, , section, id] = hodPath.split('/')
  if (section === 'students' && id) return `/principal/students/${id}`
  if (section === 'assignments') return '/principal/students'
  return section && PRINCIPAL_TWINS.includes(section) ? `/principal/${section}` : '/principal'
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|illustrations|fonts|api/cron|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
}
