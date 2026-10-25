import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'

config({ path: process.env.ENV_FILE ?? '.env.local' })

export function env(name: string) {
  const v = process.env[name]
  if (!v) {
    console.error(`✖ Missing ${name} in ${process.env.ENV_FILE ?? '.env.local'}`)
    process.exit(1)
  }
  return v
}

export function admin(): SupabaseClient<Database> {
  return createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) {
    console.error(`✖ ${what}: ${res.error.message}`)
    process.exit(1)
  }
  return res.data as NonNullable<T>
}

/** Create (or find) an auth user with a confirmed email and the given password. */
export async function ensureAuthUser(db: SupabaseClient<Database>, email: string, password: string) {
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.data.user) return created.data.user.id
  // Already exists: look it up page by page.
  for (let page = 1; page < 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 })
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) {
      await db.auth.admin.updateUserById(found.id, { password, email_confirm: true })
      return found.id
    }
    if (data.users.length < 200) break
  }
  throw new Error(`Could not create or find ${email}: ${created.error?.message}`)
}

export const DEFAULT_BANDS = [
  { min_pct: 90, grade: 'O', points: 10 },
  { min_pct: 80, grade: 'A+', points: 9 },
  { min_pct: 70, grade: 'A', points: 8 },
  { min_pct: 60, grade: 'B+', points: 7 },
  { min_pct: 55, grade: 'B', points: 6 },
  { min_pct: 50, grade: 'C', points: 5 },
  { min_pct: 40, grade: 'P', points: 4 },
  { min_pct: 0, grade: 'F', points: 0 },
]
