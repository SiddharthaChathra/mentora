import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

const numOrNull = z.preprocess(
  (v) => (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v)) ? null : Number(v)),
  z.number({ error: 'Enter a number' }).nullable(),
)

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number, e.g. +91 98450 12345')

export const nameSchema = z.string().trim().min(2, 'Enter your full name').max(120)

// ───────────────────────────── Auth ─────────────────────────────
export const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
  next: z.string().optional(),
})

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72)
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number')

export const setPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export const signupSchema = z
  .object({ full_name: nameSchema, email: z.email('Enter a valid email address').trim().toLowerCase(), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export const forgotSchema = z.object({ email: z.email('Enter a valid email address').trim().toLowerCase() })

// ───────────────────────────── Profiles ─────────────────────────────
export const studentPersonalSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema,
  dob: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Date.parse(v)) && new Date(v) < new Date()), 'Enter a valid date of birth'),
  gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']).nullable().optional().or(z.literal('').transform(() => null)),
  address: optionalText(400),
})

const year = z.coerce.number({ error: 'Enter a year' }).int().min(1990, 'Enter a valid year').max(2100, 'Enter a valid year')

export const studentAcademicSchema = z
  .object({
    usn: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{4,20}$/, 'USN should be 4–20 letters/numbers, e.g. 1NT21CS045'),
    program: z.string().trim().min(2, 'Enter your program, e.g. B.E. Computer Science').max(80),
    current_semester: z.coerce.number({ error: 'Choose your semester' }).int().min(1).max(12),
    section_id: z.uuid('Choose your section'),
    admission_year: year,
    expected_graduation_year: year,
  })
  .refine((v) => v.expected_graduation_year >= v.admission_year, {
    path: ['expected_graduation_year'],
    message: 'Graduation year must be after admission year',
  })

export const studentAboutSchema = z.object({
  skills: z.array(z.string().trim().min(1).max(40)).max(15),
  interests: z.array(z.string().trim().min(1).max(40)).max(15),
  career_goals: optionalText(2000),
  achievements: optionalText(2000),
  support_areas: optionalText(2000),
})

export const mentorProfileSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema,
  official_email: z.email('Enter your official email').trim().toLowerCase(),
  designation: z.string().trim().min(2, 'Enter your designation').max(80),
  faculty_id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/, 'Faculty ID should be 2–20 letters/numbers'),
  expertise: z.array(z.string().trim().min(1).max(40)).max(15),
})

export const hodProfileSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
  designation: optionalText(80),
})

// ───────────────────────────── Academics ─────────────────────────────
export const academicYearSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Use the format 2024-25')
  .refine((v) => Number(v.slice(5)) === (Number(v.slice(2, 4)) + 1) % 100, 'The second year must follow the first, e.g. 2024-25')

export const semesterSchema = z.object({
  semester_no: z.coerce.number({ error: 'Choose a semester' }).int().min(1).max(12),
  academic_year: academicYearSchema,
})

export const iaItemSchema = z.object({ key: z.string().max(20), label: z.string().max(40), marks: numOrNull, max: numOrNull })

export const resultRowSchema = z
  .object({
    id: z.uuid().optional(),
    subject_id: z.uuid('Pick a subject'),
    attempt: z.coerce.number().int().min(1).max(10).default(1),
    credits: z.coerce.number({ error: 'Enter credits' }).min(0).max(30),
    mse_marks: numOrNull,
    mse_max: numOrNull,
    see_marks: numOrNull,
    see_max: numOrNull,
    ia: z.array(iaItemSchema).max(6).default([]),
    grade: z
      .string()
      .trim()
      .toUpperCase()
      .max(4)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    grade_points: numOrNull,
    result: z.enum(['PASS', 'FAIL', 'PENDING', 'ABSENT']).default('PENDING'),
  })
  .superRefine((v, ctx) => {
    const pairs = [
      ['mse_marks', 'mse_max', 'MSE'],
      ['see_marks', 'see_max', 'SEE'],
    ] as const
    for (const [m, x, label] of pairs) {
      const marks = v[m]
      const max = v[x]
      if (marks != null && marks < 0) ctx.addIssue({ code: 'custom', path: [m], message: `${label} marks cannot be negative` })
      if (max != null && max <= 0) ctx.addIssue({ code: 'custom', path: [x], message: `${label} maximum must be more than 0` })
      if (marks != null && max != null && marks > max) ctx.addIssue({ code: 'custom', path: [m], message: `${label} marks cannot exceed ${max}` })
    }
    if (v.grade_points != null && (v.grade_points < 0 || v.grade_points > 10))
      ctx.addIssue({ code: 'custom', path: ['grade_points'], message: 'Grade points must be between 0 and 10' })
    v.ia.forEach((c, i) => {
      if (c.marks != null && c.max != null && c.marks > c.max) ctx.addIssue({ code: 'custom', path: ['ia', i, 'marks'], message: `Cannot exceed ${c.max}` })
    })
  })

