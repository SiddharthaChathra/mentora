// Profile completion — which required fields are still missing, grouped by wizard step.

export type MissingField = { step: number; field: string; label: string }

export type StudentProfileLike = {
  full_name?: string | null
  avatar_path?: string | null
  phone?: string | null
  usn?: string | null
  program?: string | null
  current_semester?: number | null
  section_id?: string | null
  admission_year?: number | null
  expected_graduation_year?: number | null
  skills?: string[] | null
  career_goals?: string | null
}

const STUDENT_REQUIRED: { step: number; field: keyof StudentProfileLike; label: string }[] = [
  { step: 0, field: 'full_name', label: 'Full name' },
  { step: 0, field: 'phone', label: 'Phone number' },
  { step: 1, field: 'usn', label: 'USN' },
  { step: 1, field: 'program', label: 'Program' },
  { step: 1, field: 'current_semester', label: 'Current semester' },
  { step: 1, field: 'section_id', label: 'Section' },
  { step: 1, field: 'admission_year', label: 'Admission year' },
  { step: 1, field: 'expected_graduation_year', label: 'Expected graduation year' },
]

// Recommended (not blocking) fields count toward the completion meter.
const STUDENT_RECOMMENDED: (keyof StudentProfileLike)[] = ['avatar_path', 'skills', 'career_goals']

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v != null && v !== '')

export function studentMissing(p: StudentProfileLike): MissingField[] {
  return STUDENT_REQUIRED.filter((r) => !filled(p[r.field])).map((r) => ({ step: r.step, field: r.field, label: r.label }))
}

export function studentCompletion(p: StudentProfileLike, hasAcademicHistory: boolean): number {
  const total = STUDENT_REQUIRED.length + STUDENT_RECOMMENDED.length + 1
  const done =
    STUDENT_REQUIRED.filter((r) => filled(p[r.field])).length +
    STUDENT_RECOMMENDED.filter((f) => filled(p[f])).length +
    (hasAcademicHistory ? 1 : 0)
  return Math.round((done / total) * 100)
}

export type MentorProfileLike = {
  full_name?: string | null
  phone?: string | null
  official_email?: string | null
  designation?: string | null
  faculty_id?: string | null
  expertise?: string[] | null
}

const MENTOR_REQUIRED: { field: keyof MentorProfileLike; label: string }[] = [
  { field: 'full_name', label: 'Full name' },
  { field: 'official_email', label: 'Official email' },
  { field: 'phone', label: 'Phone number' },
  { field: 'designation', label: 'Designation' },
  { field: 'faculty_id', label: 'Faculty ID' },
]

export function mentorMissing(p: MentorProfileLike): MissingField[] {
  return MENTOR_REQUIRED.filter((r) => !filled(p[r.field])).map((r) => ({ step: 0, field: r.field, label: r.label }))
}
