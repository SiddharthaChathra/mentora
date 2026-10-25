import 'server-only'
import { cache } from 'react'
import type { DB } from '@/server/supabase'
import { check } from '@/server/handle'
import {
  computeCgpa,
  computeSgpa,
  DEFAULT_SCHEME,
  deriveResult,
  subjectPercentage,
  resolveGrade,
  type Computed,
  type GradingScheme,
  type SgpaResult,
  type SubjectResultInput,
} from '@/lib/grading'
import type { InsightSemester } from '@/lib/insights'
import { DEFAULT_THRESHOLDS, type Thresholds } from '@/lib/insights'
import { thresholdsFromRows } from '@/lib/risk'
import type { Database } from '@/types/database'

export type SemesterStatus = Database['public']['Enums']['semester_status']

export type ResultRow = {
  id: string
  subjectId: string
  code: string
  name: string
  subjectCredits: number
  credits: number
  attempt: number
  mse_marks: number | null
  mse_max: number | null
  see_marks: number | null
  see_max: number | null
  ia: { key: string; label: string; marks: number | null; max: number | null }[]
  grade: string | null
  grade_points: number | null
  result: 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT'
  credits_earned: number | null
  // derived
  pct: number | null
  pctReason: string | null
  resolvedGrade: string | null
  resolvedPoints: number | null
  gradeSource: string | null
  derivedResult: 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT'
}

export type SemesterBundle = {
  id: string
  semesterNo: number
  academicYear: string
  status: SemesterStatus
  manualSgpa: number | null
  manualCgpa: number | null
  submittedAt: string | null
  verifiedAt: string | null
  verifiedBy: string | null
  finalizedAt: string | null
  returnNote: string | null
  updatedAt: string
  results: ResultRow[]
  stored: { sgpa: number | null; computed: boolean; note: string | null; creditsEarned: number; creditsRegistered: number } | null
  sgpa: Computed<SgpaResult>
  /** The SGPA we display: snapshot for verified/finalized, live for drafts. */
  displaySgpa: number | null
  displayNote: string | null
}

export type StudentAcademics = {
  scheme: GradingScheme | null
  schemeId: string | null
  semesters: SemesterBundle[]
  cgpa: Computed<{ cgpa: number; credits: number; includedSemesters: number[]; excludedSemesters: { semesterNo: number; reason: string }[] }>
  creditsEarned: number
  creditsInProgress: number
}

const n = (v: unknown) => (v == null ? null : Number(v))

export const loadScheme = cache(async (db: DB, departmentId: string | null) => {
  if (!departmentId) return { scheme: null as GradingScheme | null, id: null as string | null, row: null }
  const { data } = await db.from('grading_schemes').select('*').eq('department_id', departmentId).eq('active', true).maybeSingle()
  if (!data) return { scheme: null, id: null, row: null }
  return {
    id: data.id,
    row: data,
    scheme: {
      id: data.id,
      bands: data.bands as GradingScheme['bands'],
      pass_pct: Number(data.pass_pct),
      mse_weight: Number(data.mse_weight),
      see_weight: Number(data.see_weight),
      max_grade_points: Number(data.max_grade_points),
    } satisfies GradingScheme,
  }
})

export const loadThresholds = cache(async (db: DB, departmentId: string | null): Promise<Thresholds> => {
  if (!departmentId) return DEFAULT_THRESHOLDS
  const { data } = await db.from('risk_thresholds').select('rule_key, value').eq('department_id', departmentId)
  return thresholdsFromRows(data ?? [])
})

const SEMESTER_SELECT = `id, student_id, semester_no, academic_year, status, manual_sgpa, manual_cgpa, submitted_at, verified_at, verified_by, finalized_at, return_note, updated_at,
  semester_summaries(sgpa, computed, computation_note, credits_earned, credits_registered),
  student_subject_results(id, subject_id, attempt, credits, mse_marks, mse_max, see_marks, see_max, ia, grade, grade_points, result, credits_earned,
    subjects(code, name, credits))`

