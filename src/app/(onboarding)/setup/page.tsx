import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ROLE_HOME, requireUser } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listSubjects, loadStudentAcademics } from '@/server/services/academics'
import { getActiveMentor, getSettings, listMentees, listSections } from '@/server/services/people'
import { SetupWizard, type WizardProps } from '@/features/profile/setup-wizard'

export const metadata: Metadata = { title: 'Set up your profile' }

const s = (v: unknown) => (v == null ? '' : String(v))

export default async function SetupPage() {
  const actor = await requireUser({ allowIncompleteOnboarding: true })
  if (actor.onboardingCompletedAt) redirect(ROLE_HOME[actor.role])
  const db = await createClient()
  const [{ data: dept }, sections, settings] = await Promise.all([
    actor.departmentId ? db.from('departments').select('name').eq('id', actor.departmentId).maybeSingle() : Promise.resolve({ data: null }),
    listSections(db, actor.departmentId),
    getSettings(db),
  ])

  const base: WizardProps = {
    role: actor.role,
    userId: actor.id,
    email: actor.email,
    departmentName: dept?.name ?? null,
    sections,
    optionalFields: settings.optionalFields,
    avatarPath: actor.avatarPath,
    initialStep: 0,
  }

  if (actor.role === 'MENTEE') {
    const [{ data: p }, mentor, academics, subjects] = await Promise.all([
      db.from('student_profiles').select('*').eq('user_id', actor.id).maybeSingle(),
      getActiveMentor(db, actor.id),
      loadStudentAcademics(db, actor.id, actor.departmentId),
      listSubjects(db, actor.departmentId),
    ])
    const draft = (p?.draft ?? {}) as Partial<NonNullable<WizardProps['student']>>
    return (
      <SetupWizard
        {...base}
        initialStep={p?.draft_step ?? 0}
        student={{
          personal: { full_name: s(p?.full_name), phone: s(p?.phone), dob: s(p?.dob), gender: s(p?.gender), address: s(p?.address), ...draft.personal },
          academic: {
            usn: s(p?.usn),
            program: s(p?.program),
            current_semester: s(p?.current_semester),
            section_id: s(p?.section_id),
            admission_year: s(p?.admission_year),
            expected_graduation_year: s(p?.expected_graduation_year),
            ...draft.academic,
          },
          about: { skills: p?.skills ?? [], interests: p?.interests ?? [], career_goals: s(p?.career_goals), achievements: s(p?.achievements), support_areas: s(p?.support_areas), ...draft.about },
        }}
        assignedMentor={mentor}
        semesters={academics.semesters}
        subjects={subjects}
        scheme={academics.scheme}
        admissionYear={p?.admission_year ?? null}
      />
    )
  }

  if (actor.role === 'MENTOR') {
    const [{ data: p }, mentees] = await Promise.all([db.from('mentor_profiles').select('*').eq('user_id', actor.id).maybeSingle(), listMentees(db, actor.id)])
    const draft = ((p?.draft ?? {}) as { mentor?: Partial<NonNullable<WizardProps['mentor']>> }).mentor ?? {}
    return (
      <SetupWizard
        {...base}
        initialStep={p?.draft_step ?? 0}
        mentor={{
          full_name: s(p?.full_name),
          phone: s(p?.phone),
          official_email: s(p?.official_email ?? actor.email),
          designation: s(p?.designation),
          faculty_id: s(p?.faculty_id),
          expertise: p?.expertise ?? [],
          ...draft,
        }}
        mentees={mentees.map((m) => ({ id: m.id, name: m.name, usn: m.usn }))}
      />
    )
  }

  const { data: p } = await db.from('hod_profiles').select('*').eq('user_id', actor.id).maybeSingle()
  return <SetupWizard {...base} hod={{ full_name: s(p?.full_name), phone: s(p?.phone), designation: s(p?.designation) }} />
}
