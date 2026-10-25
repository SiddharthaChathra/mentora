// Grading engine — pure functions, no I/O.
// Rule: a derived value exists only when the scheme and every required input exist; otherwise { value: null, reason }.

export type GradeBand = { min_pct: number; grade: string; points: number }

export type GradingScheme = {
  id?: string
  bands: GradeBand[]
  pass_pct: number
  mse_weight: number
  see_weight: number
  max_grade_points: number
}

export type ResultStatus = 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT'

export type SubjectResultInput = {
  subjectId: string
  code?: string
  credits: number
  attempt?: number
  mse_marks: number | null
  mse_max: number | null
  see_marks: number | null
  see_max: number | null
  grade: string | null
  grade_points: number | null
  result: ResultStatus
  credits_earned?: number | null
}

export type Computed<T> = { value: T; reason: null } | { value: null; reason: string }

export const ok = <T>(value: T): Computed<T> => ({ value, reason: null })
export const notComputable = <T = never>(reason: string): Computed<T> => ({ value: null, reason })

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const DEFAULT_SCHEME: GradingScheme = {
  bands: [
    { min_pct: 90, grade: 'O', points: 10 },
    { min_pct: 80, grade: 'A+', points: 9 },
    { min_pct: 70, grade: 'A', points: 8 },
    { min_pct: 60, grade: 'B+', points: 7 },
    { min_pct: 55, grade: 'B', points: 6 },
    { min_pct: 50, grade: 'C', points: 5 },
    { min_pct: 40, grade: 'P', points: 4 },
    { min_pct: 0, grade: 'F', points: 0 },
  ],
  pass_pct: 40,
  mse_weight: 0.5,
  see_weight: 0.5,
  max_grade_points: 10,
}

/** Percentage of a single assessment; only when a positive max exists. */
export function percentage(marks: number | null | undefined, max: number | null | undefined): Computed<number> {
  if (marks == null) return notComputable('Marks not entered')
  if (max == null || max <= 0) return notComputable('Maximum marks missing')
  if (marks < 0 || marks > max) return notComputable('Marks outside 0–max')
  return ok(round2((marks / max) * 100))
}

/** Weighted subject percentage from MSE and SEE. A component counts only if both marks and max exist. */
export function subjectPercentage(r: SubjectResultInput, scheme: GradingScheme): Computed<number> {
  const hasMseData = r.mse_marks != null || r.mse_max != null
  const hasSeeData = r.see_marks != null || r.see_max != null
  const mse = percentage(r.mse_marks, r.mse_max)
  const see = percentage(r.see_marks, r.see_max)

  if (hasMseData && mse.value == null) return notComputable(`MSE: ${mse.reason}`)
  if (hasSeeData && see.value == null) return notComputable(`SEE: ${see.reason}`)
  if (mse.value != null && see.value != null) {
    return ok(round2(mse.value * scheme.mse_weight + see.value * scheme.see_weight))
  }
  if (mse.value != null) return ok(mse.value)
  if (see.value != null) return ok(see.value)
  return notComputable('No marks with maximum marks entered')
}

export function sortedBands(scheme: GradingScheme): GradeBand[] {
  return [...scheme.bands].sort((a, b) => b.min_pct - a.min_pct)
}

export function bandForPercentage(pct: number, scheme: GradingScheme): GradeBand | null {
  return sortedBands(scheme).find((b) => pct >= b.min_pct) ?? null
}

export type ResolvedGrade = {
  grade: string
  points: number
  source: 'ENTERED' | 'GRADE_LOOKUP' | 'COMPUTED' | 'ABSENT'
  percentage: number | null
}

/** Resolve grade points in priority: entered points → entered grade letter → computed percentage. */
export function resolveGrade(r: SubjectResultInput, scheme: GradingScheme): Computed<ResolvedGrade> {
  const pct = subjectPercentage(r, scheme)
  const pctValue = pct.value

  if (r.result === 'ABSENT') return ok({ grade: r.grade ?? 'AB', points: 0, source: 'ABSENT', percentage: pctValue })

  if (r.grade_points != null) {
    if (r.grade_points < 0 || r.grade_points > scheme.max_grade_points) {
      return notComputable(`Grade points must be between 0 and ${scheme.max_grade_points}`)
    }
    const band = sortedBands(scheme).find((b) => b.points === r.grade_points)
    return ok({ grade: r.grade ?? band?.grade ?? '—', points: r.grade_points, source: 'ENTERED', percentage: pctValue })
  }

  if (r.grade) {
    const band = scheme.bands.find((b) => b.grade.toUpperCase() === r.grade!.trim().toUpperCase())
    if (!band) return notComputable(`Grade “${r.grade}” is not in the active grading scheme`)
    return ok({ grade: band.grade, points: band.points, source: 'GRADE_LOOKUP', percentage: pctValue })
  }

  if (r.result === 'PENDING' && pctValue == null) return notComputable('Result pending')
  if (pctValue == null) return notComputable(pct.reason ?? 'Not enough data')
  const band = bandForPercentage(pctValue, scheme)
  if (!band) return notComputable('No grade band covers this percentage')
  return ok({ grade: band.grade, points: band.points, source: 'COMPUTED', percentage: pctValue })
}

/** Derived pass/fail when the student did not record one explicitly. */
export function deriveResult(r: SubjectResultInput, scheme: GradingScheme): ResultStatus {
  if (r.result !== 'PENDING') return r.result
  const g = resolveGrade(r, scheme)
  if (g.value == null) return 'PENDING'
  if (g.value.percentage != null) return g.value.percentage >= scheme.pass_pct && g.value.points > 0 ? 'PASS' : 'FAIL'
  return g.value.points > 0 ? 'PASS' : 'FAIL'
}

