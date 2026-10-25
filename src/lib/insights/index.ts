// Transparent, rule-based insights. Every insight carries the evidence and the rule that produced it.
// Guard: when data is missing or not comparable we never emit a negative label — we emit a note instead.
import { percentage, round2 } from '@/lib/grading'

export type Thresholds = {
  STRONG_PCT: number
  DECLINE_PCT_POINTS: number
  SGPA_DROP: number
  LOW_PCT: number
  LOW_MIN_COUNT: number
  PROFILE_INCOMPLETE_DAYS: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  STRONG_PCT: 75,
  DECLINE_PCT_POINTS: 10,
  SGPA_DROP: 0.5,
  LOW_PCT: 40,
  LOW_MIN_COUNT: 2,
  PROFILE_INCOMPLETE_DAYS: 14,
}

export type InsightResultRow = {
  subjectId: string
  code: string
  name: string
  mse_marks: number | null
  mse_max: number | null
  see_marks: number | null
  see_max: number | null
  result: 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT'
}

export type InsightSemester = { semesterNo: number; sgpa: number | null; results: InsightResultRow[] }

export type InsightType = 'STRENGTH' | 'NEEDS_ATTENTION' | 'SUGGESTED_FOCUS' | 'IMPROVED' | 'DECLINED'

export type Evidence = { label: string; value: string }

export type Insight = {
  id: string
  type: InsightType
  ruleId: string
  subject?: { id: string; code: string; name: string }
  message: string
  evidence: Evidence[]
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
}

export type InsightReport = { insights: Insight[]; notes: string[] }

export type Assessment = {
  subjectId: string
  code: string
  name: string
  semesterNo: number
  kind: 'MSE' | 'SEE'
  pct: number
}

const confidenceFor = (n: number): Insight['confidence'] => (n >= 3 ? 'HIGH' : n === 2 ? 'MEDIUM' : 'LOW')
const fmtPct = (n: number) => `${round2(n)}%`

/** Comparable assessments only: marks AND max present. */
export function comparableAssessments(semesters: InsightSemester[]): { assessments: Assessment[]; notes: string[] } {
  const assessments: Assessment[] = []
  const notes: string[] = []
  for (const s of semesters) {
    for (const r of s.results) {
      for (const kind of ['MSE', 'SEE'] as const) {
        const marks = kind === 'MSE' ? r.mse_marks : r.see_marks
        const max = kind === 'MSE' ? r.mse_max : r.see_max
        if (marks == null) continue
        const p = percentage(marks, max)
        if (p.value == null) {
          notes.push(`${r.code} (semester ${s.semesterNo}) ${kind} not compared: ${p.reason.toLowerCase()}`)
          continue
        }
        assessments.push({ subjectId: r.subjectId, code: r.code, name: r.name, semesterNo: s.semesterNo, kind, pct: p.value })
      }
    }
  }
  return { assessments, notes }
}

