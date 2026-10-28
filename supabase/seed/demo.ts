/**
 * Demo data (idempotent-ish: a branch is skipped when its demo mentors already exist, unless --force).
 * Per branch: an HOD, 6 mentors, students with varied trends, records, mentoring, sessions and resources.
 * Usage: pnpm db:seed:demo                          (first branch only — the original demo)
 *        DEMO_BRANCHES=ISE,CSE,ECE pnpm db:seed:demo (several branches for the Principal's college view)
 * The first listed branch keeps the original logins (ramesh.rao@…, ananya.sharma0@…); other branches use
 * branch-coded emails and USNs. When branches already exist (e.g. production), the base seed is NOT re-run,
 * so existing HOD / Principal passwords are never reset.
 */
import { writeFileSync } from 'node:fs'
import { seedBase } from './seed'
import { admin, ensureAuthUser, env, must } from './lib'
import { computeCgpa, computeSgpa, DEFAULT_SCHEME, type SubjectResultInput } from '../../src/lib/grading/index'

const DEMO_DOMAIN = 'demo.mentora.edu'

// Deterministic PRNG so the demo is stable between runs.
let seed = 20261025
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]!
const between = (lo: number, hi: number) => lo + rand() * (hi - lo)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const SUBJECTS: Record<number, [string, string, number][]> = {
  1: [['MAT101', 'Engineering Mathematics I', 4], ['PHY102', 'Engineering Physics', 4], ['ELE103', 'Basic Electrical Engineering', 3], ['CIV104', 'Elements of Civil Engineering', 3], ['PSP105', 'Problem Solving with C', 3], ['ENG106', 'Communicative English', 1]],
  2: [['MAT201', 'Engineering Mathematics II', 4], ['CHE202', 'Engineering Chemistry', 4], ['MEC203', 'Elements of Mechanical Engineering', 3], ['ECE204', 'Basic Electronics', 3], ['PYT205', 'Python Programming', 3], ['CIP206', 'Constitution of India', 1]],
  3: [['MAT301', 'Discrete Mathematics', 4], ['CS302', 'Data Structures and Applications', 4], ['CS303', 'Digital Design & Computer Organization', 4], ['CS304', 'Operating Systems', 3], ['CS305', 'Object Oriented Programming with Java', 3], ['CS306', 'Social Connect & Responsibility', 1]],
  4: [['MAT401', 'Probability & Statistics', 3], ['CS402', 'Design & Analysis of Algorithms', 4], ['CS403', 'Microcontrollers', 4], ['CS404', 'Database Management Systems', 4], ['CS405', 'Software Engineering', 3], ['BIO406', 'Biology for Engineers', 1]],
  5: [['CS501', 'Computer Networks', 4], ['CS502', 'Theory of Computation', 4], ['CS503', 'Artificial Intelligence', 3], ['CS504', 'Web Technologies', 3], ['CS505', 'Research Methodology & IPR', 2], ['ENV506', 'Environmental Studies', 1]],
  6: [['CS601', 'Machine Learning', 4], ['CS602', 'Compiler Design', 4], ['CS603', 'Cloud Computing', 3], ['CS604', 'Cryptography & Network Security', 3], ['CS605', 'Mini Project', 2], ['CS606', 'Indian Knowledge System', 1]],
  7: [['CS701', 'Big Data Analytics', 4], ['CS702', 'Deep Learning', 4], ['CS703', 'Internet of Things', 3], ['CS704', 'Blockchain Technology', 3], ['CS705', 'Project Phase I', 2]],
}

