import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { serverEnv } from '../env'

/**
 * Service-role client: bypasses RLS. Only import from /src/server/admin/* and only
 * after an HOD (or cron-secret) check has passed.
 */
export function createAdminClient() {
  return createClient<Database>(serverEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
