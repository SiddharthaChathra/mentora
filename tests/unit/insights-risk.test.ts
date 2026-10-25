import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLDS, generateInsights, groupInsights, type InsightResultRow, type InsightSemester } from '@/lib/insights'
import { evaluateRisk, thresholdsFromRows } from '@/lib/risk'

const row = (over: Partial<InsightResultRow> = {}): InsightResultRow => ({
  subjectId: 'ds',
  code: 'CS201',
  name: 'Data Structures',
  mse_marks: null,
  mse_max: null,
  see_marks: null,
  see_max: null,
  result: 'PASS',
  ...over,
})
const sem = (semesterNo: number, results: InsightResultRow[], sgpa: number | null = null): InsightSemester => ({ semesterNo, sgpa, results })
const types = (s: InsightSemester[]) => generateInsights(s).insights.map((i) => i.ruleId)

describe('insights: strengths', () => {
  it('flags a subject strong in ≥ 2 comparable assessments', () => {
    const out = generateInsights([sem(3, [row({ mse_marks: 40, mse_max: 50, see_marks: 82, see_max: 100 })])])
    const strong = out.insights.find((i) => i.ruleId === 'R-STRONG')
    expect(strong?.subject?.code).toBe('CS201')
    expect(strong?.evidence).toHaveLength(2)
  })
  it('does not call one strong assessment a strength', () => {
    expect(types([sem(3, [row({ see_marks: 90, see_max: 100 })])])).not.toContain('R-STRONG')
  })
})

describe('insights: needs attention & trends', () => {
  it('flags repeated low marks', () => {
    expect(types([sem(3, [row({ mse_marks: 10, mse_max: 50, see_marks: 30, see_max: 100 })])])).toContain('R-LOW')
  })
  it('flags a ≥10 point MSE→SEE decline and suggests focus', () => {
    const t = types([sem(3, [row({ mse_marks: 45, mse_max: 50, see_marks: 60, see_max: 100 })])])
    expect(t).toContain('R-SUBJECT-DECLINE')
    expect(t).toContain('R-FOCUS')
  })
  it('flags improvement', () => {
    expect(types([sem(3, [row({ mse_marks: 25, mse_max: 50, see_marks: 80, see_max: 100 })])])).toContain('R-SUBJECT-IMPROVE')
  })
  it('treats FAIL as needs attention', () => {
    expect(types([sem(3, [row({ result: 'FAIL' })])])).toContain('R-FAIL')
  })
  it('compares SGPA only between consecutive semesters', () => {
    expect(types([sem(3, [], 8.2), sem(4, [], 7.4)])).toContain('R-SGPA-DROP')
    expect(types([sem(3, [], 7.0), sem(4, [], 7.8)])).toContain('R-SGPA-RISE')
    const gap = generateInsights([sem(2, [], 8.2), sem(4, [], 6.0)])
    expect(gap.insights.map((i) => i.ruleId)).not.toContain('R-SGPA-DROP')
    expect(gap.notes.join(' ')).toMatch(/not compared/)
  })
  it('limits suggested focus to three subjects', () => {
    const results = ['a', 'b', 'c', 'd'].map((id) => row({ subjectId: id, code: id, name: id, result: 'FAIL' }))
    expect(generateInsights([sem(3, results)]).insights.filter((i) => i.type === 'SUGGESTED_FOCUS')).toHaveLength(3)
  })
})

describe('insights: missing / non-comparable data never produces negative labels', () => {
  it('returns no insights and a "not enough data" note when nothing is comparable', () => {
    const out = generateInsights([sem(3, [row({ mse_marks: 10, see_marks: 12 })])])
    expect(out.insights).toEqual([])
    expect(out.notes[0]).toMatch(/Not enough data/)
  })
  it('skips MSE vs SEE when one max is missing', () => {
    const out = generateInsights([sem(3, [row({ mse_marks: 45, mse_max: null, see_marks: 30, see_max: 100 })])])
    expect(out.insights.filter((i) => i.type === 'DECLINED' || i.type === 'NEEDS_ATTENTION')).toEqual([])
    expect(out.notes.some((n) => n.includes('MSE not compared'))).toBe(true)
  })
  it('empty input', () => {
    expect(generateInsights([]).insights).toEqual([])
  })
  it('groups for the UI', () => {
    const g = groupInsights(generateInsights([sem(3, [row({ mse_marks: 45, mse_max: 50, see_marks: 60, see_max: 100 })])]).insights)
    expect(g.attention.length).toBeGreaterThan(0)
    expect(g.focus.length).toBe(1)
  })
})

describe('risk engine', () => {
  const base = { createdAt: '2026-01-01', onboardingCompletedAt: '2026-01-02', currentSemester: 4, now: new Date('2026-10-25') }

  it('returns no flags for a healthy student', () => {
    expect(evaluateRisk({ ...base, semesters: [sem(3, [row({ mse_marks: 40, mse_max: 50, see_marks: 80, see_max: 100 })], 8.5)] })).toEqual([])
  })
  it('flags a failed subject with the code in the reason', () => {
    const f = evaluateRisk({ ...base, semesters: [sem(3, [row({ result: 'FAIL' })])] })
    expect(f[0]).toMatchObject({ key: 'FAILED_SUBJECT', severity: 'high' })
    expect(f[0]!.reason).toContain('CS201')
  })
  it('flags an SGPA decline', () => {
    const f = evaluateRisk({ ...base, currentSemester: 5, semesters: [sem(3, [], 8.4), sem(4, [], 7.6)] })
    expect(f.map((x) => x.key)).toContain('DECLINING')
  })
  it('flags subject-level decline in two subjects', () => {
    const results = [
      row({ subjectId: 'a', code: 'A1', mse_marks: 45, mse_max: 50, see_marks: 60, see_max: 100 }),
      row({ subjectId: 'b', code: 'B1', mse_marks: 40, mse_max: 50, see_marks: 55, see_max: 100 }),
    ]
    expect(evaluateRisk({ ...base, semesters: [sem(3, results)] }).map((x) => x.key)).toContain('DECLINING')
  })
  it('flags missing results for the last completed semester', () => {
    const f = evaluateRisk({ ...base, currentSemester: 5, semesters: [sem(3, [row()])] })
    expect(f.find((x) => x.key === 'MISSING_RESULTS')?.reason).toBe('No results recorded for semester 4')
  })
  it('flags repeated low marks', () => {
    const f = evaluateRisk({ ...base, semesters: [sem(3, [row({ mse_marks: 10, mse_max: 50, see_marks: 20, see_max: 100 })])] })
    expect(f.map((x) => x.key)).toContain('REPEATED_LOW')
  })
  it('flags incomplete profiles only after the threshold', () => {
    expect(evaluateRisk({ ...base, onboardingCompletedAt: null, createdAt: '2026-10-20', semesters: [sem(3, [row()])] })).toEqual([])
    expect(evaluateRisk({ ...base, onboardingCompletedAt: null, createdAt: '2026-09-01', semesters: [sem(3, [row()])] }).map((x) => x.key)).toContain(
      'PROFILE_INCOMPLETE',
    )
  })
  it('never flags low marks when max marks are missing', () => {
    expect(evaluateRisk({ ...base, semesters: [sem(3, [row({ mse_marks: 5, see_marks: 6 })])] })).toEqual([])
  })
  it('reads thresholds from DB rows', () => {
    expect(thresholdsFromRows([{ rule_key: 'LOW_PCT', value: '35' }, { rule_key: 'UNKNOWN', value: 1 }])).toEqual({ ...DEFAULT_THRESHOLDS, LOW_PCT: 35 })
  })
})
