'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, CircleAlert, CloudCheck, Loader2, LogOut, PartyPopper } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useDebouncedCallback } from '@/lib/hooks'
import { mentorProfileSchema, hodProfileSchema, studentAboutSchema, studentAcademicSchema, studentPersonalSchema } from '@/lib/validators'
import { studentMissing, mentorMissing } from '@/lib/profile-completion'
import type { GradingScheme } from '@/lib/grading'
import { Avatar } from '@/components/ui/avatar'
import { AvatarUploader } from '@/components/ui/avatar-uploader'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
import { Pill, ProgressRing, StatusPill } from '@/components/ui/primitives'
import { Illustration, type IllustrationName } from '@/components/illustrations'
import { Logo } from '@/components/shell/logo'
import { finishOnboarding, saveDraft, saveHodProfile, saveMentorProfile, saveStudentAbout, saveStudentAcademic, saveStudentPersonal } from '@/server/actions/profile'
import { signOut } from '@/server/actions/shell'
import { AddSemesterButton } from '@/features/academics/add-semester'
import { SemesterView } from '@/features/academics/semester-view'
import type { SubjectOption } from '@/features/academics/subject-entry'
import type { SemesterBundle } from '@/server/services/academics'
import type { MentorSummary } from '@/server/services/people'
import {
  HodFields,
  MentorFields,
  StudentAboutFields,
  StudentAcademicFields,
  StudentPersonalFields,
  toFieldErrors,
  type Errors,
  type HodForm,
  type MentorForm,
  type StudentAbout,
  type StudentAcademic,
  type StudentPersonal,
} from './forms'

type Role = 'MENTEE' | 'MENTOR' | 'HOD'
type Step = { key: string; title: string; description: string; illustration: IllustrationName; optional?: boolean }

/** Wall-clock helper kept outside components (React Compiler purity rule). */
const nowMs = () => Date.now()

const STEPS: Record<Role, Step[]> = {
  MENTEE: [
    { key: 'personal', title: 'Personal details', description: 'Your name, photo and how to reach you.', illustration: 'step-profile' },
    { key: 'academic', title: 'Academic identity', description: 'USN, program, semester and section.', illustration: 'login' },
    { key: 'history', title: 'Academic history', description: 'Past semesters with subjects and marks. You can add more later.', illustration: 'step-history', optional: true },
    { key: 'about', title: 'About you', description: 'Skills, interests and goals help your mentor guide you.', illustration: 'step-about', optional: true },
    { key: 'review', title: 'Review & finish', description: 'Check everything, then start using Mentora.', illustration: 'success' },
  ],
  MENTOR: [
    { key: 'profile', title: 'Your faculty profile', description: 'How students and your HOD will see you.', illustration: 'step-profile' },
    { key: 'review', title: 'Mentees & finish', description: 'See who is assigned to you, then get started.', illustration: 'no-mentees' },
  ],
  HOD: [
    { key: 'profile', title: 'Your profile', description: 'A short profile for your branch.', illustration: 'step-profile' },
    { key: 'review', title: 'Finish', description: 'Head to your overview.', illustration: 'success' },
  ],
}

export type WizardProps = {
  role: Role
  userId: string
  email: string
  departmentName: string | null
  sections: { id: string; name: string }[]
  optionalFields: { dob?: boolean; gender?: boolean; address?: boolean }
  avatarPath: string | null
  initialStep: number
  student?: { personal: StudentPersonal; academic: StudentAcademic; about: StudentAbout }
  mentor?: MentorForm
  hod?: HodForm
  assignedMentor?: MentorSummary | null
  mentees?: { id: string; name: string | null; usn: string | null }[]
  semesters?: SemesterBundle[]
  subjects?: SubjectOption[]
  scheme?: GradingScheme | null
  admissionYear?: number | null
}

