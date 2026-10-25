/**
 * Base seed (idempotent): department, sections, academic years, default grading scheme,
 * risk thresholds, app settings and the first HOD from SEED_HOD_EMAIL / SEED_HOD_PASSWORD.
 * Usage: pnpm db:seed   (ENV_FILE=.env.production.local pnpm db:seed for prod)
 */
import { admin, DEFAULT_BANDS, ensureAuthUser, env, must } from './lib'

export async function seedBase() {
  const db = admin()
  const hodEmail = env('SEED_HOD_EMAIL').toLowerCase()
  const hodPassword = env('SEED_HOD_PASSWORD')

  const dept = must(
    await db.from('departments').upsert({ code: 'CSE', name: 'Computer Science & Engineering' }, { onConflict: 'code' }).select().single(),
    'department',
  )

  for (const name of ['A', 'B', 'C']) {
    must(await db.from('sections').upsert({ department_id: dept.id, name }, { onConflict: 'department_id,name' }), `section ${name}`)
  }

  const now = new Date()
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  for (let y = startYear - 4; y <= startYear; y++) {
    const label = `${y}-${String((y + 1) % 100).padStart(2, '0')}`
    must(
      await db
        .from('academic_years')
        .upsert({ label, starts_on: `${y}-08-01`, ends_on: `${y + 1}-07-31`, is_current: false }, { onConflict: 'label' }),
      `academic year ${label}`,
    )
  }
  const currentLabel = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
  must(await db.from('academic_years').update({ is_current: false }).neq('label', currentLabel), 'reset current year')
  must(await db.from('academic_years').update({ is_current: true }).eq('label', currentLabel), 'current year')

  const { data: scheme } = await db.from('grading_schemes').select('id').eq('department_id', dept.id).eq('active', true).maybeSingle()
  if (!scheme) {
    must(
      await db.from('grading_schemes').insert({
        department_id: dept.id,
        name: '10-point CBCS (credit weighted)',
        version: 1,
        bands: DEFAULT_BANDS,
        pass_pct: 40,
        mse_weight: 0.5,
        see_weight: 0.5,
        max_grade_points: 10,
        active: true,
      }),
      'grading scheme',
    )
  }

  const thresholds = { STRONG_PCT: 75, DECLINE_PCT_POINTS: 10, SGPA_DROP: 0.5, LOW_PCT: 40, LOW_MIN_COUNT: 2, PROFILE_INCOMPLETE_DAYS: 14 }
  for (const [rule_key, value] of Object.entries(thresholds)) {
    must(
      await db.from('risk_thresholds').upsert({ department_id: dept.id, rule_key, value }, { onConflict: 'department_id,rule_key', ignoreDuplicates: true }),
      `threshold ${rule_key}`,
    )
  }

  const settings: Record<string, unknown> = {
    optional_profile_fields: { dob: true, gender: true, address: true },
    attendance_category_enabled: true,
    ai_insights_enabled: false,
    institution_name: 'Mentora Institute of Technology',
    program_total_credits: 160,
  }
  for (const [key, value] of Object.entries(settings)) {
    must(await db.from('app_settings').upsert({ key, value: value as never }, { onConflict: 'key', ignoreDuplicates: true }), `setting ${key}`)
  }

  const hodId = await ensureAuthUser(db, hodEmail, hodPassword)
  must(
    await db.from('users').upsert(
      { id: hodId, email: hodEmail, role: 'HOD', status: 'ACTIVE', department_id: dept.id, onboarding_completed_at: new Date().toISOString() },
      { onConflict: 'id' },
    ),
    'HOD user',
  )
  must(
    await db.from('hod_profiles').upsert({ user_id: hodId, full_name: 'Dr. Meera Krishnan', designation: 'Professor & Head of Department' }, { onConflict: 'user_id', ignoreDuplicates: true }),
    'HOD profile',
  )

  console.log(`✔ Base seed complete. Department ${dept.code}; HOD ${hodEmail}`)
  return { db, dept, hodId }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('seed/seed.ts')) {
  seedBase().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
