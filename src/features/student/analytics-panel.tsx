import { BookCheck, GraduationCap, Layers, TrendingUp } from 'lucide-react'
import type { DB } from '@/server/supabase'
import { loadStudentAcademics, loadThresholds, toInsightSemesters } from '@/server/services/academics'
import { getSettings } from '@/server/services/people'
import { generateInsights, groupInsights } from '@/lib/insights'
import { percentage } from '@/lib/grading'
import { fmt2 } from '@/lib/utils'
import { PastelStatTile } from '@/components/ui/display'
import { Card, CardBody, CardHeader, IconChip } from '@/components/ui/primitives'
import { EmptyState, NotEnoughData } from '@/components/ui/states'
import { CreditProgress, MseSeeDumbbell, SgpaTrend, SubjectHeatmap } from '@/components/charts/academic'
import { DonutWithTotal, StackedRoundedBarChart } from '@/components/charts/dashboard'
import { ChartFrame } from '@/components/charts/chart-frame'
import { AnalyticsFilters } from './analytics-filters'
import { InsightGroup } from './insight-cards'
import { AiSummaryPanel } from './ai-summary'

export type AnalyticsParams = { sem?: string; year?: string; subject?: string }

function resultSlices(results: { derivedResult: 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT' }[]) {
  const count = (k: string) => results.filter((r) => r.derivedResult === k).length
  return [
    { key: 'pass', label: 'Cleared', value: count('PASS'), color: 'var(--chart-2)' },
    { key: 'pending', label: 'Pending', value: count('PENDING'), color: 'var(--chart-3)' },
    { key: 'fail', label: 'Not cleared', value: count('FAIL') + count('ABSENT'), color: 'var(--chart-6)' },
  ].filter((x) => x.value > 0)
}

export async function AnalyticsPanel({
  db,
  studentId,
  departmentId,
  params,
  viewer,
}: {
  db: DB
  studentId: string
  departmentId: string | null
  params: AnalyticsParams
  viewer: 'MENTEE' | 'MENTOR' | 'HOD'
}) {
  const [academics, thresholds, settings] = await Promise.all([loadStudentAcademics(db, studentId, departmentId), loadThresholds(db, departmentId), getSettings(db)])
  if (academics.semesters.length === 0)
    return (
      <Card>
        <EmptyState illustration="no-marks" title="No academic data yet" description="Analytics appear once semester marks are added." />
      </Card>
    )

  const years = [...new Set(academics.semesters.map((s) => s.academicYear))]
  const inYear = params.year ? academics.semesters.filter((s) => s.academicYear === params.year) : academics.semesters
  const scope = inYear.length ? inYear : academics.semesters
  const selected = scope.find((s) => String(s.semesterNo) === params.sem) ?? scope.at(-1)!
  const subjects = [...new Map(academics.semesters.flatMap((s) => s.results.map((r) => [r.subjectId, { id: r.subjectId, label: `${r.code} · ${r.name}` }]))).values()]
  const rows = params.subject ? selected.results.filter((r) => r.subjectId === params.subject) : selected.results

  const report = generateInsights(toInsightSemesters(scope), thresholds)
  const grouped = groupInsights(params.subject ? report.insights.filter((i) => !i.subject || i.subject.id === params.subject) : report.insights)

  const iaLabels = [...new Set(rows.flatMap((r) => r.ia.map((c) => c.label)))].slice(0, 3)
  const heatColumns = ['MSE', ...iaLabels, 'SEE', 'Overall']
  const heatRows = rows.map((r) => ({
    code: r.code,
    name: r.name,
    cells: [
      { label: 'MSE', pct: percentage(r.mse_marks, r.mse_max).value },
      ...iaLabels.map((l) => {
        const c = r.ia.find((x) => x.label === l)
        return { label: l, pct: c ? percentage(c.marks, c.max).value : null }
      }),
      { label: 'SEE', pct: percentage(r.see_marks, r.see_max).value },
      { label: 'Overall', pct: r.pct },
    ],
  }))

  const resultCounts = { PASS: 0, FAIL: 0, PENDING: 0, ABSENT: 0 }
  for (const s of scope) for (const r of s.results) resultCounts[r.derivedResult]++
  const latest = [...academics.semesters].reverse().find((s) => s.displaySgpa != null)

  // Subject trend across semesters (when a subject filter is active)
  const subjectTrend = params.subject
    ? academics.semesters
        .map((s) => ({ s, r: s.results.find((x) => x.subjectId === params.subject) }))
        .filter((x) => x.r)
        .map(({ s, r }) => [`Semester ${s.semesterNo}`, r!.mse_marks == null ? null : percentage(r!.mse_marks, r!.mse_max).value, percentage(r!.see_marks, r!.see_max).value, r!.resolvedGrade] as (string | number | null)[])
    : null

  return (
    <div className="space-y-6">
      <AnalyticsFilters
        semesters={scope.map((s) => s.semesterNo)}
        selectedSemester={selected.semesterNo}
        years={years}
        subjects={subjects}
      />

      <div className="grid gap-3 rounded-[24px] bg-surface p-3 shadow-2 sm:grid-cols-2 sm:gap-4 sm:p-4 xl:grid-cols-4">
        <PastelStatTile tile="blue" label="CGPA" value={academics.cgpa.value?.cgpa ?? null} decimals={2} icon={<GraduationCap />} emptyText={academics.cgpa.reason ?? undefined} helper="Credit-weighted, complete semesters only" />
        <PastelStatTile tile="lilac"
          label="Latest SGPA"
          value={latest?.displaySgpa ?? null}
          decimals={2}
          icon={<TrendingUp />}
          spark={academics.semesters.filter((s) => s.displaySgpa != null).map((s) => s.displaySgpa!)}
          helper={latest ? `Semester ${latest.semesterNo}` : undefined}
        />
        <PastelStatTile tile="green" label="Credits earned" value={academics.creditsEarned} icon={<Layers />} helper={`${academics.creditsInProgress} in progress`} />
        <PastelStatTile tile="peach" label="Subjects cleared" value={resultCounts.PASS} icon={<BookCheck />} helper={`${resultCounts.FAIL} not cleared · ${resultCounts.PENDING} pending`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SgpaTrend semesters={scope.map((s) => ({ semesterNo: s.semesterNo, sgpa: s.displaySgpa }))} />
        <Card>
          <CardHeader title="Credit completion" description="Earned vs in progress" />
          <CardBody>
            <CreditProgress earned={academics.creditsEarned} inProgress={academics.creditsInProgress} required={settings.programCredits} />
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(
                [
                  ['PASS', 'Cleared', 'text-success-700'],
                  ['FAIL', 'Not cleared', 'text-danger-700'],
                  ['PENDING', 'Pending', 'text-info-700'],
                  ['ABSENT', 'Absent', 'text-ink-700'],
                ] as const
              ).map(([k, label, cls]) => (
                <div key={k} className="rounded-xl bg-surface-muted px-3.5 py-3">
                  <p className="text-xs text-ink-500">{label}</p>
                  <p className={`num-display text-2xl font-semibold ${cls}`}>{resultCounts[k]}</p>
                </div>
              ))}
            </div>
            {academics.cgpa.value && academics.cgpa.value.excludedSemesters.length > 0 && (
              <NotEnoughData className="mt-4" reason={`CGPA excludes ${academics.cgpa.value.excludedSemesters.map((e) => `semester ${e.semesterNo}`).join(', ')} until grade data is complete.`} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <StackedRoundedBarChart
          title="Subject Performance"
          description={`MSE % vs SEE % · Semester ${selected.semesterNo} (only where maximum marks exist)`}
          series={[
            { key: 'mse', label: 'MSE %', color: 'var(--chart-1)' },
            { key: 'see', label: 'SEE %', color: 'var(--chart-2)' },
          ]}
          rows={rows.map((r) => ({ label: r.code, sub: r.name, values: { mse: percentage(r.mse_marks, r.mse_max).value, see: percentage(r.see_marks, r.see_max).value } }))}
          empty="Add marks with maximum marks to compare MSE and SEE."
        />
        <DonutWithTotal
          title="Results"
          totalLabel="Subjects"
          views={[
            { key: 'sem', label: `Sem ${selected.semesterNo}`, slices: resultSlices(selected.results) },
            { key: 'all', label: 'Overall', slices: resultSlices(scope.flatMap((x) => x.results)) },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MseSeeDumbbell
          semesterLabel={`Semester ${selected.semesterNo}`}
          rows={rows.map((r) => ({
            code: r.code,
            name: r.name,
            msePct: percentage(r.mse_marks, r.mse_max).value,
            seePct: percentage(r.see_marks, r.see_max).value,
            note: r.mse_max == null || r.see_max == null ? 'Max marks missing' : undefined,
          }))}
        />
        <SubjectHeatmap semesterLabel={`Semester ${selected.semesterNo}`} columns={heatColumns} rows={heatRows} />
      </div>

      {subjectTrend && (
        <ChartFrame
          title="Subject across semesters"
          description="Percentages for the selected subject in every semester it appears"
          table={{ caption: 'Subject percentages by semester', columns: ['Semester', 'MSE %', 'SEE %', 'Grade'], rows: subjectTrend.map((r) => r.map((v) => (typeof v === 'number' ? Number(v.toFixed(1)) : v))) }}
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectTrend.map((r) => (
              <li key={String(r[0])} className="rounded-xl bg-surface-muted p-4">
                <p className="text-sm font-medium text-ink-900">{r[0]}</p>
                <p className="num mt-1 text-sm text-ink-700">
                  MSE {r[1] == null ? 'n/a' : `${Number(r[1]).toFixed(1)}%`} · SEE {r[2] == null ? 'n/a' : `${Number(r[2]).toFixed(1)}%`} · {r[3] ?? '—'}
                </p>
              </li>
            ))}
          </ul>
        </ChartFrame>
      )}

      <Card>
        <CardHeader title="Insights" description="Transparent, rule-based observations from verified and draft marks. Every insight shows its evidence." />
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-3">
            <InsightGroup tile="green" title="Strengths" description="Consistently strong or improving" insights={grouped.strengths} empty="No strengths detected yet — this needs at least two comparable assessments." />
            <InsightGroup tile="rose" title="Needs attention" description="Lower or declining results" insights={grouped.attention} empty="Nothing needs attention right now." />
            <InsightGroup tile="blue" title="Suggested focus" description="Where effort will help most" insights={grouped.focus} empty="No focus areas — keep going." />
          </div>
          {report.notes.length > 0 && (
            <details className="mt-6 rounded-xl bg-surface-muted px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-ink-700">What couldn’t be compared ({report.notes.length})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-500">
                {report.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          )}
        </CardBody>
      </Card>

      {settings.aiEnabled && <AiSummaryPanel db={db} studentId={studentId} viewer={viewer} />}
      <p className="text-center text-xs text-ink-500">
        Charts and insights are shown on the website only and are never included in PDF reports. Latest SGPA {fmt2(latest?.displaySgpa)}.
      </p>
    </div>
  )
}
