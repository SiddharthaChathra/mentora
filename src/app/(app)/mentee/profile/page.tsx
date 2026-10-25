import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getActiveMentor, getSettings, getStudentProfile, listSections } from '@/server/services/people'
import { studentMissing } from '@/lib/profile-completion'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardBody, CardHeader, Pill, ProgressRing } from '@/components/ui/primitives'
import { MentorCard } from '@/features/mentoring/cards'
import { StudentProfileEditor } from '@/features/profile/profile-editor'

export const metadata: Metadata = { title: 'My profile' }
const s = (v: unknown) => (v == null ? '' : String(v))

export default async function MenteeProfilePage() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [p, sections, settings, mentor] = await Promise.all([getStudentProfile(db, actor.id), listSections(db, actor.departmentId), getSettings(db), getActiveMentor(db, actor.id)])
  if (!p) return null
  const missing = studentMissing({ full_name: p.fullName, phone: p.phone, usn: p.usn, program: p.program, current_semester: p.currentSemester, section_id: p.sectionId, admission_year: p.admissionYear, expected_graduation_year: p.expectedGraduationYear })
  return (
    <>
      <PageHeader title="My" accent="profile" description="Keep your details current so your mentor can guide you well." />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <StudentProfileEditor
          userId={actor.id}
          email={p.email}
          avatarPath={p.avatarPath}
          departmentName={p.departmentName}
          sections={sections}
          optional={settings.optionalFields}
          personal={{ full_name: s(p.fullName), phone: s(p.phone), dob: s(p.dob), gender: s(p.gender), address: s(p.address) }}
          academic={{ usn: s(p.usn), program: s(p.program), current_semester: s(p.currentSemester), section_id: s(p.sectionId), admission_year: s(p.admissionYear), expected_graduation_year: s(p.expectedGraduationYear) }}
          about={{ skills: p.skills, interests: p.interests, career_goals: s(p.careerGoals), achievements: s(p.achievements), support_areas: s(p.supportAreas) }}
        />
        <div className="space-y-4">
          <Card>
            <CardHeader title="Profile completion" />
            <CardBody className="flex items-center gap-5">
              <ProgressRing value={p.profileCompletion} size={84} stroke={8} label="Profile completion">
                <span className="num-display text-lg font-semibold text-ink-900">{p.profileCompletion}%</span>
              </ProgressRing>
              <div className="text-sm">
                {missing.length ? (
                  <>
                    <p className="font-medium text-ink-900">Still needed</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {missing.map((m) => (
                        <Pill key={m.field} tone="warning">
                          {m.label}
                        </Pill>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-ink-700">All required details are complete. Add a photo, skills and goals to reach 100%.</p>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Mentor & group" description="Assigned by your HOD — you can’t change this." />
            <CardBody>
              <MentorCard mentor={mentor} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
