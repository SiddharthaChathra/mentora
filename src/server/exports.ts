import 'server-only'
import type { Actor } from './authz'
import type { DB } from './supabase'
import { loadDepartment } from './services/department'
import { loadCollege, type Branch } from './services/branches'
import { loadRoster } from './services/roster'
import { listMentees } from './services/people'
import { RISK_LABELS } from '@/lib/risk'

export type ExportKind = 'department-summary' | 'mentor-workload' | 'assignments' | 'interventions' | 'academic-summary' | 'my-mentees'
export type ExportTable = { title: string; columns: { key: string; header: string; width?: number }[]; rows: Record<string, string | number | null>[] }

export const EXPORTS: Record<Exclude<ExportKind, 'my-mentees'>, { title: string; description: string }> = {
  'department-summary': { title: 'Branch summary', description: 'Headline figures: students, coverage, CGPA, pass rate and flags by section (by branch for college-wide exports).' },
  'mentor-workload': { title: 'Mentor workload', description: 'Mentees, capacity and 30-day mentoring activity per mentor.' },
  assignments: { title: 'Assignment list', description: 'Every student with their current mentor and group.' },
  interventions: { title: 'Students needing intervention', description: 'Flagged students with each indicator and its reason.' },
  'academic-summary': { title: 'Academic summary', description: 'CGPA, latest SGPA, credits and record status per student.' },
}

const f2 = (n: number | null) => (n == null ? null : Number(n.toFixed(2)))

/**
 * HOD: always their own branch. Principal: the branches passed in (one, or the whole college). The caller has
 * already checked the role; RLS still applies to every query.
 */
