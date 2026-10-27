import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { serverEnv } from '@/server/env'
import { getSettings, listSections } from '@/server/services/people'
import { branchGradingAllowed, loadThresholds } from '@/server/services/academics'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsWorkspace } from '@/features/admin/settings'
import type { GradeBand } from '@/lib/grading'

export const metadata: Metadata = { title: 'Settings' }

export default async function HodSettingsPage() {
  const actor = await requireRole('HOD')
  const db = await createClient()
  const [allowed, { data: own }, { data: college }, thresholds, sections, { data: years }, { data: subjects }, app] = await Promise.all([
    branchGradingAllowed(db),
    db.from('grading_schemes').select('id, name, version, bands, pass_pct, mse_weight, active, created_at').eq('department_id', actor.departmentId!).order('version', { ascending: false }),
    db.from('grading_schemes').select('id, name, version, bands, pass_pct, mse_weight, active, created_at').is('department_id', null).order('version', { ascending: false }),
    loadThresholds(db, actor.departmentId),
    listSections(db, actor.departmentId),
    db.from('academic_years').select('label, starts_on, ends_on, is_current').order('label', { ascending: false }),
    db.from('subjects').select('id, code, name, credits, semester, mse_max, see_max, is_verified').eq('department_id', actor.departmentId!).order('is_verified').order('semester').order('code'),
    getSettings(db),
  ])
  // A branch override only applies while the Principal allows it; otherwise the branch follows the college default.
  const schemes = allowed && own?.length ? own : (college ?? [])
  return (
    <>
      <PageHeader title="Branch" accent="settings" description="Grading rules, risk thresholds, sections and subjects for your branch. Changes are audited." />
      <SettingsWorkspace
        mode="hod"
        locked={allowed ? null : 'Your branch uses the college grading scheme and risk rules set by the Principal. Ask them to allow branch-specific grading to change these.'}
        schemes={schemes.map((s) => ({ ...s, bands: s.bands as GradeBand[], pass_pct: Number(s.pass_pct), mse_weight: Number(s.mse_weight) }))}
        thresholds={thresholds as unknown as Record<string, number>}
        sections={sections}
        years={years ?? []}
        subjects={(subjects ?? []).map((s) => ({ ...s, credits: Number(s.credits), mse_max: s.mse_max == null ? null : Number(s.mse_max), see_max: s.see_max == null ? null : Number(s.see_max) }))}
        app={app}
        aiAvailable={serverEnv.aiEnabled}
      />
    </>
  )
}
