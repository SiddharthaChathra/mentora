import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { serverEnv } from '@/server/env'
import { getSettings, listSections } from '@/server/services/people'
import { loadThresholds } from '@/server/services/academics'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsWorkspace } from '@/features/admin/settings'
import type { GradeBand } from '@/lib/grading'

export const metadata: Metadata = { title: 'Settings' }

export default async function HodSettingsPage() {
  const actor = await requireRole('HOD')
  const db = await createClient()
  const [{ data: schemes }, thresholds, sections, { data: years }, { data: subjects }, app] = await Promise.all([
    db.from('grading_schemes').select('id, name, version, bands, pass_pct, mse_weight, active, created_at').eq('department_id', actor.departmentId!).order('version', { ascending: false }),
    loadThresholds(db, actor.departmentId),
    listSections(db, actor.departmentId),
    db.from('academic_years').select('label, starts_on, ends_on, is_current').order('label', { ascending: false }),
    db.from('subjects').select('id, code, name, credits, semester, mse_max, see_max, is_verified').eq('department_id', actor.departmentId!).order('is_verified').order('semester').order('code'),
    getSettings(db),
  ])
  return (
    <>
      <PageHeader title="Department" accent="settings" description="Grading rules, risk thresholds, structure, subjects and optional features. Changes are audited." />
      <SettingsWorkspace
        schemes={(schemes ?? []).map((s) => ({ ...s, bands: s.bands as GradeBand[], pass_pct: Number(s.pass_pct), mse_weight: Number(s.mse_weight) }))}
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
