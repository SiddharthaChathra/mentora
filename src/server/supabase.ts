import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { serverEnv } from './env'

/** Request-scoped client acting as the signed-in user. RLS always applies. */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(serverEnv.supabaseUrl, serverEnv.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  })
}

export type DB = Awaited<ReturnType<typeof createClient>>
