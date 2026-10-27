import { GraduationCap, Percent, ShieldAlert, UsersRound } from 'lucide-react'
import { percentage } from '@/lib/grading'
import { RISK_LABELS } from '@/lib/risk'
import { PastelStatTile } from '@/components/ui/display'
import { BarList, Histogram } from '@/components/charts/bars'
import { DepartmentTrend } from '@/components/charts/admin'
import type { RosterEntry } from '@/server/services/roster'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Cohort analytics computed from a roster (mentor: own mentees; HOD: branch; Principal: college, trend lines per branch). */
export function CohortAnalytics({ roster, extra, groupOf }: { roster: RosterEntry[]; extra?: React.ReactNode; groupOf?: (r: RosterEntry) => string }) {
  const withCgpa = roster.filter((r) => r.cgpa != null)
  const avgCgpa = avg(withCgpa.map((r) => r.cgpa!))
  let pass = 0
  let decided = 0
  const subj = new Map<string, { name: string; pcts: number[]; fails: number }>()
  const bySemSection = new Map<number, Map<string, number[]>>()
  for (const r of roster) {
    for (const s of r.semesters) {
      if (s.displaySgpa != null) {
        const sec = groupOf ? groupOf(r) : r.sectionName ? `Section ${r.sectionName}` : 'All'
        const m = bySemSection.get(s.semesterNo) ?? new Map<string, number[]>()
        m.set(sec, [...(m.get(sec) ?? []), s.displaySgpa])
        bySemSection.set(s.semesterNo, m)
      }
      for (const x of s.results) {
        if (x.derivedResult === 'PASS' || x.derivedResult === 'FAIL' || x.derivedResult === 'ABSENT') {
          decided++
          if (x.derivedResult === 'PASS') pass++
        }
        const entry = subj.get(x.code) ?? { name: x.name, pcts: [], fails: 0 }
        const see = percentage(x.see_marks, x.see_max).value
        if (see != null) entry.pcts.push(see)
        if (x.derivedResult === 'FAIL') entry.fails++
        subj.set(x.code, entry)
      }
    }
  }
  const bins = [
    { label: '<5', lo: 0, hi: 5 },
    { label: '5–6', lo: 5, hi: 6 },
    { label: '6–7', lo: 6, hi: 7 },
    { label: '7–8', lo: 7, hi: 8 },
    { label: '8–9', lo: 8, hi: 9 },
    { label: '9–10', lo: 9, hi: 10.01 },
  ].map((b) => ({ label: b.label, value: roster.filter((r) => r.latestSgpa != null && r.latestSgpa >= b.lo && r.latestSgpa < b.hi).length }))

  const series = [...new Set([...bySemSection.values()].flatMap((m) => [...m.keys()]))].sort()
  const trend = [...bySemSection.keys()]
    .sort((a, b) => a - b)
    .map((sem) => {
      const row: Record<string, number | string | null> = { name: `Sem ${sem}` }
      for (const s of series) {
        const v = avg(bySemSection.get(sem)?.get(s) ?? [])
        row[s] = v == null ? null : Number(v.toFixed(2))
      }
      return row
    })

  const riskCounts = Object.entries(RISK_LABELS)
    .map(([k, label]) => ({ label, value: roster.filter((r) => r.flags.some((f) => f.key === k)).length, tone: 'danger' as const }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)

  const weakest = [...subj.entries()]
    .filter(([, v]) => v.pcts.length >= 3)
    .map(([code, v]) => ({ code, name: v.name, avg: avg(v.pcts)!, fails: v.fails }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-[24px] bg-surface p-3 shadow-2 sm:grid-cols-2 sm:gap-4 sm:p-4 xl:grid-cols-4">
        <PastelStatTile tile="blue" label="Students" value={roster.length} icon={<UsersRound />} helper={`${roster.filter((r) => r.hasRecords).length} with academic records`} />
        <PastelStatTile tile="green" label="Average CGPA" value={avgCgpa == null ? null : Number(avgCgpa.toFixed(2))} decimals={2} icon={<GraduationCap />} helper={`Across ${withCgpa.length} students with complete data`} emptyText="Not enough data" />
        <PastelStatTile tile="lilac" label="Pass rate" value={decided ? Math.round((pass / decided) * 100) : null} suffix="%" icon={<Percent />} helper={`${pass} of ${decided} decided subject results`} />
        <PastelStatTile tile="rose" label="Flagged for attention" value={roster.filter((r) => r.risk !== 'none').length} icon={<ShieldAlert />} helper={`${roster.filter((r) => r.risk === 'high').length} high priority`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DepartmentTrend data={trend} series={series} />
        <Histogram title="Latest SGPA distribution" description="Students by their most recent semester SGPA" bins={bins} empty="No SGPA data yet." />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <BarList
          title="Subjects needing support"
          description="Lowest average SEE percentage (subjects with 3+ comparable results)"
          bars={weakest.map((w) => ({ label: `${w.code} · ${w.name}`, value: Math.round(w.avg), display: `${w.avg.toFixed(1)}%${w.fails ? ` · ${w.fails} fail${w.fails === 1 ? '' : 's'}` : ''}`, tone: w.avg < 50 ? 'danger' : w.avg < 60 ? 'warning' : 'brand' }))}
          max={100}
          empty="Needs at least three comparable SEE results per subject."
        />
        <BarList title="Risk indicators" description="Students per indicator (a student can have several)" bars={riskCounts} empty="No risk indicators — everyone is on track." />
      </div>
      {extra}
    </div>
  )
}
