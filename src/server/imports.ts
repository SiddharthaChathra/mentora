import 'server-only'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import { z } from 'zod'
import type { DB } from './supabase'

export type ImportKind = 'students' | 'mentors' | 'subjects' | 'results'

const num = (opt = true) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), opt ? z.number({ error: 'must be a number' }).nullable() : z.number({ error: 'must be a number' }))

export const IMPORT_KINDS: Record<ImportKind, { label: string; columns: string[]; example: Record<string, string | number>; schema: z.ZodType; key: (r: Record<string, unknown>) => string }> = {
  students: {
    label: 'Students',
    columns: ['email', 'full_name', 'usn', 'program', 'current_semester', 'section', 'admission_year', 'expected_graduation_year'],
    example: { email: 'student@college.edu', full_name: 'Ananya Sharma', usn: '1MT24CS001', program: 'B.E. Computer Science & Engineering', current_semester: 3, section: 'A', admission_year: 2024, expected_graduation_year: 2028 },
    schema: z.object({
      email: z.email('invalid email').trim().toLowerCase(),
      full_name: z.string().trim().min(2, 'name required').max(120),
      usn: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,20}$/, 'invalid USN'),
      program: z.string().trim().max(80).optional().or(z.literal('')),
      current_semester: num().refine((v) => v == null || (Number.isInteger(v) && v >= 1 && v <= 12), 'semester 1–12'),
      section: z.string().trim().max(20).optional().or(z.literal('')),
      admission_year: num().refine((v) => v == null || (v >= 1990 && v <= 2100), 'invalid year'),
      expected_graduation_year: num().refine((v) => v == null || (v >= 1990 && v <= 2110), 'invalid year'),
    }),
    key: (r) => String(r.usn ?? '').toUpperCase(),
  },
  mentors: {
    label: 'Mentors',
    columns: ['email', 'full_name', 'designation', 'faculty_id', 'phone', 'capacity'],
    example: { email: 'mentor@college.edu', full_name: 'Dr. Priya Rao', designation: 'Assistant Professor', faculty_id: 'FAC-CS-110', phone: '+91 98450 12345', capacity: 15 },
    schema: z.object({
      email: z.email('invalid email').trim().toLowerCase(),
      full_name: z.string().trim().min(2, 'name required').max(120),
      designation: z.string().trim().max(80).optional().or(z.literal('')),
      faculty_id: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/, 'invalid faculty ID').optional().or(z.literal('')),
      phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'invalid phone').optional().or(z.literal('')),
      capacity: num().refine((v) => v == null || (v >= 1 && v <= 200), 'capacity 1–200'),
    }),
    key: (r) => String(r.email ?? '').toLowerCase(),
  },
  subjects: {
    label: 'Subjects',
    columns: ['code', 'name', 'credits', 'semester', 'mse_max', 'see_max'],
    example: { code: 'CS302', name: 'Data Structures and Applications', credits: 4, semester: 3, mse_max: 50, see_max: 100 },
    schema: z.object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,16}$/, 'invalid code'),
      name: z.string().trim().min(2, 'name required').max(140),
      credits: num(false).refine((v) => v != null && v >= 0 && v <= 30, 'credits 0–30'),
      semester: num().refine((v) => v == null || (v >= 1 && v <= 12), 'semester 1–12'),
      mse_max: num().refine((v) => v == null || v > 0, 'must be > 0'),
      see_max: num().refine((v) => v == null || v > 0, 'must be > 0'),
    }),
    key: (r) => String(r.code ?? '').toUpperCase(),
  },
  results: {
    label: 'Results',
    columns: ['usn', 'semester_no', 'academic_year', 'subject_code', 'credits', 'mse_marks', 'mse_max', 'see_marks', 'see_max', 'grade', 'grade_points', 'result'],
    example: { usn: '1MT24CS001', semester_no: 3, academic_year: '2025-26', subject_code: 'CS302', credits: 4, mse_marks: 42, mse_max: 50, see_marks: 78, see_max: 100, grade: 'A', grade_points: 8, result: 'PASS' },
    schema: z
      .object({
        usn: z.string().trim().toUpperCase().min(4, 'USN required'),
        semester_no: num(false).refine((v) => v != null && Number.isInteger(v) && v >= 1 && v <= 12, 'semester 1–12'),
        academic_year: z.string().trim().regex(/^\d{4}-\d{2}$/, 'use 2025-26'),
        subject_code: z.string().trim().toUpperCase().min(2, 'subject code required'),
        credits: num(),
        mse_marks: num(),
        mse_max: num(),
        see_marks: num(),
        see_max: num(),
        grade: z.string().trim().toUpperCase().max(4).optional().or(z.literal('')),
        grade_points: num().refine((v) => v == null || (v >= 0 && v <= 10), 'grade points 0–10'),
        result: z.enum(['PASS', 'FAIL', 'PENDING', 'ABSENT', '']).optional(),
      })
      .superRefine((v, ctx) => {
        if (v.mse_marks != null && v.mse_max != null && v.mse_marks > v.mse_max) ctx.addIssue({ code: 'custom', path: ['mse_marks'], message: 'MSE marks exceed max' })
        if (v.see_marks != null && v.see_max != null && v.see_marks > v.see_max) ctx.addIssue({ code: 'custom', path: ['see_marks'], message: 'SEE marks exceed max' })
      }),
    key: (r) => `${String(r.usn ?? '').toUpperCase()}|${r.semester_no}|${String(r.subject_code ?? '').toUpperCase()}`,
  },
}

