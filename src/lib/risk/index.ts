// Academic risk indicators. Each flag is an explanation with a reason — never an unexplained score.
import { comparableAssessments, DEFAULT_THRESHOLDS, type InsightSemester, type Thresholds } from '@/lib/insights'

export type RiskKey = 'FAILED_SUBJECT' | 'DECLINING' | 'MISSING_RESULTS' | 'REPEATED_LOW' | 'PROFILE_INCOMPLETE'

export type RiskFlag = { key: RiskKey; label: string; reason: string; severity: 'high' | 'medium' }

export type RiskInput = {
  createdAt: string | Date
  onboardingCompletedAt: string | Date | null
  currentSemester: number | null
  semesters: InsightSemester[]
  now?: Date
}

export const RISK_LABELS: Record<RiskKey, string> = {
  FAILED_SUBJECT: 'Failed subject',
  DECLINING: 'Declining performance',
  MISSING_RESULTS: 'Missing results',
  REPEATED_LOW: 'Repeated low marks',
  PROFILE_INCOMPLETE: 'Profile incomplete',
}

const DAY = 86_400_000

export function evaluateRisk(input: RiskInput, t: Thresholds = DEFAULT_THRESHOLDS): RiskFlag[] {
  const flags: RiskFlag[] = []
  const now = input.now ?? new Date()
  const semesters = [...input.semesters].sort((a, b) => a.semesterNo - b.semesterNo)
  const latest = semesters.at(-1)

  // Failed subject in the most recent recorded semester.
  if (latest) {
    const failed = latest.results.filter((r) => r.result === 'FAIL')
    if (failed.length > 0) {
      flags.push({
        key: 'FAILED_SUBJECT', label: RISK_LABELS.FAILED_SUBJECT, severity: 'high',
        reason: `Not cleared in semester ${latest.semesterNo}: ${failed.map((r) => r.code).join(', ')}`,
      })
    }
  }

  // Declining: SGPA drop between the last two consecutive semesters with SGPA.
  const withSgpa = semesters.filter((s) => s.sgpa != null)
  const a = withSgpa.at(-2)
  const b = withSgpa.at(-1)
  if (a && b && b.semesterNo - a.semesterNo === 1 && a.sgpa! - b.sgpa! >= t.SGPA_DROP) {
    flags.push({
      key: 'DECLINING', label: RISK_LABELS.DECLINING, severity: 'medium',
      reason: `SGPA dropped from ${a.sgpa!.toFixed(2)} (sem ${a.semesterNo}) to ${b.sgpa!.toFixed(2)} (sem ${b.semesterNo})`,
    })
  } else if (latest) {
    // …or ≥ 2 subjects dropping ≥ DECLINE_PCT_POINTS from MSE to SEE in the latest semester.
    const { assessments } = comparableAssessments([latest])
    const dropped: string[] = []
    const bySubject = new Map<string, { mse?: number; see?: number; code: string }>()
    for (const x of assessments) {
      const cur = bySubject.get(x.subjectId) ?? { code: x.code }
      if (x.kind === 'MSE') cur.mse = x.pct
      else cur.see = x.pct
      bySubject.set(x.subjectId, cur)
    }
    for (const v of bySubject.values()) {
      if (v.mse != null && v.see != null && v.mse - v.see >= t.DECLINE_PCT_POINTS) dropped.push(v.code)
    }
    if (dropped.length >= 2) {
      flags.push({
        key: 'DECLINING', label: RISK_LABELS.DECLINING, severity: 'medium',
        reason: `MSE → SEE dropped ≥ ${t.DECLINE_PCT_POINTS} points in ${dropped.join(', ')} (semester ${latest.semesterNo})`,
      })
    }
  }

  // Missing results for the most recently completed semester.
  if (input.currentSemester != null && input.currentSemester > 1) {
    const expected = input.currentSemester - 1
    const rec = semesters.find((s) => s.semesterNo === expected)
    if (!rec || rec.results.length === 0) {
      flags.push({
        key: 'MISSING_RESULTS', label: RISK_LABELS.MISSING_RESULTS, severity: 'medium',
        reason: `No results recorded for semester ${expected}`,
      })
    }
  }

  // Repeated low marks across the two most recent semesters.
  const recent = semesters.slice(-2)
  const { assessments } = comparableAssessments(recent)
  const low = assessments.filter((x) => x.pct < t.LOW_PCT)
  if (low.length >= t.LOW_MIN_COUNT) {
    const codes = [...new Set(low.map((x) => x.code))]
    flags.push({
      key: 'REPEATED_LOW', label: RISK_LABELS.REPEATED_LOW, severity: low.length >= t.LOW_MIN_COUNT * 2 ? 'high' : 'medium',
      reason: `${low.length} assessments below ${t.LOW_PCT}% (${codes.join(', ')})`,
    })
  }

  // Profile still incomplete after N days.
  if (!input.onboardingCompletedAt) {
    const days = Math.floor((now.getTime() - new Date(input.createdAt).getTime()) / DAY)
    if (days > t.PROFILE_INCOMPLETE_DAYS) {
      flags.push({
        key: 'PROFILE_INCOMPLETE', label: RISK_LABELS.PROFILE_INCOMPLETE, severity: 'medium',
        reason: `Profile setup not finished ${days} days after the account was created`,
      })
    }
  }

  return flags
}

export function thresholdsFromRows(rows: { rule_key: string; value: number | string }[]): Thresholds {
  const t = { ...DEFAULT_THRESHOLDS }
  for (const r of rows) {
    if (r.rule_key in t) t[r.rule_key as keyof Thresholds] = Number(r.value)
  }
  return t
}
