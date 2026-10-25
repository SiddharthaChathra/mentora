import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadStudentAcademics } from '@/server/services/academics'
import { getSettings, getStudentProfile } from '@/server/services/people'
import { PageHeader } from '@/components/ui/page-header'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { Card, CardBody } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { CreditProgress } from '@/components/charts/academic'
import { IllustratedScoreCard, PastelStatTile } from '@/components/ui/display'
import { AddSemesterButton } from '@/features/academics/add-semester'
import { SemesterCards } from '@/features/academics/semester-view'

export const metadata: Metadata = { title: 'Academic records' }

export default async function MenteeAcademicsPage() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [academics, profile, settings, scope] = await Promise.all([loadStudentAcademics(db, actor.id, actor.departmentId), getStudentProfile(db, actor.id), getSettings(db), getSemesterScope()])
  const shown = scope ? academics.semesters.filter((s) => s.semesterNo === scope) : academics.semesters
  const existing = academics.semesters.map((s) => s.semesterNo)
  const maxSemester = Math.max(profile?.currentSemester ?? 8, ...existing, 1)
  const add = <AddSemesterButton existing={existing} maxSemester={maxSemester} admissionYear={profile?.admissionYear ?? null} hrefBase="/mentee/academics" />

  return (
    <>
      <PageHeader title="Academic" accent="records" description="Semester-wise subjects, marks and grades. Drafts are yours to edit; submitted semesters are verified by your mentor." actions={add} />
      <ScopeChip scope={scope} label={shown.length ? `Showing semester ${scope} only.` : `You haven’t added semester ${scope} yet.`} />
      {academics.semesters.length === 0 ? (
        <Card>
          <EmptyState
            illustration="no-marks"
            title="No marks yet"
            description="Add your first semester to see your SGPA, CGPA and performance trends. Everything autosaves as you type."
            action={<AddSemesterButton existing={existing} maxSemester={maxSemester} admissionYear={profile?.admissionYear ?? null} hrefBase="/mentee/academics" label="Add your first semester" />}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
            <IllustratedScoreCard
              label="CGPA"
              help="CGPA"
              value={academics.cgpa.value?.cgpa ?? null}
              reason={academics.cgpa.reason}
              caption={
                academics.cgpa.value
                  ? `Across ${academics.cgpa.value.includedSemesters.length} semesters${academics.cgpa.value.excludedSemesters.length ? ` · excludes sem ${academics.cgpa.value.excludedSemesters.map((e) => e.semesterNo).join(', ')} (incomplete)` : ''}`
                  : undefined
              }
            />
            <Card>
              <CardBody>
                <p className="text-lg font-semibold text-ink-900">Credit completion</p>
                <CreditProgress className="mt-3" earned={academics.creditsEarned} inProgress={academics.creditsInProgress} required={settings.programCredits} />
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ['DRAFT', 'Drafts', 'lilac'],
                      ['SUBMITTED', 'Submitted', 'peach'],
                      ['VERIFIED', 'Verified', 'blue'],
                      ['FINALIZED', 'Finalized', 'green'],
                    ] as const
                  ).map(([st, label, tile]) => (
                    <PastelStatTile key={st} label={label} value={academics.semesters.filter((s) => s.status === st).length} tile={tile} className="p-4" />
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-500">Marks, percentages, grades, SGPA and CGPA are kept separate. A value is only calculated when the grading rules and every input exist.</p>
              </CardBody>
            </Card>
          </div>
          <section aria-labelledby="sem-heading">
            <h2 id="sem-heading" className="mb-3 text-base font-semibold text-ink-900">
              Semesters
            </h2>
            <SemesterCards semesters={[...shown].reverse()} hrefBase="/mentee/academics" />
          </section>
        </div>
      )}
    </>
  )
}