export function SetupWizard(props: WizardProps) {
  const router = useRouter()
  const steps = STEPS[props.role]
  const [step, setStep] = React.useState(Math.min(props.initialStep, steps.length - 1))
  const [personal, setPersonal] = React.useState(props.student?.personal ?? { full_name: '', phone: '', dob: '', gender: '', address: '' })
  const [academic, setAcademic] = React.useState(props.student?.academic ?? { usn: '', program: '', current_semester: '', section_id: '', admission_year: '', expected_graduation_year: '' })
  const [about, setAbout] = React.useState(props.student?.about ?? { skills: [], interests: [], career_goals: '', achievements: '', support_areas: '' })
  const [mentor, setMentor] = React.useState(props.mentor ?? { full_name: '', phone: '', official_email: props.email, designation: '', faculty_id: '', expertise: [] })
  const [hod, setHod] = React.useState(props.hod ?? { full_name: '', phone: '', designation: '' })
  const [errors, setErrors] = React.useState<Errors>({})
  const [saveState, setSaveState] = React.useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; at?: number }>({ state: 'idle' })
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState<string | null>(null)
  const [, tick] = React.useState(0)
  const panel = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 15_000)
    return () => clearInterval(t)
  }, [])

  const draftValues = () => (props.role === 'MENTEE' ? { personal, academic, about } : props.role === 'MENTOR' ? { mentor } : { hod })
  const autosave = useDebouncedCallback(async (s: number) => {
    setSaveState({ state: 'saving' })
    const res = await saveDraft(s, draftValues())
    setSaveState(res.ok ? { state: 'saved', at: nowMs() } : { state: 'error' })
  }, 800)

  const change = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (patch: Partial<T>) => {
    setter((cur) => ({ ...cur, ...patch }))
    for (const k of Object.keys(patch)) setErrors((e) => ({ ...e, [k]: undefined }))
    autosave(step)
  }

  const missing =
    props.role === 'MENTEE'
      ? studentMissing({ ...personal, ...academic, current_semester: academic.current_semester ? Number(academic.current_semester) : null, admission_year: academic.admission_year ? Number(academic.admission_year) : null, expected_graduation_year: academic.expected_graduation_year ? Number(academic.expected_graduation_year) : null })
      : props.role === 'MENTOR'
        ? mentorMissing(mentor)
        : hod.full_name
          ? []
          : [{ step: 0, field: 'full_name', label: 'Full name' }]

  const stepComplete = (i: number) => {
    const key = steps[i]!.key
    if (key === 'review') return false
    if (steps[i]!.optional) return key === 'history' ? (props.semesters?.length ?? 0) > 0 : about.skills.length > 0 || !!about.career_goals
    return !missing.some((m) => m.step === i)
  }
  const completedCount = steps.filter((_, i) => stepComplete(i)).length
  const progress = Math.round((completedCount / (steps.length - 1)) * 100)

  const jumpTo = (s: number, field?: string) => {
    setStep(s)
    void saveDraft(s, draftValues())
    if (field) setTimeout(() => document.getElementById(field)?.focus(), 350)
    else setTimeout(() => panel.current?.focus(), 50)
  }

  /** Validate + persist the current step. Returns false when blocked. */
  const commit = async (): Promise<boolean> => {
    const key = steps[step]!.key
    let parsed: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } = { success: true }
    let save: (() => Promise<{ ok: boolean; error?: { message: string; fieldErrors?: Record<string, string[]> } }>) | null = null
    if (props.role === 'MENTEE' && key === 'personal') {
      parsed = studentPersonalSchema.safeParse(personal)
      save = () => saveStudentPersonal(personal)
    } else if (props.role === 'MENTEE' && key === 'academic') {
      parsed = studentAcademicSchema.safeParse(academic)
      save = () => saveStudentAcademic(academic)
    } else if (props.role === 'MENTEE' && key === 'about') {
      parsed = studentAboutSchema.safeParse(about)
      save = () => saveStudentAbout(about)
    } else if (props.role === 'MENTOR' && key === 'profile') {
      parsed = mentorProfileSchema.safeParse(mentor)
      save = () => saveMentorProfile(mentor)
    } else if (props.role === 'HOD' && key === 'profile') {
      parsed = hodProfileSchema.safeParse(hod)
      save = () => saveHodProfile(hod)
    }
    if (!parsed.success) {
      const fe: Errors = {}
      for (const i of parsed.error!.issues) fe[String(i.path[0])] ??= i.message
      setErrors(fe)
      const first = Object.keys(fe)[0]
      if (first) document.getElementById(first)?.focus()
      toast.error('A few fields need attention.')
      return false
    }
    if (!save) return true
    setBusy(true)
    const res = await save()
    setBusy(false)
    if (!res.ok) {
      setErrors(toFieldErrors(res.error?.fieldErrors))
      toast.error(res.error?.message ?? 'Could not save')
      return false
    }
    setSaveState({ state: 'saved', at: nowMs() })
    return true
  }

  const next = async () => {
    if (!(await commit())) return
    router.refresh()
    jumpTo(Math.min(step + 1, steps.length - 1))
  }

  const finish = async () => {
    if (missing.length) {
      toast.error(`Complete ${missing.length} required field${missing.length === 1 ? '' : 's'} first.`)
      jumpTo(missing[0]!.step, missing[0]!.field)
      return
    }
    setBusy(true)
    const res = await finishOnboarding()
    setBusy(false)
    if (!res.ok) return toast.error(res.error.message)
    setDone(res.data)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.lowBandwidth !== 'true') {
      const confetti = (await import('canvas-confetti')).default
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#2563EB', '#3B82F6', '#60A5FA', '#F5B300', '#22C55E'] })
    }
  }

  const name = props.role === 'MENTEE' ? personal.full_name : props.role === 'MENTOR' ? mentor.full_name : hod.full_name
  const savedLabel =
    saveState.state === 'saving' ? 'Saving…' : saveState.state === 'error' ? 'Couldn’t save — retrying on next change' : saveState.at ? `Saved at ${format(saveState.at, 'h:mm a')}` : 'Changes save automatically'

  if (done)
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-muted px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-lg rounded-[32px] bg-surface p-8 text-center shadow-3 sm:p-12">
          <Illustration name="success" className="mx-auto max-w-[240px]" />
          <h1 className="mt-6 text-[2rem] leading-tight font-bold tracking-tight text-ink-900">
            You’re all <span className="text-primary-600 pr-1">set</span>
          </h1>
          <p className="mt-3 text-ink-500">
            {props.role === 'MENTEE' ? 'Your profile is ready. Your mentor can now see your progress and guide you.' : props.role === 'MENTOR' ? 'Your mentee dashboard is ready.' : 'Your department overview is ready.'}
          </p>
          <Button size="lg" className="mt-8" onClick={() => router.replace(done)}>
            <PartyPopper /> Go to my dashboard
          </Button>
        </motion.div>
      </div>
    )

  const current = steps[step]!

  return (
    <div className="min-h-dvh bg-surface-muted lg:grid lg:grid-cols-[360px_1fr] lg:gap-4 lg:p-4">
      {/* Stepper */}
      <aside className="relative bg-surface shadow-2 lg:sticky lg:top-4 lg:h-[calc(100dvh-32px)] lg:rounded-[32px]">
        <div className="relative flex h-full flex-col p-5 lg:p-8">
          <div className="flex items-center justify-between">
            <Logo />
            <form action={async () => void (await signOut())}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
          <div className="mt-6 flex items-center gap-4 lg:mt-12">
            <ProgressRing value={progress} size={64} stroke={6} label="Setup progress" />
            <div>
              <p className="text-xl leading-tight font-bold text-ink-900">Set up your profile</p>
              <p className="text-sm text-ink-500">
                Step {step + 1} of {steps.length}
              </p>
            </div>
          </div>
          <ol className="mt-6 hidden space-y-1 lg:block">
            {steps.map((s, i) => {
              const complete = stepComplete(i)
              const active = i === step
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    aria-current={active ? 'step' : undefined}
                    className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors', active ? 'bg-primary-50' : 'hover:bg-surface-muted')}
                  >
                    <span
                      className={cn(
                        'num mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                        complete ? 'bg-success-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-surface text-ink-500 ring-1 ring-line-strong',
                      )}
                    >
                      {complete ? <Check className="size-4" /> : i + 1}
                    </span>
                    <span>
                      <span className={cn('block text-sm font-medium', active ? 'text-ink-900' : 'text-ink-700')}>
                        {s.title} {s.optional && <span className="font-normal text-ink-500">· optional</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">{s.description}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          {/* Mobile: compact step dots */}
          <div className="mt-4 flex gap-1.5 lg:hidden" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.key} className={cn('h-1.5 flex-1 rounded-full', i === step ? 'bg-primary-600' : stepComplete(i) ? 'bg-success-500' : 'bg-line-strong')} />
            ))}
          </div>
          <div className="mt-auto hidden pt-6 lg:block">
            <Illustration name={current.illustration} className="max-w-[220px] opacity-90" />
          </div>
        </div>
      </aside>

      {/* Panel */}
      <main id="main" className="flex min-h-dvh flex-col lg:min-h-0">
        <div className="sticky top-0 z-10 mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-full bg-surface/95 px-5 py-3 shadow-2 backdrop-blur-xl sm:px-6 lg:mx-0 lg:mt-0">
          <p aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            {saveState.state === 'saving' ? <Loader2 className="size-3.5 animate-spin" /> : <CloudCheck className="size-3.5" />} {savedLabel}
          </p>
          {missing.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-tile-peach px-4 text-xs font-semibold text-accent-700">
                  <CircleAlert className="size-3.5" /> Missing: {missing.length} required field{missing.length === 1 ? '' : 's'}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <ul>
                  {missing.map((m) => (
                    <li key={m.field}>
                      <button type="button" onClick={() => jumpTo(m.step, m.field)} className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-ink-700 hover:bg-surface-muted">
                        {m.label}
                        <span className="text-xs text-ink-500">{steps[m.step]?.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          ) : (
            <Pill tone="success" dot>
              All required fields done
            </Pill>
          )}
        </div>

        <div ref={panel} tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 outline-none sm:px-8 lg:py-12">
          <AnimatePresence mode="wait">
            <motion.div key={current.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              <p className="eyebrow">
                Step {step + 1} · {current.optional ? 'Optional' : 'Required'}
              </p>
              <h1 className="mt-2 text-[1.75rem] leading-tight font-bold tracking-tight text-ink-900">{current.title}</h1>
              <p className="mt-1.5 text-ink-500">{current.description}</p>

              <div className="mt-8">
                {props.role === 'MENTEE' && current.key === 'personal' && (
                  <div className="space-y-8">
                    <AvatarUploader userId={props.userId} name={personal.full_name} avatarPath={props.avatarPath} />
                    <StudentPersonalFields v={personal} set={change(setPersonal)} errors={errors} email={props.email} optional={props.optionalFields} />
                  </div>
                )}
                {props.role === 'MENTEE' && current.key === 'academic' && (
                  <div className="space-y-6">
                    <StudentAcademicFields v={academic} set={change(setAcademic)} errors={errors} sections={props.sections} departmentName={props.departmentName} />
                    <div className="rounded-xl border border-line bg-surface p-4">
                      <p className="eyebrow">Mentor & mentoring group</p>
                      {props.assignedMentor ? (
                        <div className="mt-3 flex items-center gap-3">
                          <Avatar userId={props.assignedMentor.id} name={props.assignedMentor.fullName} hasImage={!!props.assignedMentor.avatarPath} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-ink-900">{props.assignedMentor.fullName}</p>
                            <p className="text-xs text-ink-500">
                              {props.assignedMentor.groupName ?? 'Mentoring group'} · Assigned by your HOD
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-ink-500">Not assigned yet. Your HOD assigns mentors — you can’t choose one here.</p>
                      )}
                    </div>
                  </div>
                )}
                {props.role === 'MENTEE' && current.key === 'history' && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-50 p-4">
                      <p className="text-sm text-ink-700">Add each completed semester. Subjects and marks autosave; submit them for verification when ready.</p>
                      <AddSemesterButton existing={(props.semesters ?? []).map((s) => s.semesterNo)} maxSemester={Math.max(1, Number(academic.current_semester || 8))} admissionYear={academic.admission_year ? Number(academic.admission_year) : (props.admissionYear ?? null)} variant="secondary" />
                    </div>
                    {(props.semesters ?? []).length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-500">No semesters yet. In your first semester? Skip this step.</p>
                    ) : (
                      [...props.semesters!].reverse().map((s) => <SemesterView key={s.id} semester={s} subjects={props.subjects ?? []} scheme={props.scheme ?? null} mode="student" compact />)
                    )}
                  </div>
                )}
                {props.role === 'MENTEE' && current.key === 'about' && <StudentAboutFields v={about} set={change(setAbout)} errors={errors} />}
                {props.role === 'MENTOR' && current.key === 'profile' && (
                  <div className="space-y-8">
                    <AvatarUploader userId={props.userId} name={mentor.full_name} avatarPath={props.avatarPath} />
                    <MentorFields v={mentor} set={change(setMentor)} errors={errors} departmentName={props.departmentName} />
                  </div>
                )}
                {props.role === 'HOD' && current.key === 'profile' && (
                  <div className="space-y-8">
                    <AvatarUploader userId={props.userId} name={hod.full_name} avatarPath={props.avatarPath} />
                    <HodFields v={hod} set={change(setHod)} errors={errors} />
                  </div>
                )}
                {current.key === 'review' && (
                  <Review
                    role={props.role}
                    name={name}
                    email={props.email}
                    missing={missing}
                    jumpTo={jumpTo}
                    steps={steps}
                    sections={props.sections}
                    personal={personal}
                    academic={academic}
                    about={about}
                    mentor={mentor}
                    semesters={props.semesters ?? []}
                    mentees={props.mentees ?? []}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 mx-3 mb-3 rounded-[24px] bg-surface/95 px-5 py-4 pb-safe shadow-3 backdrop-blur-xl sm:px-6 lg:mx-0 lg:mb-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => jumpTo(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            {current.key === 'review' ? (
              <Button size="lg" onClick={finish} loading={busy}>
                Finish setup <Check />
              </Button>
            ) : (
              <div className="flex gap-2">
                {current.optional && (
                  <Button variant="ghost" onClick={() => jumpTo(step + 1)}>
                    Skip for now
                  </Button>
                )}
                <Button size="lg" onClick={next} loading={busy}>
                  Save & continue <ArrowRight />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ReviewRow({ label, value, s, f, onEdit }: { label: string; value: React.ReactNode; s: number; f: string; onEdit: (step: number, field?: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className={cn('mt-0.5 text-sm break-words', value ? 'text-ink-900' : 'text-danger-700')}>{value || 'Missing'}</p>
      </div>
      <button type="button" onClick={() => onEdit(s, f)} className="shrink-0 text-sm font-medium text-primary-600 hover:underline">
        Edit
      </button>
    </div>
  )
}

function Review({
  role,
  name,
  email,
  missing,
  jumpTo,
  steps,
  sections,
  personal,
  academic,
  about,
  mentor,
  semesters,
  mentees,
}: {
  role: Role
  name: string
  email: string
  missing: { step: number; field: string; label: string }[]
  jumpTo: (s: number, f?: string) => void
  steps: Step[]
  sections: { id: string; name: string }[]
  personal: StudentPersonal
  academic: StudentAcademic
  about: StudentAbout
  mentor: MentorForm
  semesters: SemesterBundle[]
  mentees: { id: string; name: string | null; usn: string | null }[]
}) {
  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div role="alert" className="rounded-xl bg-warning-100 p-4 text-sm text-warning-700">
          Complete {missing.map((m) => m.label).join(', ')} to finish.
        </div>
      )}
      <div className="rounded-[20px] bg-surface px-5 py-2 shadow-2">
        <ReviewRow onEdit={jumpTo} label="Name" value={name} s={0} f="full_name" />
        <ReviewRow onEdit={jumpTo} label="Email" value={email} s={0} f="email" />
        {role === 'MENTEE' && (
          <>
            <ReviewRow onEdit={jumpTo} label="Phone" value={personal.phone} s={0} f="phone" />
            <ReviewRow onEdit={jumpTo} label="USN" value={academic.usn} s={1} f="usn" />
            <ReviewRow onEdit={jumpTo} label="Program" value={academic.program} s={1} f="program" />
            <ReviewRow onEdit={jumpTo}
              label="Semester & section"
              value={academic.current_semester && academic.section_id ? `Semester ${academic.current_semester} · Section ${sections.find((x) => x.id === academic.section_id)?.name ?? ''}` : ''}
              s={1}
              f="current_semester"
            />
            <ReviewRow onEdit={jumpTo} label="Academic history" value={semesters.length ? `${semesters.length} semester${semesters.length === 1 ? '' : 's'} added` : 'None yet (optional)'} s={2} f="history" />
            <ReviewRow onEdit={jumpTo} label="Skills" value={about.skills.join(', ') || 'None yet (optional)'} s={3} f="skills" />
          </>
        )}
        {role === 'MENTOR' && (
          <>
            <ReviewRow onEdit={jumpTo} label="Designation" value={mentor.designation} s={0} f="designation" />
            <ReviewRow onEdit={jumpTo} label="Faculty ID" value={mentor.faculty_id} s={0} f="faculty_id" />
            <ReviewRow onEdit={jumpTo} label="Official email" value={mentor.official_email} s={0} f="official_email" />
          </>
        )}
      </div>
      {role === 'MENTOR' && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-ink-900">Assigned mentees ({mentees.length})</p>
          <p className="mt-0.5 text-xs text-ink-500">Assigned by your HOD. Read-only.</p>
          {mentees.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {mentees.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 rounded-lg bg-surface-muted px-3 py-2">
                  <Avatar userId={m.id} name={m.name} size="xs" />
                  <span className="truncate text-sm text-ink-900">{m.name ?? 'New student'}</span>
                  <span className="num ml-auto text-xs text-ink-500">{m.usn}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-500">No mentees yet — your HOD will assign them.</p>
          )}
        </div>
      )}
      {role === 'MENTEE' && semesters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {semesters.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs">
              Semester {s.semesterNo} <StatusPill status={s.status} />
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-500">Last step of {steps.length}. You can change everything later from your profile.</p>
    </div>
  )
}
