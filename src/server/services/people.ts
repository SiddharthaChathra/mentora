import 'server-only'
import type { DB } from '@/server/supabase'
import { check } from '@/server/handle'

export type StudentProfile = {
  id: string
  email: string
  status: string
  createdAt: string
  onboardingCompletedAt: string | null
  departmentId: string | null
  departmentName: string | null
  fullName: string | null
  avatarPath: string | null
  usn: string | null
  phone: string | null
  dob: string | null
  gender: string | null
  address: string | null
  program: string | null
  currentSemester: number | null
  sectionId: string | null
  sectionName: string | null
  admissionYear: number | null
  expectedGraduationYear: number | null
  skills: string[]
  interests: string[]
  careerGoals: string | null
  achievements: string | null
  supportAreas: string | null
  profileCompletion: number
}

export type MentorSummary = {
  id: string
  fullName: string | null
  avatarPath: string | null
  designation: string | null
  officialEmail: string | null
  phone: string | null
  expertise: string[]
  groupName: string | null
  since: string
}

export async function getStudentProfile(db: DB, studentId: string): Promise<StudentProfile | null> {
  const { data: u } = await db.from('users').select('id, email, status, created_at, onboarding_completed_at, department_id, departments(name)').eq('id', studentId).maybeSingle()
  if (!u) return null
  const { data: p } = await db.from('student_profiles').select('*, sections(name)').eq('user_id', studentId).maybeSingle()
  return {
    id: u.id,
    email: u.email,
    status: u.status,
    createdAt: u.created_at,
    onboardingCompletedAt: u.onboarding_completed_at,
    departmentId: u.department_id,
    departmentName: (u.departments as { name: string } | null)?.name ?? null,
    fullName: p?.full_name ?? null,
    avatarPath: p?.avatar_path ?? null,
    usn: p?.usn ?? null,
    phone: p?.phone ?? null,
    dob: p?.dob ?? null,
    gender: p?.gender ?? null,
    address: p?.address ?? null,
    program: p?.program ?? null,
    currentSemester: p?.current_semester ?? null,
    sectionId: p?.section_id ?? null,
    sectionName: (p?.sections as { name: string } | null)?.name ?? null,
    admissionYear: p?.admission_year ?? null,
    expectedGraduationYear: p?.expected_graduation_year ?? null,
    skills: p?.skills ?? [],
    interests: p?.interests ?? [],
    careerGoals: p?.career_goals ?? null,
    achievements: p?.achievements ?? null,
    supportAreas: p?.support_areas ?? null,
    profileCompletion: p?.profile_completion ?? 0,
  }
}

/** The student's ACTIVE mentor (null when unassigned). */
export async function getActiveMentor(db: DB, studentId: string): Promise<MentorSummary | null> {
  const { data: a } = await db.from('mentor_assignments').select('mentor_id, group_name, started_at').eq('student_id', studentId).is('ended_at', null).maybeSingle()
  if (!a) return null
  const { data: m } = await db.from('mentor_profiles').select('*').eq('user_id', a.mentor_id).maybeSingle()
  return {
    id: a.mentor_id,
    fullName: m?.full_name ?? null,
    avatarPath: m?.avatar_path ?? null,
    designation: m?.designation ?? null,
    officialEmail: m?.official_email ?? null,
    phone: m?.phone ?? null,
    expertise: m?.expertise ?? [],
    groupName: a.group_name,
    since: a.started_at,
  }
}

export type MenteeRow = {
  id: string
  name: string | null
  usn: string | null
  avatarPath: string | null
  currentSemester: number | null
  sectionName: string | null
  sectionId: string | null
  onboardingCompletedAt: string | null
  createdAt: string
  groupName: string | null
  assignedAt: string
}

/** Active mentees of a mentor (RLS also limits a mentor to their own). */
export async function listMentees(db: DB, mentorId: string): Promise<MenteeRow[]> {
  const rows = check(
    await db.from('mentor_assignments').select('student_id, group_name, started_at').eq('mentor_id', mentorId).is('ended_at', null),
  ) as { student_id: string; group_name: string | null; started_at: string }[]
  if (!rows?.length) return []
  const ids = rows.map((r) => r.student_id)
  const [{ data: profiles }, { data: users }] = await Promise.all([
    db.from('student_profiles').select('user_id, full_name, usn, avatar_path, current_semester, section_id, sections(name)').in('user_id', ids),
    db.from('users').select('id, onboarding_completed_at, created_at').in('id', ids),
  ])
  const pById = new Map((profiles ?? []).map((p) => [p.user_id, p]))
  const uById = new Map((users ?? []).map((u) => [u.id, u]))
  return rows
    .map((r) => {
      const p = pById.get(r.student_id)
      const u = uById.get(r.student_id)
      return {
        id: r.student_id,
        name: p?.full_name ?? null,
        usn: p?.usn ?? null,
        avatarPath: p?.avatar_path ?? null,
        currentSemester: p?.current_semester ?? null,
        sectionName: (p?.sections as { name: string } | null)?.name ?? null,
        sectionId: p?.section_id ?? null,
        onboardingCompletedAt: u?.onboarding_completed_at ?? null,
        createdAt: u?.created_at ?? r.started_at,
        groupName: r.group_name,
        assignedAt: r.started_at,
      }
    })
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
}

export async function listSections(db: DB, departmentId: string | null) {
  if (!departmentId) return []
  const { data } = await db.from('sections').select('id, name').eq('department_id', departmentId).order('name')
  return data ?? []
}

export async function getSettings(db: DB) {
  const { data } = await db.from('app_settings').select('key, value')
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>
  return {
    optionalFields: (map.optional_profile_fields as { dob?: boolean; gender?: boolean; address?: boolean } | undefined) ?? { dob: true, gender: true, address: true },
    attendanceEnabled: (map.attendance_category_enabled as boolean | undefined) ?? true,
    aiEnabled: (map.ai_insights_enabled as boolean | undefined) ?? false,
    institutionName: (map.institution_name as string | undefined) ?? 'Mentora Institute',
    programCredits: (map.program_total_credits as number | undefined) ?? null,
  }
}