export const subjectSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,16}$/, 'Subject code should be 2–16 letters/numbers'),
  name: z.string().trim().min(2, 'Enter the subject name').max(140),
  credits: z.coerce.number({ error: 'Enter credits' }).min(0).max(30),
  semester: z.coerce.number().int().min(1).max(12).nullable().optional(),
  mse_max: numOrNull,
  see_max: numOrNull,
})

export const changeRequestSchema = z.object({
  academic_semester_id: z.uuid(),
  target_table: z.enum(['student_subject_results', 'academic_semesters']),
  target_id: z.uuid(),
  proposed: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(5, 'Explain what is wrong (at least 5 characters)').max(1000),
})

export const gradeBandSchema = z.object({
  min_pct: z.coerce.number().min(0).max(100),
  grade: z.string().trim().min(1).max(4),
  points: z.coerce.number().min(0).max(10),
})

export const gradingSchemeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  pass_pct: z.coerce.number().min(0).max(100),
  mse_weight: z.coerce.number().min(0).max(1),
  bands: z.array(gradeBandSchema).min(2).max(15),
})

// ───────────────────────────── Mentoring ─────────────────────────────
const dateOrNull = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Enter a valid date')

export const recommendationSchema = z.object({
  student_id: z.uuid(),
  kind: z.enum(['RECOMMENDATION', 'FEEDBACK', 'GOAL', 'ACTION_POINT', 'STRENGTH', 'IMPROVEMENT_AREA']),
  category: z.enum(['ACADEMIC_PROGRESS', 'ATTENDANCE', 'CAREER_GUIDANCE', 'PERSONAL_DEVELOPMENT']),
  title: z.string().trim().min(2, 'Add a short title').max(160),
  body: z.string().trim().max(8000).default(''),
  subject_id: z.uuid().nullable().optional().or(z.literal('').transform(() => null)),
  due_date: dateOrNull,
  review_date: dateOrNull,
  visibility: z.enum(['SHARED', 'PRIVATE_MENTOR']),
  include_in_report: z.boolean().default(false),
  parent_id: z.uuid().nullable().optional(),
  target_metric: optionalText(200),
  steps: z.array(z.object({ id: z.string().max(40), label: z.string().trim().min(1).max(200), done: z.boolean() })).max(12).default([]),
})

export const resourceSchema = z.object({
  title: z.string().trim().min(2, 'Add a title').max(160),
  instructions: z.string().trim().max(4000).default(''),
  student_id: z.uuid().nullable().optional().or(z.literal('').transform(() => null)),
  subject_id: z.uuid().nullable().optional().or(z.literal('').transform(() => null)),
  external_url: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .refine((v) => !v || /^https?:\/\/.{3,}/.test(v), 'Enter a full link starting with https://'),
})

export const sessionSchema = z.object({
  student_id: z.uuid().nullable().optional().or(z.literal('').transform(() => null)),
  group_name: optionalText(60),
  scheduled_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Choose a date and time'),
  duration_min: z.coerce.number().int().min(5).max(480),
  mode: z.enum(['IN_PERSON', 'ONLINE']),
  location_or_link: optionalText(300),
  agenda: z.string().trim().max(4000).default(''),
})

export const sessionCompleteSchema = z.object({
  id: z.uuid(),
  summary: z.string().trim().min(5, 'Add a short summary').max(8000),
  action_items: z.array(z.object({ title: z.string().trim().min(2).max(160), due_date: dateOrNull })).max(10).default([]),
  next_follow_up_date: dateOrNull,
})

// ───────────────────────────── Admin ─────────────────────────────
export const inviteSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase(),
  role: z.enum(['MENTEE', 'MENTOR', 'HOD']),
  full_name: z.string().trim().max(120).optional(),
  /** Principal only: the branch the person joins. An HOD's invite always uses their own branch. */
  department_id: z.uuid('Choose a branch').optional(),
  appoint: z.boolean().optional(),
})

export const thresholdsSchema = z.object({
  STRONG_PCT: z.coerce.number().min(50).max(100),
  DECLINE_PCT_POINTS: z.coerce.number().min(1).max(50),
  SGPA_DROP: z.coerce.number().min(0.1).max(5),
  LOW_PCT: z.coerce.number().min(1).max(70),
  LOW_MIN_COUNT: z.coerce.number().int().min(1).max(10),
  PROFILE_INCOMPLETE_DAYS: z.coerce.number().int().min(1).max(120),
})

export const assignSchema = z.object({
  student_ids: z.array(z.uuid()).min(1, 'Select at least one student').max(500),
  mentor_id: z.uuid().nullable(),
  reason: z.string().trim().max(500).optional(),
  group_name: z.string().trim().max(60).optional(),
})

export type ResultRowInput = z.input<typeof resultRowSchema>
export type RecommendationInput = z.input<typeof recommendationSchema>
