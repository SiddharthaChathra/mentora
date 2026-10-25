'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useUnsavedChangesGuard } from '@/lib/hooks'
import { AvatarUploader } from '@/components/ui/avatar-uploader'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/primitives'
import { saveHodProfile, saveMentorProfile, saveStudentAbout, saveStudentAcademic, saveStudentPersonal } from '@/server/actions/profile'
import { HodFields, MentorFields, StudentAboutFields, StudentAcademicFields, StudentPersonalFields, toFieldErrors, type Errors, type HodForm, type MentorForm, type StudentAbout, type StudentAcademic, type StudentPersonal } from './forms'

function Section<T extends object>({
  title,
  description,
  initial,
  save,
  render,
}: {
  title: string
  description?: string
  initial: T
  save: (v: T) => Promise<{ ok: boolean; error?: { message: string; fieldErrors?: Record<string, string[]> } }>
  render: (v: T, set: (p: Partial<T>) => void, errors: Errors) => React.ReactNode
}) {
  const router = useRouter()
  const [v, setV] = React.useState(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [busy, setBusy] = React.useState(false)
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)
  useUnsavedChangesGuard(dirty)
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody>
        {render(v, (p) => setV((cur) => ({ ...cur, ...p })), errors)}
        <div className="mt-5 flex items-center gap-3">
          <Button
            disabled={!dirty}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              const res = await save(v)
              setBusy(false)
              if (!res.ok) {
                setErrors(toFieldErrors(res.error?.fieldErrors))
                return toast.error(res.error?.message ?? 'Could not save')
              }
              setErrors({})
              toast.success(`${title} saved`)
              router.refresh()
            }}
          >
            <Save /> Save changes
          </Button>
          {dirty && <span className="text-xs text-warning-700">Unsaved changes</span>}
        </div>
      </CardBody>
    </Card>
  )
}

export function StudentProfileEditor({
  userId,
  email,
  avatarPath,
  departmentName,
  sections,
  optional,
  personal,
  academic,
  about,
}: {
  userId: string
  email: string
  avatarPath: string | null
  departmentName: string | null
  sections: { id: string; name: string }[]
  optional: { dob?: boolean; gender?: boolean; address?: boolean }
  personal: StudentPersonal
  academic: StudentAcademic
  about: StudentAbout
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Profile photo" description="Use a clear photo of your face. You can take one with your phone camera." />
        <CardBody>
          <AvatarUploader userId={userId} name={personal.full_name} avatarPath={avatarPath} />
        </CardBody>
      </Card>
      <Section title="Personal details" initial={personal} save={saveStudentPersonal} render={(v, set, e) => <StudentPersonalFields v={v} set={set} errors={e} email={email} optional={optional} />} />
      <Section title="Academic identity" initial={academic} save={saveStudentAcademic} render={(v, set, e) => <StudentAcademicFields v={v} set={set} errors={e} sections={sections} departmentName={departmentName} />} />
      <Section title="About you" description="Helps your mentor guide you." initial={about} save={saveStudentAbout} render={(v, set, e) => <StudentAboutFields v={v} set={set} errors={e} />} />
    </div>
  )
}

export function StaffProfileEditor({ role, userId, avatarPath, departmentName, mentor, hod }: { role: 'MENTOR' | 'HOD'; userId: string; avatarPath: string | null; departmentName: string | null; mentor?: MentorForm; hod?: HodForm }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Profile photo" />
        <CardBody>
          <AvatarUploader userId={userId} name={mentor?.full_name ?? hod?.full_name ?? null} avatarPath={avatarPath} />
        </CardBody>
      </Card>
      {role === 'MENTOR' && mentor && <Section title="Faculty profile" initial={mentor} save={saveMentorProfile} render={(v, set, e) => <MentorFields v={v} set={set} errors={e} departmentName={departmentName} />} />}
      {role === 'HOD' && hod && <Section title="Your profile" initial={hod} save={saveHodProfile} render={(v, set, e) => <HodFields v={v} set={set} errors={e} />} />}
    </div>
  )
}
