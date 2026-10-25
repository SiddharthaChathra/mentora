import 'server-only'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required environment variable ${name}`)
  return v
}

export const serverEnv = {
  get supabaseUrl() { return required('NEXT_PUBLIC_SUPABASE_URL') },
  get anonKey() { return required('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
  get serviceRoleKey() { return required('SUPABASE_SERVICE_ROLE_KEY') },
  get siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000' },
  get resendKey() { return process.env.RESEND_API_KEY || null },
  get emailFrom() { return process.env.EMAIL_FROM || 'Mentora <onboarding@resend.dev>' },
  get geminiKey() { return process.env.GEMINI_API_KEY || null },
  get aiEnabled() { return process.env.AI_INSIGHTS_ENABLED === 'true' && !!process.env.GEMINI_API_KEY },
  get cronSecret() { return process.env.CRON_SECRET || null },
}