export async function buildExport(db: DB, actor: Actor, kind: ExportKind, filters: { section?: string; semester?: string; branches?: Branch[] }): Promise<ExportTable> {
  if (kind === 'my-mentees') {
    const mentees = await listMentees(db, actor.id)
    const roster = await loadRoster(db, mentees.map((m) => m.id), actor.departmentId)
    return {
      title: 'My mentees',
      columns: [
        { key: 'name', header: 'Name', width: 26 },
        { key: 'usn', header: 'USN' },
        { key: 'semester', header: 'Semester' },
        { key: 'section', header: 'Section' },
        { key: 'cgpa', header: 'CGPA' },
        { key: 'latest_sgpa', header: 'Latest SGPA' },
        { key: 'flags', header: 'Indicators', width: 50 },
        { key: 'last_session', header: 'Last session' },
      ],
      rows: roster.map((r) => ({ name: r.name, usn: r.usn, semester: r.currentSemester, section: r.sectionName, cgpa: f2(r.cgpa), latest_sgpa: f2(r.latestSgpa), flags: r.flags.map((x) => `${x.label}: ${x.reason}`).join(' | '), last_session: r.lastSession?.slice(0, 10) ?? null })),
    }
  }

  const parts = actor.role === 'PRINCIPAL' ? await loadCollege(db, filters.branches ?? [], null) : [{ branch: null, ...(await loadDepartment(db, actor)) }]
  const all = parts.flatMap((p) => p.roster)
  const mentors = parts.flatMap((p) => p.mentors)
  const branchOf = new Map(parts.flatMap((p) => p.roster.map((r) => [r.id, p.branch?.code ?? null] as const)))
  const college = parts.length > 1
  let roster = all
  if (filters.section) roster = roster.filter((r) => r.sectionName === filters.section)
  if (filters.semester) roster = roster.filter((r) => String(r.currentSemester) === filters.semester)
  const scope = [parts.length === 1 && parts[0]!.branch && parts[0]!.branch.code, filters.section && `Section ${filters.section}`, filters.semester && `Semester ${filters.semester}`]
    .filter(Boolean)
    .join(' · ')
  const suffix = scope ? ` (${scope})` : ''

  switch (kind) {
    case 'department-summary': {
      const groups = new Map<string, typeof roster>()
      const key = (r: (typeof roster)[number]) => (college ? (branchOf.get(r.id) ?? '—') : (r.sectionName ?? '—'))
      for (const r of roster) groups.set(key(r), [...(groups.get(key(r)) ?? []), r])
      const rows = [...groups.entries()]
        .sort()
        .concat([['All', roster]])
        .map(([section, list]) => {
          const cg = list.filter((r) => r.cgpa != null).map((r) => r.cgpa!)
          let pass = 0
          let decided = 0
          for (const r of list) for (const s of r.semesters) for (const x of s.results) if (x.derivedResult !== 'PENDING') { decided++; if (x.derivedResult === 'PASS') pass++ }
          return {
            section,
            students: list.length,
            with_mentor: list.filter((r) => r.mentorId).length,
            coverage_pct: list.length ? Math.round((list.filter((r) => r.mentorId).length / list.length) * 100) : 0,
            avg_cgpa: cg.length ? f2(cg.reduce((a, b) => a + b, 0) / cg.length) : null,
            pass_rate_pct: decided ? Math.round((pass / decided) * 100) : null,
            flagged: list.filter((r) => r.risk !== 'none').length,
            incomplete_profiles: list.filter((r) => !r.onboardingCompletedAt).length,
          }
        })
      return {
        title: `${college ? 'College' : 'Branch'} summary${suffix}`,
        columns: [
          { key: 'section', header: college ? 'Branch' : 'Section' },
          { key: 'students', header: 'Students' },
          { key: 'with_mentor', header: 'With mentor' },
          { key: 'coverage_pct', header: 'Coverage %' },
          { key: 'avg_cgpa', header: 'Average CGPA' },
          { key: 'pass_rate_pct', header: 'Pass rate %' },
          { key: 'flagged', header: 'Flagged' },
          { key: 'incomplete_profiles', header: 'Incomplete profiles' },
        ],
        rows,
      }
    }
    case 'mentor-workload':
      return {
        title: 'Mentor workload',
        columns: [
          { key: 'mentor', header: 'Mentor', width: 26 },
          { key: 'email', header: 'Email', width: 30 },
          { key: 'status', header: 'Status' },
          { key: 'mentees', header: 'Mentees' },
          { key: 'capacity', header: 'Capacity' },
          { key: 'flagged', header: 'Flagged mentees' },
          { key: 'activity_30d', header: 'Actions (30 days)' },
          { key: 'last_activity', header: 'Last activity' },
        ],
        rows: mentors.map((m) => ({
          mentor: m.name,
          email: m.email,
          status: m.status,
          mentees: m.mentees.length,
          capacity: m.capacity,
          flagged: m.mentees.filter((id) => all.find((r) => r.id === id)?.risk !== 'none').length,
          activity_30d: m.activity30,
          last_activity: m.lastActivity?.slice(0, 10) ?? null,
        })),
      }
    case 'assignments':
      return {
        title: `Assignment list${suffix}`,
        columns: [
          { key: 'name', header: 'Student', width: 26 },
          { key: 'usn', header: 'USN' },
          { key: 'semester', header: 'Semester' },
          { key: 'section', header: 'Section' },
          { key: 'mentor', header: 'Mentor', width: 26 },
        ],
        rows: roster.map((r) => ({ name: r.name, usn: r.usn, semester: r.currentSemester, section: r.sectionName, mentor: r.mentorName ?? 'Unassigned' })),
      }
    case 'interventions':
      return {
        title: `Students needing intervention${suffix}`,
        columns: [
          { key: 'name', header: 'Student', width: 26 },
          { key: 'usn', header: 'USN' },
          { key: 'mentor', header: 'Mentor', width: 24 },
          { key: 'priority', header: 'Priority' },
          { key: 'indicator', header: 'Indicator', width: 24 },
          { key: 'reason', header: 'Reason', width: 60 },
        ],
        rows: roster
          .filter((r) => r.risk !== 'none')
          .flatMap((r) => r.flags.map((f) => ({ name: r.name, usn: r.usn, mentor: r.mentorName ?? 'Unassigned', priority: f.severity, indicator: RISK_LABELS[f.key], reason: f.reason }))),
      }
    case 'academic-summary':
      return {
        title: `Academic summary${suffix}`,
        columns: [
          { key: 'name', header: 'Student', width: 26 },
          { key: 'usn', header: 'USN' },
          { key: 'semester', header: 'Current sem' },
          { key: 'section', header: 'Section' },
          { key: 'cgpa', header: 'CGPA' },
          { key: 'latest_sgpa', header: 'Latest SGPA' },
          { key: 'semesters_recorded', header: 'Semesters recorded' },
          { key: 'verified', header: 'Verified/finalized' },
          { key: 'pending_verification', header: 'Awaiting verification' },
        ],
        rows: roster.map((r) => ({
          name: r.name,
          usn: r.usn,
          semester: r.currentSemester,
          section: r.sectionName,
          cgpa: f2(r.cgpa),
          latest_sgpa: f2(r.latestSgpa),
          semesters_recorded: r.semesters.length,
          verified: r.semesters.filter((s) => s.status === 'VERIFIED' || s.status === 'FINALIZED').length,
          pending_verification: r.submittedCount,
        })),
      }
  }
}