const FIRST = ['Ananya', 'Rahul', 'Priya', 'Arjun', 'Sneha', 'Karthik', 'Divya', 'Rohan', 'Meghana', 'Aditya', 'Pooja', 'Vikram', 'Kavya', 'Siddharth', 'Ishita', 'Nikhil', 'Shreya', 'Varun', 'Aishwarya', 'Harsha', 'Neha', 'Akash', 'Tanvi', 'Pranav', 'Lakshmi', 'Manoj', 'Ritika', 'Gautam', 'Bhavana', 'Suhas']
const LAST = ['Sharma', 'Reddy', 'Iyer', 'Nair', 'Rao', 'Hegde', 'Kulkarni', 'Menon', 'Patil', 'Shetty', 'Gowda', 'Joshi', 'Bhat', 'Pillai', 'Desai', 'Kamath', 'Naidu', 'Verma']
const MENTOR_POOL = [
  { name: 'Dr. Ramesh Rao', designation: 'Associate Professor', expertise: ['Algorithms', 'Competitive programming'] },
  { name: 'Dr. Lakshmi Iyer', designation: 'Professor', expertise: ['Machine learning', 'Data science'] },
  { name: 'Prof. Arvind Kulkarni', designation: 'Assistant Professor', expertise: ['Databases', 'Web development'] },
  { name: 'Dr. Fatima Sheikh', designation: 'Associate Professor', expertise: ['Networks', 'Cyber security'] },
  { name: 'Prof. Naveen Hegde', designation: 'Assistant Professor', expertise: ['Embedded systems', 'IoT'] },
  { name: 'Dr. Sunita Menon', designation: 'Professor', expertise: ['Software engineering', 'Career guidance'] },
  { name: 'Dr. Prakash Shenoy', designation: 'Professor', expertise: ['Signal processing', 'VLSI'] },
  { name: 'Prof. Rekha Bhandary', designation: 'Assistant Professor', expertise: ['Communication systems', 'Antennas'] },
  { name: 'Dr. Mohan Acharya', designation: 'Associate Professor', expertise: ['Control systems', 'Robotics'] },
  { name: 'Prof. Deepa Kini', designation: 'Assistant Professor', expertise: ['Digital electronics', 'Microprocessors'] },
  { name: 'Dr. Suresh Poojary', designation: 'Professor', expertise: ['Power electronics', 'Renewable energy'] },
  { name: 'Prof. Anitha Prabhu', designation: 'Assistant Professor', expertise: ['Data structures', 'Career guidance'] },
  { name: 'Dr. Vinay Pai', designation: 'Associate Professor', expertise: ['Cloud computing', 'DevOps'] },
  { name: 'Prof. Shalini Rai', designation: 'Assistant Professor', expertise: ['Human-computer interaction', 'UI design'] },
  { name: 'Dr. Harish Bangera', designation: 'Professor', expertise: ['Thermodynamics', 'CAD'] },
  { name: 'Prof. Nisha Salian', designation: 'Assistant Professor', expertise: ['Statistics', 'Data analysis'] },
  { name: 'Dr. Ganesh Kamath', designation: 'Associate Professor', expertise: ['Operating systems', 'Linux'] },
  { name: 'Prof. Sowmya Udupa', designation: 'Assistant Professor', expertise: ['Web technologies', 'Open source'] },
]
const HOD_NAMES = ['Dr. Meera Krishnan', 'Dr. Raghavendra Bhat', 'Dr. Shobha Nayak', 'Dr. Ashok Shetty', 'Dr. Vidya Holla', 'Dr. Ravi Kotian']

/** ECE flavour for semesters 3–7; other branches use the computing curriculum with their own code prefix. */
const ECE_SUBJECTS: Record<number, [string, string, number][]> = {
  3: [['MAT301', 'Transform Calculus & Numerical Methods', 4], ['EC302', 'Network Analysis', 4], ['EC303', 'Analog Electronic Circuits', 4], ['EC304', 'Digital System Design', 3], ['EC305', 'Basic Signal Processing', 3], ['EC306', 'Social Connect & Responsibility', 1]],
  4: [['MAT401', 'Probability & Statistics', 3], ['EC402', 'Electromagnetic Waves', 4], ['EC403', 'Microcontrollers', 4], ['EC404', 'Communication Theory', 4], ['EC405', 'Control Systems', 3], ['BIO406', 'Biology for Engineers', 1]],
  5: [['EC501', 'Digital Communication', 4], ['EC502', 'Digital Signal Processing', 4], ['EC503', 'VLSI Design', 3], ['EC504', 'Embedded Systems', 3], ['EC505', 'Research Methodology & IPR', 2], ['ENV506', 'Environmental Studies', 1]],
  6: [['EC601', 'Computer Networks', 4], ['EC602', 'Antennas & Propagation', 4], ['EC603', 'Wireless Communication', 3], ['EC604', 'Image Processing', 3], ['EC605', 'Mini Project', 2], ['EC606', 'Indian Knowledge System', 1]],
  7: [['EC701', 'Optical Communication', 4], ['EC702', 'Machine Learning for Signals', 4], ['EC703', 'Internet of Things', 3], ['EC704', 'Satellite Communication', 3], ['EC705', 'Project Phase I', 2]],
}

