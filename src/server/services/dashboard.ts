import 'server-only'
import { percentage } from '@/lib/grading'
import type { RankItem, StackRow } from '@/components/charts/dashboard'
import type { RecentResultRow } from '@/features/dashboard/widgets'
import type { RosterEntry } from './roster'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Average of each student's latest SGPA, and of their previous one (for the "vs last sem" delta). */
export function cohortSgpa(roster: RosterEntry[]) {
  const latest: number[] = []
  const prev: number[] = []
  for (const r of roster) {
    const s = r.semesters.filter((x) => x.displaySgpa != null)
    const last = s.at(-1)
    if (!last) continue
    latest.push(last.displaySgpa!)
    const before = s.at(-2)
    if (before) prev.push(before.displaySgpa!)
  }
  const a = avg(latest)
  const b = avg(prev)
  return { avg: a == null ? null : Number(a.toFixed(2)), delta: a != null && b != null ? Number((a - b).toFixed(2)) : null, students: latest.length }
}

/** Average MSE % and SEE % per subject across the cohort; the most-taken subjects first. */
export function subjectPerformance(roster: RosterEntry[], hrefBase: string, limit = 8): StackRow[] {
  const by = new Map<string, { name: string; mse: number[]; see: number[]; n: number }>()
  for (const r of roster)
    for (const s of r.semesters)
      for (const x of s.results) {
        const e = by.get(x.code) ?? { name: x.name, mse: [], see: [], n: 0 }
        const m = percentage(x.mse_marks, x.mse_max).value
        const v = percentage(x.see_marks, x.see_max).value
        if (m != null) e.mse.push(m)
        if (v != null) e.see.push(v)
        e.n++
        by.set(x.code, e)
      }
  return [...by.entries()]
    .filter(([, e]) => e.mse.length + e.see.length >= 2)
    .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, e]) => ({ label: code, sub: `${code} · ${e.name}`, values: { mse: avg(e.mse), see: avg(e.see) }, href: `${hrefBase}?subject=${encodeURIComponent(code)}` }))
}

/** Latest semester per student, most recently updated first. */
export function recentResults(roster: RosterEntry[], hrefBase: string, limit = 6): RecentResultRow[] {
  return roster
    .flatMap((r) => {
      const s = r.semesters.at(-1)
      if (!s) return []
      const decided = s.results.filter((x) => x.derivedResult !== 'PENDING')
      const passed = decided.filter((x) => x.derivedResult === 'PASS').length
      return [
        {
          id: s.id,
          studentId: r.id,
          name: r.name ?? 'Student',
          hasAvatar: !!r.avatarPath,
          usn: r.usn,
          semesterNo: s.semesterNo,
          sgpa: s.displaySgpa,
          passPct: decided.length ? (passed / decided.length) * 100 : null,
          status: s.status,
          href: `${hrefBase}/${r.id}?tab=academics`,
          updated: s.updatedAt,
        },
      ]
    })
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, limit)
    .map(({ updated: _u, ...row }) => {
      void _u
      return row
    })
}

/** Biggest SGPA gains between the last two semesters with an SGPA (mentor/HOD only — never shown to students). */
export function mostImproved(roster: RosterEntry[], hrefBase: string, limit = 5): RankItem[] {
  return roster
    .flatMap((r) => {
      const s = r.semesters.filter((x) => x.displaySgpa != null)
      const last = s.at(-1)
      const before = s.at(-2)
      if (!last || !before) return []
      const change = last.displaySgpa! - before.displaySgpa!
      if (change <= 0) return []
      return [{ id: r.id, name: r.name ?? 'Student', sub: `Sem ${before.semesterNo} → Sem ${last.semesterNo}`, value: last.displaySgpa!.toFixed(2), change, href: `${hrefBase}/${r.id}`, hasAvatar: !!r.avatarPath }]
    })
    .sort((a, b) => b.change - a.change)
    .slice(0, limit)
}

/** Per section: average of each student's latest and previous SGPA (HOD only). */
export function sectionSgpa(roster: RosterEntry[]) {
  const by = new Map<string, { id: string | null; latest: number[]; prev: number[]; students: number }>()
  for (const r of roster) {
    const key = r.sectionName ? `Section ${r.sectionName}` : 'No section'
    const e = by.get(key) ?? { id: r.sectionId, latest: [], prev: [], students: 0 }
    e.students++
    const s = r.semesters.filter((x) => x.displaySgpa != null)
    if (s.at(-1)) e.latest.push(s.at(-1)!.displaySgpa!)
    if (s.at(-2)) e.prev.push(s.at(-2)!.displaySgpa!)
    by.set(key, e)
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, e]) => ({ name, id: e.id, students: e.students, latest: avg(e.latest), prev: avg(e.prev) }))
}

export function sectionBars(sections: ReturnType<typeof sectionSgpa>): StackRow[] {
  return sections
    .filter((s) => s.latest != null)
    .map((s) => ({
      label: s.name.replace('Section ', 'Sec '),
      sub: `${s.name} · ${s.students} students`,
      values: { prev: s.prev == null ? null : Number(s.prev.toFixed(2)), latest: Number(s.latest!.toFixed(2)) },
      href: s.id ? `/hod/students?section=${s.id}` : undefined,
    }))
}

export function sectionRanks(sections: ReturnType<typeof sectionSgpa>): RankItem[] {
  return sections
    .filter((s) => s.latest != null && s.prev != null)
    .map((s) => ({ id: s.id ?? s.name, name: s.name, sub: `${s.students} students`, value: s.latest!.toFixed(2), change: s.latest! - s.prev!, href: s.id ? `/hod/students?section=${s.id}` : undefined, avatar: false }))
    .sort((a, b) => b.change - a.change)
}
