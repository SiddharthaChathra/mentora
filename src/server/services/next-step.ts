import 'server-only'
import type { NextStep } from '@/features/dashboard/next-step-card'
import type { SemesterBundle } from './academics'
import type { Recommendation } from './mentoring'
import type { RosterEntry } from './roster'

/** UX2-03: one personalised, data-driven next action. Highest priority wins; never more than one. */
export function menteeNextStep(input: {
  onboardingComplete: boolean
  currentSemester: number | null
  semesters: SemesterBundle[]
  recs: Recommendation[]
}): NextStep {
  const { semesters, recs } = input
  if (!input.onboardingComplete) return { id: 'profile', title: 'Finish your profile', body: 'A few required details are still missing.', cta: { label: 'Complete profile', href: '/setup' }, icon: 'report' }
  const returned = semesters.find((s) => s.status === 'DRAFT' && s.returnNote)
  if (returned) return { id: `returned-${returned.id}`, title: `Semester ${returned.semesterNo} needs changes`, body: `Your mentor wrote: “${returned.returnNote}”`, cta: { label: 'Fix now', href: `/mentee/academics/${returned.semesterNo}` }, icon: 'attention' }
  const draft = semesters.find((s) => s.status === 'DRAFT')
  if (draft) {
    const missingSee = draft.results.filter((r) => r.see_marks == null).length
    if (missingSee > 0)
      return { id: `see-${draft.id}`, title: `${missingSee} subject${missingSee === 1 ? '' : 's'} in Sem ${draft.semesterNo} ${missingSee === 1 ? 'is' : 'are'} missing SEE marks`, body: 'Add them so your SGPA can be calculated.', cta: { label: 'Add now', href: `/mentee/academics/${draft.semesterNo}` }, icon: 'subjects' }
    if (draft.results.length > 0) return { id: `submit-${draft.id}`, title: `Submit semester ${draft.semesterNo}`, body: 'Your draft is complete. Send it to your mentor for verification.', cta: { label: 'Review & submit', href: `/mentee/academics/${draft.semesterNo}` }, icon: 'credits' }
  }
  const lastDone = (input.currentSemester ?? 1) - 1
  if (lastDone >= 1 && !semesters.some((s) => s.semesterNo === lastDone))
    return { id: `missing-${lastDone}`, title: `Add your semester ${lastDone} results`, body: 'Your mentor can guide you better with up-to-date marks.', cta: { label: 'Add semester', href: '/mentee/academics?new=1' }, icon: 'credits' }
  const all = recs.flatMap((r) => [r, ...r.followUps])
  const unseen = all.filter((r) => !r.seen).length
  if (unseen) return { id: `unseen-${unseen}`, title: `${unseen} new note${unseen === 1 ? '' : 's'} from your mentor`, body: 'Read the latest feedback and recommendations.', cta: { label: 'Open feedback', href: '/mentee/mentoring' }, icon: 'feedback' }
  const today = new Date().toISOString().slice(0, 10)
  const overdue = all.filter((r) => (r.kind === 'GOAL' || r.kind === 'ACTION_POINT') && r.status !== 'COMPLETED' && r.dueDate && r.dueDate < today)
  if (overdue.length) return { id: `overdue-${overdue.length}`, title: `${overdue.length} goal${overdue.length === 1 ? ' is' : 's are'} past due`, body: 'Update their status or tick off finished steps.', cta: { label: 'Update plan', href: '/mentee/mentoring?tab=plan' }, icon: 'goals' }
  return { id: 'caught-up', title: 'You’re all caught up', body: 'Explore your strengths and focus areas.', cta: { label: 'See insights', href: '/mentee/analytics' }, icon: 'goals', calm: true }
}

export function mentorNextStep(input: { toVerify: number; corrections: number; roster: RosterEntry[] }): NextStep {
  if (input.corrections) return { id: `cr-${input.corrections}`, title: `${input.corrections} correction request${input.corrections === 1 ? '' : 's'} waiting`, body: 'Students asked to fix verified records.', cta: { label: 'Review', href: '/mentor/verifications?tab=corrections' }, icon: 'report' }
  if (input.toVerify) return { id: `verify-${input.toVerify}`, title: `${input.toVerify} semester${input.toVerify === 1 ? '' : 's'} to verify`, body: 'Check marks against official results.', cta: { label: 'Verify now', href: '/mentor/verifications' }, icon: 'credits' }
  const follow = input.roster.reduce((n, r) => n + r.openFollowUps, 0)
  if (follow) return { id: `follow-${follow}`, title: `${follow} follow-up${follow === 1 ? ' is' : 's are'} overdue`, body: 'Goals and action points have reached their review date.', cta: { label: 'Review', href: '/mentor/recommendations?status=due' }, icon: 'goals' }
  const month = Date.now() - 30 * 86400000
  const quiet = input.roster.filter((r) => r.risk !== 'none' && (!r.lastSession || new Date(r.lastSession).getTime() < month))
  if (quiet.length) return { id: `quiet-${quiet.length}`, title: `${quiet.length} flagged mentee${quiet.length === 1 ? ' has' : 's have'} no recent session`, body: `Start with ${quiet[0]!.name ?? 'them'}.`, cta: { label: 'Schedule', href: '/mentor/sessions?new=1' }, icon: 'sessions' }
  return { id: 'caught-up', title: 'Everything is on track', body: 'No verifications or overdue follow-ups.', cta: { label: 'Open analytics', href: '/mentor/analytics' }, icon: 'goals', calm: true }
}

export function hodNextStep(input: { roster: RosterEntry[]; invited: number; followupOpen: Set<string> }): NextStep {
  const unassigned = input.roster.filter((r) => !r.mentorId).length
  if (unassigned) return { id: `unassigned-${unassigned}`, title: `${unassigned} student${unassigned === 1 ? ' is' : 's are'} unassigned`, body: 'Give every student a mentor.', cta: { label: 'Assign', href: '/hod/assignments?filter=unassigned' }, icon: 'mentees' }
  const high = input.roster.filter((r) => r.risk === 'high' && !input.followupOpen.has(r.id)).length
  if (high) return { id: `high-${high}`, title: `${high} high-priority student${high === 1 ? '' : 's'} without a follow-up`, body: 'Ask their mentors to check in.', cta: { label: 'Review', href: '/hod/interventions' }, icon: 'attention' }
  const incomplete = input.roster.filter((r) => !r.onboardingCompletedAt).length
  if (incomplete) return { id: `incomplete-${incomplete}`, title: `${incomplete} profile${incomplete === 1 ? ' is' : 's are'} incomplete`, body: 'Remind them or check their records.', cta: { label: 'See list', href: '/hod/students?completion=incomplete' }, icon: 'report' }
  if (input.invited) return { id: `invited-${input.invited}`, title: `${input.invited} invitation${input.invited === 1 ? '' : 's'} not accepted`, body: 'Resend invites from Users & roles.', cta: { label: 'Open users', href: '/hod/users?status=INVITED' }, icon: 'import' }
  return { id: 'caught-up', title: 'Your department is in good shape', body: 'Full coverage and no urgent interventions.', cta: { label: 'Department analytics', href: '/hod/analytics' }, icon: 'coverage', calm: true }
}
