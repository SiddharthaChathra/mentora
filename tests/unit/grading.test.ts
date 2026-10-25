import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCHEME,
  bandForPercentage,
  computeCgpa,
  computeSgpa,
  creditsEarned,
  deriveResult,
  latestAttempts,
  percentage,
  previewLine,
  resolveGrade,
  subjectPercentage,
  validateScheme,
  type SubjectResultInput,
} from '@/lib/grading'

const r = (over: Partial<SubjectResultInput> = {}): SubjectResultInput => ({
  subjectId: 's1',
  code: 'CS301',
  credits: 4,
  mse_marks: null,
  mse_max: null,
  see_marks: null,
  see_max: null,
  grade: null,
  grade_points: null,
  result: 'PENDING',
  ...over,
})

describe('percentage', () => {
  it('computes only with a positive max', () => {
    expect(percentage(40, 50)).toEqual({ value: 80, reason: null })
    expect(percentage(40, null).value).toBeNull()
    expect(percentage(40, 0).value).toBeNull()
    expect(percentage(null, 50).reason).toBe('Marks not entered')
  })
  it('rejects marks outside range', () => {
    expect(percentage(60, 50).value).toBeNull()
    expect(percentage(-1, 50).value).toBeNull()
  })
  it('rounds to 2 decimals', () => {
    expect(percentage(1, 3).value).toBe(33.33)
  })
})

describe('subjectPercentage', () => {
  it('weights MSE and SEE', () => {
    expect(subjectPercentage(r({ mse_marks: 40, mse_max: 50, see_marks: 60, see_max: 100 }), DEFAULT_SCHEME).value).toBe(70)
  })
  it('handles mixed max marks correctly (normalises each component)', () => {
    expect(subjectPercentage(r({ mse_marks: 15, mse_max: 20, see_marks: 45, see_max: 60 }), DEFAULT_SCHEME).value).toBe(75)
  })
  it('uses the single component when only one exists', () => {
    expect(subjectPercentage(r({ see_marks: 72, see_max: 100 }), DEFAULT_SCHEME).value).toBe(72)
  })
  it('refuses when a component has marks but no max', () => {
    const res = subjectPercentage(r({ mse_marks: 30, see_marks: 50, see_max: 100 }), DEFAULT_SCHEME)
    expect(res.value).toBeNull()
    expect(res.reason).toMatch(/MSE/)
  })
  it('refuses with no data', () => {
    expect(subjectPercentage(r(), DEFAULT_SCHEME).value).toBeNull()
  })
})

describe('bands & grades', () => {
  it('picks the highest band at or below the percentage', () => {
    expect(bandForPercentage(90, DEFAULT_SCHEME)?.grade).toBe('O')
    expect(bandForPercentage(89.99, DEFAULT_SCHEME)?.grade).toBe('A+')
    expect(bandForPercentage(0, DEFAULT_SCHEME)?.grade).toBe('F')
  })
  it('prefers entered grade points over everything', () => {
    const g = resolveGrade(r({ grade_points: 7, mse_marks: 50, mse_max: 50 }), DEFAULT_SCHEME)
    expect(g.value?.points).toBe(7)
    expect(g.value?.source).toBe('ENTERED')
  })
  it('looks up an entered grade letter case-insensitively', () => {
    expect(resolveGrade(r({ grade: 'a+' }), DEFAULT_SCHEME).value?.points).toBe(9)
  })
  it('rejects a grade letter not in the scheme', () => {
    expect(resolveGrade(r({ grade: 'Z' }), DEFAULT_SCHEME).value).toBeNull()
  })
  it('rejects out-of-range grade points', () => {
    expect(resolveGrade(r({ grade_points: 11 }), DEFAULT_SCHEME).value).toBeNull()
  })
  it('computes from marks when nothing was entered', () => {
    const g = resolveGrade(r({ mse_marks: 42, mse_max: 50, see_marks: 80, see_max: 100 }), DEFAULT_SCHEME)
    expect(g.value).toMatchObject({ grade: 'A+', points: 9, source: 'COMPUTED', percentage: 82 })
  })
  it('treats ABSENT as zero points', () => {
    expect(resolveGrade(r({ result: 'ABSENT' }), DEFAULT_SCHEME).value?.points).toBe(0)
  })
  it('keeps pending results without marks uncomputed', () => {
    expect(resolveGrade(r({ result: 'PENDING' }), DEFAULT_SCHEME).reason).toBe('Result pending')
  })
})

describe('result and credits', () => {
  it('derives PASS/FAIL from percentage', () => {
    expect(deriveResult(r({ see_marks: 39, see_max: 100 }), DEFAULT_SCHEME)).toBe('FAIL')
    expect(deriveResult(r({ see_marks: 40, see_max: 100 }), DEFAULT_SCHEME)).toBe('PASS')
  })
  it('respects an explicit result', () => {
    expect(deriveResult(r({ result: 'FAIL', see_marks: 90, see_max: 100 }), DEFAULT_SCHEME)).toBe('FAIL')
  })
  it('earns credits only on pass unless explicitly entered', () => {
    expect(creditsEarned(r({ result: 'PASS' , grade: 'A'}), DEFAULT_SCHEME)).toBe(4)
    expect(creditsEarned(r({ result: 'FAIL', grade: 'F' }), DEFAULT_SCHEME)).toBe(0)
    expect(creditsEarned(r({ result: 'PASS', credits_earned: 3 }), DEFAULT_SCHEME)).toBe(3)
  })
})