/** The subject list for a branch: common first year, then the branch curriculum with its own code prefix. */
function subjectsFor(code: string): Record<number, [string, string, number][]> {
  if (code === 'ECE') return { 1: SUBJECTS[1]!, 2: SUBJECTS[2]!, ...ECE_SUBJECTS }
  const prefix = code === 'CSE' ? 'CS' : code.slice(0, 2).toUpperCase()
  return Object.fromEntries(Object.entries(SUBJECTS).map(([s, list]) => [s, list.map(([c, n, cr]) => [c.startsWith('CS') ? prefix + c.slice(2) : c, n, cr] as [string, string, number])]))
}
const SKILLS = ['Python', 'Java', 'React', 'SQL', 'C++', 'Machine learning', 'Public speaking', 'UI design', 'Git', 'Data analysis', 'Linux', 'Cloud']
const INTERESTS = ['Open source', 'Robotics', 'Hackathons', 'Music', 'Cricket', 'Photography', 'Startups', 'Research', 'Chess', 'Volunteering']

type Archetype = 'strong' | 'improving' | 'declining' | 'average' | 'struggling' | 'missing'
const ARCHETYPES: Archetype[] = ['strong', 'improving', 'declining', 'average', 'average', 'struggling', 'missing', 'strong', 'average', 'improving']

function baseLevel(a: Archetype, semIdx: number, total: number) {
  const t = total > 1 ? semIdx / (total - 1) : 0
  switch (a) {
    case 'strong': return between(82, 92)
    case 'improving': return 56 + t * 26 + between(-3, 3)
    case 'declining': return 84 - t * 26 + between(-3, 3)
    case 'struggling': return between(38, 55)
    case 'missing': return between(60, 75)
    default: return between(62, 76)
  }
}

const yearLabel = (start: number) => `${start}-${String((start + 1) % 100).padStart(2, '0')}`

type DemoBranch = { id: string; code: string; usn_code: string | null }

async function main() {
  const force = process.argv.includes('--force')
  const password = env('DEMO_PASSWORD')
  const db = admin()
  // Existing college (e.g. production): never re-run the base seed — it would reset HOD/Principal passwords.
  const { count: branchCount } = await db.from('departments').select('id', { count: 'exact', head: true })
  if (!branchCount) await seedBase()
  const codes = (process.env.DEMO_BRANCHES || process.env.EXISTING_DATA_BRANCH_CODE || 'CSE').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
  const summary: string[] = []
  for (const [index, code] of codes.entries()) {
    const dept = must(await db.from('departments').select('id, code, usn_code').eq('code', code).single(), `branch ${code}`) as DemoBranch
    summary.push(await seedBranch(db, dept, index, password, force))
  }
  writeFileSync('DEMO.md', `# Mentora demo accounts\n\nAll demo accounts use the password in \`DEMO_PASSWORD\`. Existing HODs keep their own passwords.\n\n${summary.join('\n')}`)
  console.log('✔ Demo data ready for ' + codes.join(', ') + '. Logins written to DEMO.md')
}

/** The branch's head: the existing appointment, or a demo HOD account appointed now. */
async function branchHead(db: ReturnType<typeof admin>, dept: DemoBranch, index: number, password: string) {
  const { data: head } = await db.from('department_heads').select('user_id').eq('department_id', dept.id).is('ended_at', null).maybeSingle()
  if (head) {
    const { data: u } = await db.from('users').select('email').eq('id', head.user_id).single()
    return { id: head.user_id, email: u!.email as string, demo: false }
  }
  const email = `hod.${dept.code.toLowerCase()}@${DEMO_DOMAIN}`
  const id = await ensureAuthUser(db, email, password)
  must(await db.from('users').upsert({ id, email, role: 'HOD', status: 'ACTIVE', department_id: dept.id, onboarding_completed_at: new Date().toISOString() }, { onConflict: 'id' }), 'demo HOD')
  must(await db.from('hod_profiles').upsert({ user_id: id, full_name: HOD_NAMES[index % HOD_NAMES.length]!, designation: 'Professor & Head of Department' }, { onConflict: 'user_id' }), 'demo HOD profile')
  must(await db.from('department_heads').insert({ department_id: dept.id, user_id: id, reason: 'Demo data' }), 'demo HOD appointment')
  return { id, email, demo: true }
}

