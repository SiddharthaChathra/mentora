import type { Metadata } from 'next'
import { FileDown, FileSpreadsheet, FileText, Network, ShieldAlert, Users, BarChart3 } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listSections } from '@/server/services/people'
import { EXPORTS } from '@/server/exports'
import { PageHeader } from '@/components/ui/page-header'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardBody, IconChip } from '@/components/ui/primitives'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'

export const metadata: Metadata = { title: 'Exports' }

const ICON = { 'department-summary': BarChart3, 'mentor-workload': Users, assignments: Network, interventions: ShieldAlert, 'academic-summary': FileText } as const

export default async function HodExportsPage({ searchParams }: { searchParams: Promise<{ section?: string; semester?: string }> }) {
  const actor = await requireRole('HOD')
  const sp = await searchParams
  const db = await createClient()
  const sections = await listSections(db, actor.departmentId)
  const qs = (format: string) => {
    const p = new URLSearchParams({ format })
    if (sp.section && sp.section !== 'all') p.set('section', sp.section)
    if (sp.semester && sp.semester !== 'all') p.set('semester', sp.semester)
    return p.toString()
  }
  return (
    <>
      <PageHeader title="Reports &" accent="exports" description="Consolidated, HOD-only exports for meetings and records. Every download is logged in the audit history." />
      <DirectoryToolbar
        storageKey="m_hod_export_filters"
        filters={[
          { param: 'section', label: 'Section', options: [{ value: 'all', label: 'All sections' }, ...sections.map((s) => ({ value: s.name, label: `Section ${s.name}` }))] },
          { param: 'semester', label: 'Semester', options: [{ value: 'all', label: 'All semesters' }, ...Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))] },
        ]}
      />
      <ul className="stagger grid gap-4 md:grid-cols-2">
        {(Object.keys(EXPORTS) as (keyof typeof EXPORTS)[]).map((k) => (
          <li key={k}>
            <Card className="h-full">
              <CardBody className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <IconChip icon={ICON[k]} tone="brand" />
                  <div>
                    <h2 className="font-semibold text-ink-900">{EXPORTS[k].title}</h2>
                    <p className="mt-0.5 text-sm text-ink-500">{EXPORTS[k].description}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 pt-1">
                  <a className={buttonVariants({ size: 'sm', variant: 'secondary' })} href={`/api/exports/${k}?${qs('csv')}`}>
                    <FileDown /> CSV
                  </a>
                  <a className={buttonVariants({ size: 'sm', variant: 'secondary' })} href={`/api/exports/${k}?${qs('xlsx')}`}>
                    <FileSpreadsheet /> Excel
                  </a>
                  <a className={buttonVariants({ size: 'sm' })} href={`/api/exports/${k}?${qs('pdf')}`}>
                    <FileText /> PDF summary
                  </a>
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-500">Individual student PDF reports are on each student’s profile (Report tab). Exports contain records only — never charts, automated insights or AI text.</p>
    </>
  )
}