describe('computeSgpa', () => {
  it('is credit weighted', () => {
    const res = computeSgpa(
      [r({ subjectId: 'a', credits: 4, grade_points: 9, result: 'PASS' }), r({ subjectId: 'b', credits: 2, grade_points: 6, result: 'PASS' })],
      DEFAULT_SCHEME,
    )
    expect(res.value?.sgpa).toBe(8)
    expect(res.value?.creditsRegistered).toBe(6)
    expect(res.value?.creditsEarned).toBe(6)
  })
  it('refuses when any subject is missing grade points, naming them', () => {
    const res = computeSgpa(
      [r({ subjectId: 'a', grade_points: 9 }), r({ subjectId: 'b', code: 'MA302' }), r({ subjectId: 'c', code: 'PH101' })],
      DEFAULT_SCHEME,
    )
    expect(res.value).toBeNull()
    expect(res.reason).toBe('SGPA not calculated: 2 subjects missing grade points (MA302, PH101)')
  })
  it('includes failed subjects at 0 points', () => {
    const res = computeSgpa(
      [r({ subjectId: 'a', credits: 4, grade_points: 10, result: 'PASS' }), r({ subjectId: 'b', credits: 4, grade: 'F', result: 'FAIL' })],
      DEFAULT_SCHEME,
    )
    expect(res.value?.sgpa).toBe(5)
    expect(res.value?.creditsEarned).toBe(4)
  })
  it('excludes zero-credit subjects', () => {
    const res = computeSgpa(
      [r({ subjectId: 'a', credits: 3, grade_points: 8 }), r({ subjectId: 'b', credits: 0 })],
      DEFAULT_SCHEME,
    )
    expect(res.value?.sgpa).toBe(8)
  })
  it('refuses when only zero-credit subjects exist', () => {
    expect(computeSgpa([r({ credits: 0, grade_points: 8 })], DEFAULT_SCHEME).value).toBeNull()
  })
  it('uses the latest attempt for re-registered subjects within a semester', () => {
    const res = computeSgpa(
      [r({ subjectId: 'a', attempt: 1, grade_points: 0, result: 'FAIL' }), r({ subjectId: 'a', attempt: 2, grade_points: 7, result: 'PASS' })],
      DEFAULT_SCHEME,
    )
    expect(res.value?.sgpa).toBe(7)
  })
  it('refuses without a scheme', () => {
    expect(computeSgpa([r({ grade_points: 8 })], null).reason).toMatch(/no active grading scheme/)
  })
})

describe('computeCgpa', () => {
  it('weights by credits across semesters', () => {
    const res = computeCgpa(
      [
        { semesterNo: 1, results: [r({ subjectId: 'a', credits: 4, grade_points: 8 })] },
        { semesterNo: 2, results: [r({ subjectId: 'b', credits: 2, grade_points: 5 })] },
      ],
      DEFAULT_SCHEME,
    )
    expect(res.value?.cgpa).toBe(7)
    expect(res.value?.includedSemesters).toEqual([1, 2])
  })
  it('excludes incomplete semesters and explains why', () => {
    const res = computeCgpa(
      [
        { semesterNo: 1, results: [r({ subjectId: 'a', grade_points: 8 })] },
        { semesterNo: 2, results: [r({ subjectId: 'b' })] },
      ],
      DEFAULT_SCHEME,
    )
    expect(res.value?.cgpa).toBe(8)
    expect(res.value?.excludedSemesters[0]?.semesterNo).toBe(2)
  })
  it('counts a subject re-registered in a later semester once (latest)', () => {
    const res = computeCgpa(
      [
        { semesterNo: 3, results: [r({ subjectId: 'm', credits: 4, grade_points: 0, result: 'FAIL' }), r({ subjectId: 'x', credits: 4, grade_points: 8 })] },
        { semesterNo: 4, results: [r({ subjectId: 'm', credits: 4, grade_points: 6, result: 'PASS' })] },
      ],
      DEFAULT_SCHEME,
    )
    expect(res.value?.cgpa).toBe(7)
    expect(res.value?.credits).toBe(8)
  })
  it('refuses when nothing is complete', () => {
    expect(computeCgpa([{ semesterNo: 1, results: [r()] }], DEFAULT_SCHEME).value).toBeNull()
    expect(computeCgpa([], DEFAULT_SCHEME).value).toBeNull()
  })
})

describe('scheme helpers', () => {
  it('renders the live preview line', () => {
    expect(previewLine(85, 100, DEFAULT_SCHEME)).toBe('85/100 → A+ → 9 grade points')
  })
  it('validates a good scheme', () => {
    expect(validateScheme(DEFAULT_SCHEME)).toEqual([])
  })
  it('catches broken schemes', () => {
    const errs = validateScheme({
      ...DEFAULT_SCHEME,
      mse_weight: 0.6,
      bands: [
        { min_pct: 50, grade: 'A', points: 5 },
        { min_pct: 40, grade: 'A', points: 8 },
      ],
    })
    expect(errs).toEqual(
      expect.arrayContaining([
        'The lowest band must start at 0%',
        'Grade A appears twice',
        'Grade points must not increase as percentage decreases',
        'MSE and SEE weights must add up to 100%',
      ]),
    )
  })
  it('latestAttempts keeps max attempt', () => {
    expect(latestAttempts([{ subjectId: 'a', attempt: 2 }, { subjectId: 'a', attempt: 1 }])).toEqual([{ subjectId: 'a', attempt: 2 }])
  })
})