export type ParsedRow = { row: number; data: Record<string, unknown>; errors: string[]; duplicate: 'file' | 'existing' | null }

const MAX_ROWS = 5000

export async function parseFile(name: string, bytes: Uint8Array): Promise<Record<string, string>[]> {
  if (name.toLowerCase().endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '')
    const out = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_') })
    return out.data.slice(0, MAX_ROWS + 1)
  }
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  const ws = wb.worksheets[0]
  if (!ws) return []
  const headers: string[] = []
  ws.getRow(1).eachCell((c, i) => (headers[i] = String(c.text).trim().toLowerCase().replace(/\s+/g, '_')))
  const rows: Record<string, string>[] = []
  ws.eachRow((row, i) => {
    if (i === 1 || rows.length > MAX_ROWS) return
    const rec: Record<string, string> = {}
    row.eachCell({ includeEmpty: true }, (c, j) => {
      if (headers[j]) rec[headers[j]!] = String(c.text ?? '').trim()
    })
    if (Object.values(rec).some((v) => v !== '')) rows.push(rec)
  })
  return rows
}

/** Validate rows and detect duplicates within the file and against existing data. */
export async function validateRows(db: DB, kind: ImportKind, raw: Record<string, string>[], departmentId: string): Promise<ParsedRow[]> {
  const def = IMPORT_KINDS[kind]
  const missing = def.columns.filter((c) => ['email', 'usn', 'code', 'subject_code', 'semester_no'].includes(c) && raw.length && !(c in raw[0]!))
  const seen = new Set<string>()
  const rows: ParsedRow[] = raw.map((r, i) => {
    const parsed = def.schema.safeParse(r)
    const errors = parsed.success ? [] : parsed.error.issues.map((x) => `${String(x.path[0] ?? 'row')}: ${x.message}`)
    if (missing.length) errors.unshift(`missing column(s): ${missing.join(', ')}`)
    const data = (parsed.success ? parsed.data : r) as Record<string, unknown>
    const k = def.key(data)
    const dup = k && seen.has(k) ? 'file' : null
    if (k) seen.add(k)
    return { row: i + 2, data, errors, duplicate: dup }
  })

  // Existing-data duplicates
  const valid = rows.filter((r) => !r.errors.length)
  if (kind === 'students' || kind === 'mentors') {
    const emails = valid.map((r) => String(r.data.email))
    const { data } = emails.length ? await db.from('users').select('email').in('email', emails) : { data: [] }
    const existing = new Set((data ?? []).map((u) => String(u.email).toLowerCase()))
    let usnTaken = new Set<string>()
    if (kind === 'students') {
      const usns = valid.map((r) => String(r.data.usn))
      const { data: p } = usns.length ? await db.from('student_profiles').select('usn').in('usn', usns) : { data: [] }
      usnTaken = new Set((p ?? []).map((x) => String(x.usn).toUpperCase()))
    }
    for (const r of valid) if (existing.has(String(r.data.email)) || usnTaken.has(String(r.data.usn ?? '').toUpperCase())) r.duplicate ??= 'existing'
  } else if (kind === 'subjects') {
    const { data } = await db.from('subjects').select('code').eq('department_id', departmentId)
    const existing = new Set((data ?? []).map((s) => s.code))
    for (const r of valid) if (existing.has(String(r.data.code))) r.duplicate ??= 'existing'
  } else {
    const usns = [...new Set(valid.map((r) => String(r.data.usn)))]
    const { data: profs } = usns.length ? await db.from('student_profiles').select('user_id, usn').in('usn', usns) : { data: [] }
    const idBy = new Map((profs ?? []).map((p) => [String(p.usn).toUpperCase(), p.user_id]))
    const { data: subs } = await db.from('subjects').select('id, code').eq('department_id', departmentId)
    const subBy = new Map((subs ?? []).map((s) => [s.code, s.id]))
    for (const r of valid) {
      if (!idBy.has(String(r.data.usn))) r.errors.push(`usn: no student with USN ${r.data.usn}`)
      if (!subBy.has(String(r.data.subject_code))) r.errors.push(`subject_code: unknown subject ${r.data.subject_code}`)
    }
    const ids = [...idBy.values()]
    if (ids.length) {
      const { data: existing } = await db.from('academic_semesters').select('student_id, semester_no, status, student_subject_results(subject_id)').in('student_id', ids)
      const keys = new Set<string>()
      for (const s of existing ?? []) for (const res of (s.student_subject_results ?? []) as { subject_id: string }[]) keys.add(`${s.student_id}|${s.semester_no}|${res.subject_id}`)
      for (const r of rows.filter((x) => !x.errors.length)) {
        const k = `${idBy.get(String(r.data.usn))}|${r.data.semester_no}|${subBy.get(String(r.data.subject_code))}`
        if (keys.has(k)) r.duplicate ??= 'existing'
      }
    }
  }
  return rows
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  return Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => (r[c] == null ? '' : String(r[c])))) })
}

export async function toXlsx(sheet: string, columns: { key: string; header: string; width?: number }[], rows: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Mentora'
  const ws = wb.addWorksheet(sheet)
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 4) }))
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B3BF2' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  for (const r of rows) ws.addRow(r)
  return Buffer.from(await wb.xlsx.writeBuffer())
}