type RawSemester = {
  id: string
  student_id: string
  semester_no: number
  academic_year: string
  status: SemesterStatus
  manual_sgpa: number | null
  manual_cgpa: number | null
  submitted_at: string | null
  verified_at: string | null
  verified_by: string | null
  finalized_at: string | null
  return_note: string | null
  updated_at: string
  semester_summaries: { sgpa: number | null; computed: boolean; computation_note: string | null; credits_earned: number; credits_registered: number } | null
  student_subject_results: {
    id: string
    subject_id: string
    attempt: number
    credits: number
    mse_marks: number | null
    mse_max: number | null
    see_marks: number | null
    see_max: number | null
    ia: unknown
    grade: string | null
    grade_points: number | null
    result: 'PASS' | 'FAIL' | 'PENDING' | 'ABSENT'
    credits_earned: number | null
    subjects: { code: string; name: string; credits: number } | null
  }[]
}

export function toEngineInput(r: ResultRow): SubjectResultInput {
  return {
    subjectId: r.subjectId,
    code: r.code,
    credits: r.credits,
    attempt: r.attempt,
    mse_marks: r.mse_marks,
    mse_max: r.mse_max,
    see_marks: r.see_marks,
    see_max: r.see_max,
    grade: r.grade,
    grade_points: r.grade_points,
    result: r.result,
    credits_earned: r.credits_earned,
  }
}

