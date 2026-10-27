/**
 * Base seed (idempotent): branches from config/branches.json, sections, academic years, the college default
 * grading scheme + risk thresholds, app settings, the first HOD (SEED_HOD_*) appointed to EXISTING_DATA_BRANCH_CODE,
 * and the Principal (SEED_PRINCIPAL_*).
 * Usage: pnpm db:seed   (ENV_FILE=.env.production.local pnpm db:seed for prod)
 */
import { readFileSync } from 'node:fs'
import { admin, DEFAULT_BANDS, ensureAuthUser, env, must } from './lib'

type BranchConfig = { code: string; name: string; usn_code?: string }

export function readBranches(): BranchConfig[] {
  const list = JSON.parse(readFileSync('config/branches.json', 'utf8')) as BranchConfig[]
  if (!Array.isArray(list) || !list.length) throw new Error('config/branches.json must list at least one branch')
  for (const b of list) if (!/^[A-Z0-9]{2,12}$/.test(b.code) || !b.name) throw new Error(`Invalid branch ${JSON.stringify(b)}`)
  return list
}

export async function seedBase() {
  const db = admin()
  const hodEmail = env('SEED_HOD_EMAIL').toLowerCase()
  const hodPassword = env('SEED_HOD_PASSWORD')
  const existingCode = (process.env.EXISTING_DATA_BRANCH_CODE || 'CSE').toUpperCase()
  const branches = readBranches()

  // The department that already holds data is matched to EXISTING_DATA_BRANCH_CODE (renamed if needed, never duplicated).
  const { data: depts } = await db.from('departments').select('id, code').order('created_at')
  if (depts?.length === 1 && depts[0]!.code !== existingCode && !depts.some((d) => d.code === existingCode)) {
    must(await db.from('departments').update({ code: existingCode }).eq('id', depts[0]!.id), 'rename existing branch')
  }
  for (const [i, b] of branches.entries()) {
    must(
      await db.from('departments').upsert({ code: b.code, name: b.name, usn_code: b.usn_code?.toLowerCase() ?? null, display_order: i }, { onConflict: 'code' }),
      `branch ${b.code}`,
    )
  }
  const dept = must(await db.from('departments').select().eq('code', existingCode).single(), `branch ${existingCode}`)

  const { data: allDepts } = await db.from('departments').select('id, code')
  for (const d of allDepts ?? []) {
    for (const name of ['A', 'B', 'C']) {
      must(await db.from('sections').upsert({ department_id: d.id, name }, { onConflict: 'department_id,name' }), `section ${d.code} ${name}`)
    }
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

  // College default (department_id NULL); branches may override only when the Principal allows it.
  const { data: scheme } = await db.from('grading_schemes').select('id').is('department_id', null).eq('active', true).maybeSingle()
  if (!scheme) {
    must(
      await db.from('grading_schemes').insert({
        department_id: null,
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
      await db.from('risk_thresholds').upsert({ department_id: null, rule_key, value }, { onConflict: 'department_id,rule_key', ignoreDuplicates: true }),
      `threshold ${rule_key}`,
    )
  }

  const settings: Record<string, unknown> = {
    optional_profile_fields: { dob: true, gender: true, address: true },
    attendance_category_enabled: true,
    ai_insights_enabled: false,
    institution_name: 'Mentora Institute of Technology',
    program_total_credits: 160,
    allow_branch_grading: false,
    student_email_domain: (process.env.STUDENT_EMAIL_DOMAIN ?? '').trim().toLowerCase(),
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
  const { data: head } = await db.from('department_heads').select('user_id').eq('department_id', dept.id).is('ended_at', null).maybeSingle()
  if (!head) must(await db.from('department_heads').insert({ department_id: dept.id, user_id: hodId, reason: 'Initial seed' }), 'HOD appointment')

  const principalEmail = process.env.SEED_PRINCIPAL_EMAIL?.toLowerCase()
  if (principalEmail) {
    const principalId = await ensureAuthUser(db, principalEmail, env('SEED_PRINCIPAL_PASSWORD'))
    must(
      await db.from('users').upsert(
        { id: principalId, email: principalEmail, role: 'PRINCIPAL', status: 'ACTIVE', department_id: null, onboarding_completed_at: new Date().toISOString() },
        { onConflict: 'id' },
      ),
      'Principal user',
    )
    must(await db.from('hod_profiles').upsert({ user_id: principalId, full_name: 'Dr. Principal', designation: 'Principal' }, { onConflict: 'user_id', ignoreDuplicates: true }), 'Principal profile')
  }

  console.log(`✔ Base seed complete. ${branches.length} branches; existing data in ${dept.code}; HOD ${hodEmail}${principalEmail ? '; Principal ' + principalEmail : ''}`)
  return { db, dept, hodId }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('seed/seed.ts')) {
  seedBase().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