export function generateInsights(semesters: InsightSemester[], t: Thresholds = DEFAULT_THRESHOLDS): InsightReport {
  const insights: Insight[] = []
  const { assessments, notes } = comparableAssessments(semesters)
  const ordered = [...semesters].sort((a, b) => a.semesterNo - b.semesterNo)

  const hasFail = ordered.some((s) => s.results.some((r) => r.result === 'FAIL'))
  if (assessments.length === 0 && ordered.every((s) => s.sgpa == null) && !hasFail) {
    return { insights: [], notes: ['Not enough data to compare yet. Add marks with maximum marks to see insights.', ...notes] }
  }

  // Group assessments per subject per semester (a subject repeated in a later semester is a new attempt).
  const bySubject = new Map<string, Assessment[]>()
  for (const a of assessments) {
    const key = a.subjectId
    bySubject.set(key, [...(bySubject.get(key) ?? []), a])
  }
  const order = (a: Assessment) => a.semesterNo * 10 + (a.kind === 'MSE' ? 0 : 1)

  for (const [subjectId, list] of bySubject) {
    const sorted = [...list].sort((a, b) => order(a) - order(b))
    const first = sorted[0]!
    const subject = { id: subjectId, code: first.code, name: first.name }
    const evidence = sorted.map((a) => ({ label: `Sem ${a.semesterNo} ${a.kind}`, value: fmtPct(a.pct) }))

    // R-STRONG: ≥ STRONG_PCT in at least 2 comparable assessments, and none below it.
    if (sorted.length >= 2 && sorted.every((a) => a.pct >= t.STRONG_PCT)) {
      insights.push({
        id: `strong:${subjectId}`, type: 'STRENGTH', ruleId: 'R-STRONG', subject, evidence,
        message: `Consistently strong in ${subject.name}: ${sorted.length} assessments at or above ${t.STRONG_PCT}%.`,
        confidence: confidenceFor(sorted.length),
      })
    }

    // R-LOW: below LOW_PCT in ≥ LOW_MIN_COUNT assessments.
    const low = sorted.filter((a) => a.pct < t.LOW_PCT)
    if (low.length >= t.LOW_MIN_COUNT) {
      insights.push({
        id: `low:${subjectId}`, type: 'NEEDS_ATTENTION', ruleId: 'R-LOW', subject,
        evidence: low.map((a) => ({ label: `Sem ${a.semesterNo} ${a.kind}`, value: fmtPct(a.pct) })),
        message: `${subject.name} is below ${t.LOW_PCT}% in ${low.length} assessments.`,
        confidence: confidenceFor(low.length),
      })
    }

    // R-TREND: consecutive comparable assessments (MSE → SEE, or SEE → next attempt's MSE).
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!
      const cur = sorted[i]!
      const delta = round2(cur.pct - prev.pct)
      const pair = [
        { label: `Sem ${prev.semesterNo} ${prev.kind}`, value: fmtPct(prev.pct) },
        { label: `Sem ${cur.semesterNo} ${cur.kind}`, value: fmtPct(cur.pct) },
        { label: 'Change', value: `${delta > 0 ? '+' : ''}${delta} pts` },
      ]
      if (delta <= -t.DECLINE_PCT_POINTS) {
        insights.push({
          id: `decline:${subjectId}:${i}`, type: 'DECLINED', ruleId: 'R-SUBJECT-DECLINE', subject, evidence: pair,
          message: `${subject.name} dropped ${Math.abs(delta)} points from ${prev.kind} to ${cur.kind}.`,
          confidence: 'MEDIUM',
        })
      } else if (delta >= t.DECLINE_PCT_POINTS) {
        insights.push({
          id: `improve:${subjectId}:${i}`, type: 'IMPROVED', ruleId: 'R-SUBJECT-IMPROVE', subject, evidence: pair,
          message: `${subject.name} improved ${delta} points from ${prev.kind} to ${cur.kind}.`,
          confidence: 'MEDIUM',
        })
      }
    }
  }

  // R-FAIL: a recorded FAIL always needs attention (it is a fact, not an inference).
  for (const s of ordered) {
    for (const r of s.results) {
      if (r.result === 'FAIL') {
        insights.push({
          id: `fail:${r.subjectId}:${s.semesterNo}`, type: 'NEEDS_ATTENTION', ruleId: 'R-FAIL',
          subject: { id: r.subjectId, code: r.code, name: r.name },
          evidence: [{ label: `Semester ${s.semesterNo}`, value: 'Result: FAIL' }],
          message: `${r.name} was not cleared in semester ${s.semesterNo}.`, confidence: 'HIGH',
        })
      }
    }
  }

  // R-SGPA: semester-over-semester change, only between consecutive semesters that both have SGPA.
  const withSgpa = ordered.filter((s) => s.sgpa != null)
  for (let i = 1; i < withSgpa.length; i++) {
    const prev = withSgpa[i - 1]!
    const cur = withSgpa[i]!
    if (cur.semesterNo - prev.semesterNo !== 1) {
      notes.push(`SGPA for semester ${prev.semesterNo} → ${cur.semesterNo} not compared: semesters in between are missing`)
      continue
    }
    const delta = round2(cur.sgpa! - prev.sgpa!)
    const evidence = [
      { label: `Semester ${prev.semesterNo} SGPA`, value: prev.sgpa!.toFixed(2) },
      { label: `Semester ${cur.semesterNo} SGPA`, value: cur.sgpa!.toFixed(2) },
      { label: 'Change', value: `${delta > 0 ? '+' : ''}${delta.toFixed(2)}` },
    ]
    if (delta <= -t.SGPA_DROP) {
      insights.push({
        id: `sgpa-drop:${cur.semesterNo}`, type: 'DECLINED', ruleId: 'R-SGPA-DROP', evidence,
        message: `SGPA fell by ${Math.abs(delta).toFixed(2)} from semester ${prev.semesterNo} to ${cur.semesterNo}.`, confidence: 'HIGH',
      })
    } else if (delta >= t.SGPA_DROP) {
      insights.push({
        id: `sgpa-rise:${cur.semesterNo}`, type: 'IMPROVED', ruleId: 'R-SGPA-RISE', evidence,
        message: `SGPA rose by ${delta.toFixed(2)} from semester ${prev.semesterNo} to ${cur.semesterNo}.`, confidence: 'HIGH',
      })
    }
  }

  // R-FOCUS: derived only from needs-attention / declined subjects (max 3, most recent first).
  const concerns = insights.filter((i) => (i.type === 'NEEDS_ATTENTION' || i.type === 'DECLINED') && i.subject)
  const seen = new Set<string>()
  for (const c of concerns) {
    if (seen.has(c.subject!.id) || seen.size >= 3) continue
    seen.add(c.subject!.id)
    insights.push({
      id: `focus:${c.subject!.id}`, type: 'SUGGESTED_FOCUS', ruleId: 'R-FOCUS', subject: c.subject,
      evidence: [{ label: 'Based on', value: c.message }],
      message: `Focus on ${c.subject!.name}: revise weaker topics, complete practice questions, and review progress with your mentor before the next assessment.`,
      confidence: c.confidence,
    })
  }

  return { insights, notes }
}

export const groupInsights = (insights: Insight[]) => ({
  strengths: insights.filter((i) => i.type === 'STRENGTH' || i.type === 'IMPROVED'),
  attention: insights.filter((i) => i.type === 'NEEDS_ATTENTION' || i.type === 'DECLINED'),
  focus: insights.filter((i) => i.type === 'SUGGESTED_FOCUS'),
})