function buildSemester(raw: RawSemester, scheme: GradingScheme | null): SemesterBundle {
  const s = scheme ?? DEFAULT_SCHEME
  const results: ResultRow[] = raw.student_subject_results
    .map((r) => {
      const base = {
        id: r.id,
        subjectId: r.subject_id,
        code: r.subjects?.code ?? '—',
        name: r.subjects?.name ?? 'Unknown subject',
        subjectCredits: Number(r.subjects?.credits ?? r.credits),
        credits: Number(r.credits),
        attempt: r.attempt,
        mse_marks: n(r.mse_marks),
        mse_max: n(r.mse_max),
        see_marks: n(r.see_marks),
        see_max: n(r.see_max),
        ia: (Array.isArray(r.ia) ? r.ia : []) as ResultRow['ia'],
        grade: r.grade,
        grade_points: n(r.grade_points),
        result: r.result,
        credits_earned: n(r.credits_earned),
      }
      const engine = toEngineInput({ ...base } as ResultRow)
      const g = scheme ? resolveGrade(engine, s) : null
      const sp = subjectPercentage(engine, s)
      return {
        ...base,
        pct: sp.value,
        pctReason: sp.reason,
        resolvedGrade: g?.value?.grade ?? null,
        resolvedPoints: g?.value?.points ?? null,
        gradeSource: g?.value?.source ?? null,
        derivedResult: scheme ? deriveResult(engine, s) : base.result,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
  const sgpa = computeSgpa(results.map(toEngineInput), scheme)
  const stored = raw.semester_summaries
    ? {
        sgpa: n(raw.semester_summaries.sgpa),
        computed: raw.semester_summaries.computed,
        note: raw.semester_summaries.computation_note,
        creditsEarned: Number(raw.semester_summaries.credits_earned),
        creditsRegistered: Number(raw.semester_summaries.credits_registered),
      }
    : null
  const locked = raw.status === 'VERIFIED' || raw.status === 'FINALIZED'
  const displaySgpa = locked && stored ? (stored.computed ? stored.sgpa : null) : sgpa.value?.sgpa ?? null
  const displayNote = locked && stored ? (stored.computed ? null : stored.note) : sgpa.reason
  return {
    id: raw.id,
    semesterNo: raw.semester_no,
    academicYear: raw.academic_year,
    status: raw.status,
    manualSgpa: n(raw.manual_sgpa),
    manualCgpa: n(raw.manual_cgpa),
    submittedAt: raw.submitted_at,
    verifiedAt: raw.verified_at,
    verifiedBy: raw.verified_by,
    finalizedAt: raw.finalized_at,
    returnNote: raw.return_note,
    updatedAt: raw.updated_at,
    results,
    stored,
    sgpa,
    displaySgpa,
    displayNote,
  }
}

/** All academic data for one student (RLS decides visibility). */
export async function loadStudentAcademics(
  db: DB,
  studentId: string,
  departmentId: string | null,
  opts: { verifiedOnly?: boolean } = {},
): Promise<StudentAcademics> {
  const { scheme, id: schemeId } = await loadScheme(db, departmentId)
  let q = db.from('academic_semesters').select(SEMESTER_SELECT).eq('student_id', studentId).order('semester_no')
  if (opts.verifiedOnly) q = q.in('status', ['VERIFIED', 'FINALIZED'])
  const rows = (check(await q) ?? []) as unknown as RawSemester[]
  const semesters = rows.map((r) => buildSemester(r, scheme))
  const cgpa = computeCgpa(
    semesters.map((s) => ({ semesterNo: s.semesterNo, results: s.results.map(toEngineInput) })),
    scheme,
  )
  let creditsEarned = 0
  let creditsInProgress = 0
  for (const s of semesters) {
    for (const r of s.results) {
      if (r.derivedResult === 'PASS') creditsEarned += r.credits_earned ?? r.credits
      else if (r.derivedResult === 'PENDING') creditsInProgress += r.credits
    }
  }
  return { scheme, schemeId, semesters, cgpa, creditsEarned, creditsInProgress }
}

/** Bulk load for many students (mentor / HOD dashboards). One query per table. */
export async function loadManyAcademics(db: DB, studentIds: string[], departmentId: string | null) {
  const out = new Map<string, SemesterBundle[]>()
  if (studentIds.length === 0) return { scheme: null as GradingScheme | null, byStudent: out }
  const { scheme } = await loadScheme(db, departmentId)
  for (let i = 0; i < studentIds.length; i += 150) {
    const chunk = studentIds.slice(i, i + 150)
    const rows = (check(await db.from('academic_semesters').select(SEMESTER_SELECT).in('student_id', chunk).order('semester_no')) ?? []) as unknown as RawSemester[]
    for (const r of rows) {
      const list = out.get(r.student_id) ?? []
      list.push(buildSemester(r, scheme))
      out.set(r.student_id, list)
    }
  }
  return { scheme, byStudent: out }
}

export function toInsightSemesters(semesters: SemesterBundle[]): InsightSemester[] {
  return semesters.map((s) => ({
    semesterNo: s.semesterNo,
    sgpa: s.displaySgpa,
    results: s.results.map((r) => ({
      subjectId: r.subjectId,
      code: r.code,
      name: r.name,
      mse_marks: r.mse_marks,
      mse_max: r.mse_max,
      see_marks: r.see_marks,
      see_max: r.see_max,
      result: r.derivedResult,
    })),
  }))
}

/** Snapshot SGPA/CGPA into semester_summaries (called on submit and verify). */
export async function writeSummary(db: DB, studentId: string, semesterId: string, departmentId: string | null) {
  const academics = await loadStudentAcademics(db, studentId, departmentId)
  const sem = academics.semesters.find((s) => s.id === semesterId)
  if (!sem) return
  const upto = academics.semesters.filter((s) => s.semesterNo <= sem.semesterNo)
  const cg = computeCgpa(upto.map((s) => ({ semesterNo: s.semesterNo, results: s.results.map(toEngineInput) })), academics.scheme)
  check(
    await db.from('semester_summaries').upsert({
      academic_semester_id: semesterId,
      sgpa: sem.sgpa.value?.sgpa ?? null,
      cgpa_snapshot: cg.value?.cgpa ?? null,
      credits_registered: sem.sgpa.value?.creditsRegistered ?? sem.results.reduce((a, r) => a + r.credits, 0),
      credits_earned: sem.sgpa.value?.creditsEarned ?? 0,
      computed: sem.sgpa.value != null,
      computation_note: sem.sgpa.reason ?? (cg.value ? null : cg.reason),
      grading_scheme_id: academics.schemeId,
      computed_at: new Date().toISOString(),
    }),
  )
}

export async function listSubjects(db: DB, departmentId: string | null) {
  if (!departmentId) return []
  const { data } = await db.from('subjects').select('id, code, name, credits, semester, mse_max, see_max').eq('department_id', departmentId).order('semester').order('code')
  return (data ?? []).map((s) => ({ ...s, credits: Number(s.credits), mse_max: n(s.mse_max), see_max: n(s.see_max) }))
}

export async function pendingCorrectionTargets(db: DB, studentId: string) {
  const { data } = await db.from('record_change_requests').select('target_id').eq('student_id', studentId).eq('status', 'PENDING')
  return (data ?? []).map((r) => r.target_id)
}