async function seedBranch(db: ReturnType<typeof admin>, dept: DemoBranch, index: number, password: string, force: boolean): Promise<string> {
  const first = index === 0 // the first branch keeps the original demo logins
  const tag = first ? '' : `.${dept.code.toLowerCase()}`
  const studentCount = first ? 60 : Number(process.env.DEMO_STUDENTS_PER_BRANCH || 30)
  const MENTORS = MENTOR_POOL.slice((index * 6) % MENTOR_POOL.length, ((index * 6) % MENTOR_POOL.length) + 6)
  const SUBJECTS = subjectsFor(dept.code)
  const curriculumCode = (c: string) => SUBJECTS[3]!.find(([code]) => code.endsWith(c.slice(-3)))?.[0] ?? c
  const usnCode = (dept.usn_code ?? dept.code.slice(0, 2)).toUpperCase()
  const hod = await branchHead(db, dept, index, password)
  const hodId = hod.id
  const mentorEmail = (m: { name: string }) => `${m.name.replace(/^(Dr|Prof)\.\s*/, '').split(' ')[0]!.toLowerCase()}.${m.name.split(' ').at(-1)!.toLowerCase()}${tag}@${DEMO_DOMAIN}`

  const { data: existing } = await db.from('users').select('id').eq('role', 'MENTOR').eq('department_id', dept.id).like('email', `%@${DEMO_DOMAIN}`)
  if (existing && existing.length >= 6 && !force) {
    console.log(`ℹ ${dept.code}: demo data already present (use --force to add again).`)
    const { data: students } = await db.from('users').select('email').eq('role', 'MENTEE').eq('department_id', dept.id).like('email', `%@${DEMO_DOMAIN}`).order('created_at').limit(12)
    return branchSummary(dept.code, hod, MENTORS.map(mentorEmail), (students ?? []).map((s) => s.email))
  }

  const sections = must(await db.from('sections').select('id, name').eq('department_id', dept.id).order('name'), 'sections')
  const secA = sections.find((s) => s.name === 'A')!
  const secB = sections.find((s) => s.name === 'B')!

  // Subjects
  const subjectIds = new Map<string, { id: string; credits: number }>()
  for (const [sem, list] of Object.entries(SUBJECTS)) {
    for (const [code, name, credits] of list) {
      const row = must(
        await db
          .from('subjects')
          .upsert(
            { department_id: dept.id, code, name, credits, semester: Number(sem), has_mse: true, has_see: true, mse_max: 50, see_max: 100, is_verified: true, created_by: hodId },
            { onConflict: 'department_id,code' },
          )
          .select('id, credits')
          .single(),
        `subject ${code}`,
      )
      subjectIds.set(code, { id: row.id, credits: Number(row.credits) })
    }
  }

  // Mentors
  const mentorIds: string[] = []
  for (const [i, m] of MENTORS.entries()) {
    const email = mentorEmail(m)
    const id = await ensureAuthUser(db, email, password)
    must(
      await db.from('users').upsert(
        { id, email, role: 'MENTOR', status: 'ACTIVE', department_id: dept.id, onboarding_completed_at: new Date().toISOString(), invited_by: hodId },
        { onConflict: 'id' },
      ),
      'mentor user',
    )
    must(
      await db.from('mentor_profiles').upsert(
        { user_id: id, full_name: m.name, official_email: email, phone: `+91 98450 ${String(10000 + i * 1111).slice(0, 5)}`, designation: m.designation, faculty_id: `FAC-${usnCode}-${String(101 + i)}`, expertise: m.expertise, capacity: 12 },
        { onConflict: 'user_id' },
      ),
      'mentor profile',
    )
    mentorIds.push(id)
  }

  const now = new Date()
  const currentStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  const demoLogins: string[] = []

  for (let i = 0; i < studentCount; i++) {
    const firstName = FIRST[(i + index * 11) % FIRST.length]!
    const last = LAST[(i * 7 + index * 5) % LAST.length]!
    const name = `${firstName} ${last}`
    const email = `${firstName.toLowerCase()}.${last.toLowerCase()}${i}${tag}@${DEMO_DOMAIN}`
    const currentSemester = 3 + (i % 5) // 3..7
    const admission = currentStart - Math.floor((currentSemester - 1) / 2)
    const archetype = ARCHETYPES[i % ARCHETYPES.length]!
    const incomplete = i % 23 === 7
    const id = await ensureAuthUser(db, email, password)
    const createdAt = new Date(now.getTime() - (incomplete ? 30 : 120) * 86400000).toISOString()
    must(
      await db.from('users').upsert(
        { id, email, role: 'MENTEE', status: 'ACTIVE', department_id: dept.id, onboarding_completed_at: incomplete ? null : createdAt, invited_by: hodId, created_at: createdAt },
        { onConflict: 'id' },
      ),
      'mentee user',
    )
    const usn = first && dept.code === 'CSE' ? `1MT${String(admission).slice(2)}CS${String(i + 1).padStart(3, '0')}` : `NNM${String(admission).slice(2)}${usnCode}${String(i + 1).padStart(3, '0')}`
    must(
      await db.from('student_profiles').upsert(
        {
          user_id: id,
          full_name: name,
          phone: `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`,
          usn,
          program: 'B.E. Computer Science & Engineering',
          current_semester: currentSemester,
          section_id: i % 2 === 0 ? secA.id : secB.id,
          admission_year: admission,
          expected_graduation_year: admission + 4,
          skills: incomplete ? [] : [pick(SKILLS), pick(SKILLS), pick(SKILLS)].filter((v, j, a) => a.indexOf(v) === j),
          interests: incomplete ? [] : [pick(INTERESTS), pick(INTERESTS)].filter((v, j, a) => a.indexOf(v) === j),
          career_goals: incomplete ? null : pick(['Software engineer at a product company', 'Higher studies in AI (MS)', 'Start my own company', 'Data scientist', 'Cyber security analyst']),
          achievements: i % 4 === 0 ? 'Finalist, Smart India Hackathon 2025' : null,
          support_areas: archetype === 'struggling' ? 'Time management and mathematics' : null,
          profile_completion: incomplete ? 45 : 90,
        },
        { onConflict: 'user_id' },
      ),
      'student profile',
    )
    if (i < 12) demoLogins.push(`${name.padEnd(22)} ${email}`)

    // Academic history: completed semesters 1..current-1, but only the last 2–6 recorded.
    const completed = currentSemester - 1
    const recordCount = Math.min(completed, 2 + (i % 5))
    const firstRecorded = completed - recordCount + 1
    const semResults: { semesterNo: number; results: SubjectResultInput[] }[] = []
    for (let s = firstRecorded; s <= completed; s++) {
      if (archetype === 'missing' && s === completed) continue // last semester missing → risk flag
      const status = s === completed ? (i % 3 === 0 ? 'SUBMITTED' : i % 3 === 1 ? 'VERIFIED' : 'DRAFT') : s >= completed - 1 ? 'VERIFIED' : 'FINALIZED'
      const sem = must(
        await db
          .from('academic_semesters')
          .upsert(
            { student_id: id, semester_no: s, academic_year: yearLabel(admission + Math.floor((s - 1) / 2)), status, submitted_at: status === 'DRAFT' ? null : createdAt, verified_at: ['VERIFIED', 'FINALIZED'].includes(status) ? createdAt : null, finalized_at: status === 'FINALIZED' ? createdAt : null, finalized_by: status === 'FINALIZED' ? hodId : null },
            { onConflict: 'student_id,semester_no' },
          )
          .select('id')
          .single(),
        'semester',
      )
      const level = baseLevel(archetype, s - firstRecorded, recordCount)
      const engineRows: SubjectResultInput[] = []
      for (const [code] of SUBJECTS[s]!) {
        const subj = subjectIds.get(code)!
        const mseP = clamp(level + between(-9, 9), 18, 99)
        let seeP = clamp(level + between(-10, 8) + (archetype === 'declining' ? -6 : archetype === 'improving' ? 5 : 0), 15, 99)
        const failHere = archetype === 'struggling' && s === completed && code.endsWith('02')
        if (failHere) seeP = between(20, 32)
        const mse = Math.round((mseP / 100) * 50)
        const see = Math.round(seeP / 1) // out of 100
        const pending = status === 'DRAFT' && code.endsWith('05') && i % 2 === 0
        const row = {
          academic_semester_id: sem.id,
          subject_id: subj.id,
          attempt: 1,
          credits: subj.credits,
          mse_marks: mse,
          mse_max: 50,
          see_marks: pending ? null : see,
          see_max: 100,
          ia: [
            { key: 'IA1', label: 'IA 1', marks: Math.round((mseP / 100) * 20), max: 20 },
            { key: 'IA2', label: 'IA 2', marks: Math.round(clamp(mseP + between(-8, 8), 10, 100) / 5), max: 20 },
          ],
          result: (pending ? 'PENDING' : failHere ? 'FAIL' : 'PENDING') as 'PENDING' | 'FAIL',
        }
        must(await db.from('student_subject_results').upsert(row, { onConflict: 'academic_semester_id,subject_id,attempt' }), 'result')
        engineRows.push({ subjectId: subj.id, code, credits: subj.credits, mse_marks: mse, mse_max: 50, see_marks: row.see_marks, see_max: 100, grade: null, grade_points: null, result: row.result })
      }
      semResults.push({ semesterNo: s, results: engineRows })
      const sg = computeSgpa(engineRows, DEFAULT_SCHEME)
      const cg = computeCgpa(semResults, DEFAULT_SCHEME)
      must(
        await db.from('semester_summaries').upsert({
          academic_semester_id: sem.id,
          sgpa: sg.value?.sgpa ?? null,
          cgpa_snapshot: cg.value?.cgpa ?? null,
          credits_registered: sg.value?.creditsRegistered ?? engineRows.reduce((a, r) => a + r.credits, 0),
          credits_earned: sg.value?.creditsEarned ?? 0,
          computed: sg.value != null,
          computation_note: sg.reason,
        }),
        'summary',
      )
    }

    // Assignment (leave 4 unassigned; 3 with history of reassignment)
    if (i < 56) {
      const mentor = mentorIds[i % mentorIds.length]!
      const { data: active } = await db.from('mentor_assignments').select('id').eq('student_id', id).is('ended_at', null).maybeSingle()
      if (!active) {
        if (i % 19 === 3) {
          const prev = mentorIds[(i + 1) % mentorIds.length]!
          must(
            await db.from('mentor_assignments').insert({ mentor_id: prev, student_id: id, assigned_by: hodId, started_at: new Date(now.getTime() - 200 * 86400000).toISOString(), ended_at: new Date(now.getTime() - 60 * 86400000).toISOString(), reason: 'Initial allocation', end_reason: 'Workload balancing', ended_by: hodId }),
            'past assignment',
          )
        }
        must(
          await db.from('mentor_assignments').insert({ mentor_id: mentor, student_id: id, assigned_by: hodId, group_name: `Group ${String.fromCharCode(65 + (i % mentorIds.length))}`, reason: 'Semester allocation', started_at: new Date(now.getTime() - 60 * 86400000).toISOString() }),
          'assignment',
        )
      }

      // Mentoring records
      const day = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10)
      const recs = [
        { kind: 'FEEDBACK', category: 'ACADEMIC_PROGRESS', title: archetype === 'declining' ? 'Your SEE scores dipped this semester' : 'Good momentum this semester', body: archetype === 'declining' ? 'Your MSE scores were strong but SEE dropped in two subjects. Let us plan weekly revision blocks and solve previous-year papers under timed conditions.' : 'Your consistency is showing in the results. Keep the weekly revision routine and start exploring a mini project in your area of interest.', status: 'COMPLETED', include_in_report: true },
        { kind: 'GOAL', category: 'ACADEMIC_PROGRESS', title: 'Reach 70%+ in the next SEE for Data Structures', body: 'Practise two problems a day and review with me fortnightly.', status: 'IN_PROGRESS', due_date: day(40), review_date: day(14), target_metric: 'SEE ≥ 70%', steps: [{ id: 's1', label: 'Finish linked lists & trees revision', done: true }, { id: 's2', label: 'Solve 3 previous-year papers', done: false }, { id: 's3', label: 'Mock test with mentor', done: false }], include_in_report: true },
        { kind: 'ACTION_POINT', category: 'CAREER_GUIDANCE', title: 'Build a portfolio project on GitHub', body: 'Pick one idea, ship a first version, and share the link.', status: 'PENDING', due_date: day(21), include_in_report: false },
        { kind: 'STRENGTH', category: 'PERSONAL_DEVELOPMENT', title: 'Strong analytical thinking', body: 'Consistently clear reasoning in problem-solving discussions.', status: 'COMPLETED', include_in_report: true },
        { kind: 'IMPROVEMENT_AREA', category: 'ACADEMIC_PROGRESS', title: 'Time management during exams', body: 'Plan the paper in the first 5 minutes; attempt known questions first.', status: 'IN_PROGRESS', include_in_report: true },
      ]
      if (i % 5 === 0) recs.push({ kind: 'FEEDBACK', category: 'PERSONAL_DEVELOPMENT', title: 'Private note: check in about stress', body: 'Mentioned stress at home. Follow up gently next session.', status: 'PENDING', include_in_report: false, visibility: 'PRIVATE_MENTOR' } as never)
      const { count } = await db.from('mentor_recommendations').select('id', { count: 'exact', head: true }).eq('student_id', id)
      if (!count) {
        for (const r of recs) {
          must(await db.from('mentor_recommendations').insert({ ...(r as object), student_id: id, mentor_id: mentor, visibility: (r as { visibility?: string }).visibility ?? 'SHARED' } as never), 'recommendation')
        }
        const past = new Date(now.getTime() - (10 + (i % 20)) * 86400000)
        past.setHours(11, 0, 0, 0)
        const next = new Date(now.getTime() + (2 + (i % 9)) * 86400000)
        next.setHours(15, 30, 0, 0)
        must(
          await db.from('mentoring_sessions').insert([
            { mentor_id: mentor, student_id: id, scheduled_at: past.toISOString(), duration_min: 30, mode: 'IN_PERSON', location_or_link: `Cabin 3, ${dept.code} block`, agenda: 'Mid-semester review', summary: 'Reviewed MSE results and set a revision plan for weaker subjects.', action_items: [{ title: 'Share revision timetable', due_date: null }], status: 'COMPLETED', completed_at: past.toISOString(), next_follow_up_date: next.toISOString().slice(0, 10) },
            { mentor_id: mentor, student_id: id, scheduled_at: next.toISOString(), duration_min: 30, mode: i % 2 ? 'ONLINE' : 'IN_PERSON', location_or_link: i % 2 ? 'https://meet.google.com/abc-defg-hij' : `Cabin 3, ${dept.code} block`, agenda: 'Progress check on goals and SEE preparation', action_items: [], status: 'SCHEDULED' },
          ]),
          'sessions',
        )
      }
    }
  }

  // Shared resources per mentor (links — no binary files needed for the demo)
  for (const [i, mentor] of mentorIds.entries()) {
    const { count } = await db.from('learning_resources').select('id', { count: 'exact', head: true }).eq('mentor_id', mentor)
    if (count) continue
    must(
      await db.from('learning_resources').insert([
        { mentor_id: mentor, title: 'Previous-year question papers (Sem 3–5)', instructions: 'Attempt at least two papers under timed conditions before the SEE. Bring doubts to our next session.', external_url: 'https://vtu.ac.in/', subject_id: subjectIds.get(curriculumCode('302'))?.id },
        { mentor_id: mentor, title: 'Algorithm visualizations', instructions: 'Use these visualizations while revising sorting and graph algorithms.', external_url: 'https://visualgo.net/en', subject_id: subjectIds.get(curriculumCode('402'))?.id },
        { mentor_id: mentor, title: i % 2 ? 'Resume & internship checklist' : 'How to read research papers', instructions: 'Read this before our career guidance session.', external_url: 'https://www.ycombinator.com/library' },
      ]),
      'resources',
    )
  }

  console.log(`✔ ${dept.code}: demo data ready (${studentCount} students, 6 mentors).`)
  return branchSummary(dept.code, hod, MENTORS.map(mentorEmail), demoLogins)
}

function branchSummary(code: string, hod: { email: string; demo: boolean }, mentors: string[], students: string[]) {
  return [
    `## ${code}`,
    `- HOD: ${hod.email}${hod.demo ? '' : ' (existing account, own password)'}`,
    `- Mentors: ${mentors.join(', ')}`,
    ...(students.length ? ['- Students (first 12):', '```', ...students, '```'] : []),
    '',
  ].join('\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
