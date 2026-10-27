import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { serverEnv } from '@/server/env'
import { getSettings } from '@/server/services/people'
import { branchGradingAllowed, loadThresholds } from '@/server/services/academics'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsWorkspace } from '@/features/admin/settings'
import type { GradeBand } from '@/lib/grading'

export const metadata: Metadata = { title: 'College settings' }

/** College defaults: grading scheme, risk rules, academic years, branch-grading switch, sign-up rules, features. */
export default async function PrincipalSettingsPage() {
  await requireRole('PRINCIPAL')
  const db = await createClient()
  const [allowed, { data: schemes }, thresholds, { data: years }, app, { data: rows }] = await Promise.all([
    branchGradingAllowed(db),
    db.from('grading_schemes').select('id, name, version, bands, pass_pct, mse_weight, active, created_at').is('department_id', null).order('version', { ascending: false }),
    loadThresholds(db, null),
    db.from('academic_years').select('label, starts_on, ends_on, is_current').order('label', { ascending: false }),
    getSettings(db),
    db.from('app_settings').select('key, value').in('key', ['self_signup', 'student_email_domain']),
  ])
  const setting = (k: string) => rows?.find((r) => r.key === k)?.value
  return (
    <>
      <PageHeader title="College" accent="settings" description="The defaults every branch follows. Branch HODs keep sections and subjects; grading overrides only when you allow them. Changes are audited." />
      <SettingsWorkspace
        mode="principal"
        schemes={(schemes ?? []).map((s) => ({ ...s, bands: s.bands as GradeBand[], pass_pct: Number(s.pass_pct), mse_weight: Number(s.mse_weight) }))}
        thresholds={thresholds as unknown as Record<string, number>}
        sections={[]}
        years={years ?? []}
        subjects={[]}
        app={app}
        aiAvailable={serverEnv.aiEnabled}
        college={{ allowBranchGrading: allowed, selfSignup: setting('self_signup') !== false, studentEmailDomain: typeof setting('student_email_domain') === 'string' ? (setting('student_email_domain') as string) : '' }}
      />
    </>
  )
}