export function creditsEarned(r: SubjectResultInput, scheme: GradingScheme): number {
  if (r.credits_earned != null) return r.credits_earned
  return deriveResult(r, scheme) === 'PASS' ? r.credits : 0
}

/** Keep only the highest attempt per subject. */
export function latestAttempts<T extends { subjectId: string; attempt?: number }>(results: T[]): T[] {
  const bySubject = new Map<string, T>()
  for (const r of results) {
    const cur = bySubject.get(r.subjectId)
    if (!cur || (r.attempt ?? 1) > (cur.attempt ?? 1)) bySubject.set(r.subjectId, r)
  }
  return [...bySubject.values()]
}

export type SgpaResult = { sgpa: number; creditsRegistered: number; creditsEarned: number }

export function computeSgpa(results: SubjectResultInput[], scheme: GradingScheme | null): Computed<SgpaResult> {
  if (!scheme) return notComputable('SGPA not calculated: no active grading scheme')
  const subjects = latestAttempts(results).filter((r) => r.credits > 0)
  if (subjects.length === 0) return notComputable('SGPA not calculated: no credit-bearing subjects recorded')

  let weighted = 0
  let credits = 0
  let earned = 0
  const missing: string[] = []
  for (const r of subjects) {
    const g = resolveGrade(r, scheme)
    if (g.value == null) {
      missing.push(r.code ?? r.subjectId)
      continue
    }
    weighted += g.value.points * r.credits
    credits += r.credits
    earned += creditsEarned(r, scheme)
  }
  if (missing.length > 0) {
    const n = missing.length
    return notComputable(`SGPA not calculated: ${n} subject${n === 1 ? '' : 's'} missing grade points (${missing.join(', ')})`)
  }
  return ok({ sgpa: round2(weighted / credits), creditsRegistered: credits, creditsEarned: earned })
}

export type SemesterInput = { semesterNo: number; results: SubjectResultInput[] }

export type CgpaResult = {
  cgpa: number
  credits: number
  includedSemesters: number[]
  excludedSemesters: { semesterNo: number; reason: string }[]
}

/**
 * CGPA = credit-weighted grade points across semesters whose SGPA is computable.
 * A subject repeated across semesters counts once (latest semester, latest attempt).
 */
export function computeCgpa(semesters: SemesterInput[], scheme: GradingScheme | null): Computed<CgpaResult> {
  if (!scheme) return notComputable('CGPA not calculated: no active grading scheme')
  if (semesters.length === 0) return notComputable('CGPA not calculated: no semesters recorded')

  const included: SemesterInput[] = []
  const excluded: { semesterNo: number; reason: string }[] = []
  for (const s of [...semesters].sort((a, b) => a.semesterNo - b.semesterNo)) {
    const sg = computeSgpa(s.results, scheme)
    if (sg.value == null) excluded.push({ semesterNo: s.semesterNo, reason: sg.reason })
    else included.push(s)
  }
  if (included.length === 0) return notComputable('CGPA not calculated: no semester has complete grade data')

  const latest = new Map<string, { r: SubjectResultInput; sem: number }>()
  for (const s of included) {
    for (const r of latestAttempts(s.results)) {
      if (r.credits <= 0) continue
      const prev = latest.get(r.subjectId)
      if (!prev || s.semesterNo > prev.sem || (s.semesterNo === prev.sem && (r.attempt ?? 1) > (prev.r.attempt ?? 1))) {
        latest.set(r.subjectId, { r, sem: s.semesterNo })
      }
    }
  }
  let weighted = 0
  let credits = 0
  for (const { r } of latest.values()) {
    const g = resolveGrade(r, scheme)
    if (g.value == null) continue // unreachable: included semesters are fully graded
    weighted += g.value.points * r.credits
    credits += r.credits
  }
  return ok({
    cgpa: round2(weighted / credits),
    credits,
    includedSemesters: included.map((s) => s.semesterNo),
    excludedSemesters: excluded,
  })
}

/** Human preview line used by the scheme editor, e.g. "85/100 → A+ → 9 grade points". */
export function previewLine(marks: number, max: number, scheme: GradingScheme): string {
  const p = percentage(marks, max)
  if (p.value == null) return p.reason
  const band = bandForPercentage(p.value, scheme)
  if (!band) return `${marks}/${max} → no band`
  return `${marks}/${max} → ${band.grade} → ${band.points} grade point${band.points === 1 ? '' : 's'}`
}

export function validateScheme(scheme: GradingScheme): string[] {
  const errors: string[] = []
  const bands = sortedBands(scheme)
  if (bands.length === 0) errors.push('Add at least one grade band')
  if (!bands.some((b) => b.min_pct === 0)) errors.push('The lowest band must start at 0%')
  const grades = new Set<string>()
  for (const b of bands) {
    if (b.min_pct < 0 || b.min_pct > 100) errors.push(`Band ${b.grade}: minimum must be 0–100%`)
    if (b.points < 0 || b.points > scheme.max_grade_points) errors.push(`Band ${b.grade}: points must be 0–${scheme.max_grade_points}`)
    if (grades.has(b.grade.toUpperCase())) errors.push(`Grade ${b.grade} appears twice`)
    grades.add(b.grade.toUpperCase())
  }
  for (let i = 1; i < bands.length; i++) {
    if (bands[i]!.min_pct === bands[i - 1]!.min_pct) errors.push(`Two bands start at ${bands[i]!.min_pct}%`)
    if (bands[i]!.points > bands[i - 1]!.points) errors.push('Grade points must not increase as percentage decreases')
  }
  if (Math.abs(scheme.mse_weight + scheme.see_weight - 1) > 0.001) errors.push('MSE and SEE weights must add up to 100%')
  return errors
}
