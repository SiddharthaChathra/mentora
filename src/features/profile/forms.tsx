'use client'

import * as React from 'react'
import { GENDER_LABEL } from '@/lib/labels'
import { FieldGroup, Input, Select, TagInput, Textarea } from '@/components/ui/field'

export type Errors = Record<string, string | undefined>
type Setter<T> = (patch: Partial<T>) => void

export type StudentPersonal = { full_name: string; phone: string; dob: string; gender: string; address: string }
export type StudentAcademic = {
  usn: string
  program: string
  current_semester: string
  section_id: string
  admission_year: string
  expected_graduation_year: string
}
export type StudentAbout = { skills: string[]; interests: string[]; career_goals: string; achievements: string; support_areas: string }
export type MentorForm = { full_name: string; phone: string; official_email: string; designation: string; faculty_id: string; expertise: string[] }
export type HodForm = { full_name: string; phone: string; designation: string }

export function StudentPersonalFields({
  v,
  set,
  errors,
  email,
  optional,
}: {
  v: StudentPersonal
  set: Setter<StudentPersonal>
  errors: Errors
  email: string
  optional: { dob?: boolean; gender?: boolean; address?: boolean }
}) {
  return (
    <div className="space-y-4">
      <Input id="full_name" label="Full name" autoComplete="name" value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} error={errors.full_name} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="email" label="Email" value={email} readOnly hint="Set by your department" />
        <Input id="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} required />
      </div>
      {(optional.dob || optional.gender) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {optional.dob && <Input id="dob" label="Date of birth (optional)" type="date" value={v.dob} onChange={(e) => set({ dob: e.target.value })} error={errors.dob} />}
          {optional.gender && (
            <Select
              id="gender"
              label="Gender (optional)"
              value={v.gender}
              onChange={(e) => set({ gender: e.target.value })}
              options={Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }))}
              placeholder="Prefer not to answer"
            />
          )}
        </div>
      )}
      {optional.address && <Textarea id="address" label="Address (optional)" rows={2} value={v.address} onChange={(e) => set({ address: e.target.value })} error={errors.address} />}
      <p className="text-xs text-ink-500">We only collect what mentoring needs. Optional fields can be left blank.</p>
    </div>
  )
}

export function StudentAcademicFields({
  v,
  set,
  errors,
  sections,
  departmentName,
}: {
  v: StudentAcademic
  set: Setter<StudentAcademic>
  errors: Errors
  sections: { id: string; name: string }[]
  departmentName: string | null
}) {
  const year = new Date().getFullYear()
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="usn" label="USN / Student ID" autoCapitalize="characters" value={v.usn} onChange={(e) => set({ usn: e.target.value.toUpperCase() })} error={errors.usn} required />
        <Input id="department" label="Department" value={departmentName ?? 'Not set'} readOnly hint="Assigned by your HOD" />
      </div>
      <Input id="program" label="Program" placeholder="B.E. Computer Science & Engineering" value={v.program} onChange={(e) => set({ program: e.target.value })} error={errors.program} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="current_semester"
          label="Current semester"
          value={v.current_semester}
          onChange={(e) => set({ current_semester: e.target.value })}
          options={Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))}
          error={errors.current_semester}
          required
        />
        <Select id="section_id" label="Section" value={v.section_id} onChange={(e) => set({ section_id: e.target.value })} options={sections.map((s) => ({ value: s.id, label: `Section ${s.name}` }))} error={errors.section_id} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="admission_year"
          label="Admission year"
          value={v.admission_year}
          onChange={(e) => set({ admission_year: e.target.value })}
          options={Array.from({ length: 8 }, (_, i) => String(year - i)).map((y) => ({ value: y, label: y }))}
          error={errors.admission_year}
          required
        />
        <Select
          id="expected_graduation_year"
          label="Expected graduation"
          value={v.expected_graduation_year}
          onChange={(e) => set({ expected_graduation_year: e.target.value })}
          options={Array.from({ length: 8 }, (_, i) => String(year - 2 + i)).map((y) => ({ value: y, label: y }))}
          error={errors.expected_graduation_year}
          required
        />
      </div>
    </div>
  )
}

const SKILL_SUGGESTIONS = ['Python', 'Java', 'C++', 'SQL', 'React', 'Machine learning', 'Data analysis', 'Public speaking', 'UI design', 'Cloud']
const INTEREST_SUGGESTIONS = ['Hackathons', 'Open source', 'Research', 'Startups', 'Robotics', 'Competitive programming', 'Music', 'Sports']

export function StudentAboutFields({ v, set, errors }: { v: StudentAbout; set: Setter<StudentAbout>; errors: Errors }) {
  return (
    <div className="space-y-5">
      <TagInput id="skills" label="Skills" value={v.skills} onChange={(skills) => set({ skills })} suggestions={SKILL_SUGGESTIONS} hint="Press Enter after each one" error={errors.skills} />
      <TagInput id="interests" label="Interests" value={v.interests} onChange={(interests) => set({ interests })} suggestions={INTEREST_SUGGESTIONS} error={errors.interests} />
      <Textarea id="career_goals" label="Career goals" rows={3} value={v.career_goals} onChange={(e) => set({ career_goals: e.target.value })} error={errors.career_goals} hint="Where do you want to be after graduation?" />
      <Textarea id="achievements" label="Achievements" rows={3} value={v.achievements} onChange={(e) => set({ achievements: e.target.value })} error={errors.achievements} />
      <Textarea id="support_areas" label="Where would you like support?" rows={3} value={v.support_areas} onChange={(e) => set({ support_areas: e.target.value })} error={errors.support_areas} hint="Only your mentor and HOD can see this." />
    </div>
  )
}

export function MentorFields({ v, set, errors, departmentName }: { v: MentorForm; set: Setter<MentorForm>; errors: Errors; departmentName: string | null }) {
  return (
    <div className="space-y-4">
      <Input id="full_name" label="Full name (with title)" placeholder="Dr. Priya Rao" value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} error={errors.full_name} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="official_email" type="email" label="Official email" value={v.official_email} onChange={(e) => set({ official_email: e.target.value })} error={errors.official_email} required />
        <Input id="phone" type="tel" label="Contact number" value={v.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="designation" label="Designation" placeholder="Assistant Professor" value={v.designation} onChange={(e) => set({ designation: e.target.value })} error={errors.designation} required />
        <Input id="faculty_id" label="Faculty ID" value={v.faculty_id} onChange={(e) => set({ faculty_id: e.target.value.toUpperCase() })} error={errors.faculty_id} required />
      </div>
      <Input id="department" label="Department" value={departmentName ?? 'Not set'} readOnly hint="Assigned by your HOD" />
      <TagInput id="expertise" label="Areas of expertise" value={v.expertise} onChange={(expertise) => set({ expertise })} suggestions={['Algorithms', 'Machine learning', 'Databases', 'Networks', 'Career guidance', 'Research']} />
    </div>
  )
}

export function HodFields({ v, set, errors }: { v: HodForm; set: Setter<HodForm>; errors: Errors }) {
  return (
    <div className="space-y-4">
      <Input id="full_name" label="Full name" value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} error={errors.full_name} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="designation" label="Designation" value={v.designation} onChange={(e) => set({ designation: e.target.value })} error={errors.designation} />
        <Input id="phone" type="tel" label="Phone" value={v.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} />
      </div>
    </div>
  )
}

export function toFieldErrors(fe?: Record<string, string[]>): Errors {
  return Object.fromEntries(Object.entries(fe ?? {}).map(([k, v]) => [k, v[0]]))
}

export { FieldGroup }
