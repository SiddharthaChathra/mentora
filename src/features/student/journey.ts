import type { JourneyEvent } from '@/components/charts/journey-timeline'
import type { SemesterBundle } from '@/server/services/academics'
import type { Recommendation, Session } from '@/server/services/mentoring'
import { KIND_LABEL } from '@/lib/labels'

/** Merge semesters, feedback, goals, completed actions and sessions into one chronological journey. */
export function buildJourney(
  semesters: SemesterBundle[],
  recs: Recommendation[],
  sessions: Session[],
  links: { semester: (no: number) => string; rec: (id: string) => string; session: (id: string) => string },
): JourneyEvent[] {
  const events: JourneyEvent[] = []
  for (const s of semesters) {
    events.push({
      id: s.id,
      type: 'semester',
      date: s.verifiedAt ?? s.submittedAt ?? s.updatedAt,
      title: `Semester ${s.semesterNo} ${s.status === 'DRAFT' ? 'started' : s.status === 'SUBMITTED' ? 'submitted' : s.status.toLowerCase()}`,
      subtitle: s.displaySgpa != null ? `SGPA ${s.displaySgpa.toFixed(2)} · ${s.results.length} subjects` : `${s.results.length} subjects`,
      meta: s.academicYear,
      href: links.semester(s.semesterNo),
    })
  }
  for (const r of recs.flatMap((x) => [x, ...x.followUps])) {
    const isPlan = r.kind === 'GOAL' || r.kind === 'ACTION_POINT'
    events.push({
      id: r.id,
      type: isPlan ? 'goal' : 'feedback',
      date: r.createdAt,
      title: r.title,
      subtitle: `${KIND_LABEL[r.kind]}${r.mentorName ? ` · ${r.mentorName}` : ''}`,
      href: links.rec(r.id),
    })
    if (isPlan && r.status === 'COMPLETED') {
      events.push({
        id: `${r.id}-done`,
        type: 'action',
        date: r.completionConfirmedAt ?? r.updatedAt,
        title: `Completed: ${r.title}`,
        subtitle: r.completionConfirmedAt ? 'Confirmed by mentor' : 'Marked complete',
        href: links.rec(r.id),
      })
    }
  }
  for (const s of sessions) {
    if (s.status === 'CANCELLED') continue
    events.push({
      id: s.id,
      type: 'session',
      date: s.scheduledAt,
      title: s.status === 'COMPLETED' ? `Session: ${s.agenda || 'mentoring'}` : `Upcoming: ${s.agenda || 'mentoring session'}`,
      subtitle: s.summary ?? `${s.durationMin} min · ${s.mode === 'ONLINE' ? 'Online' : 'In person'}`,
      href: links.session(s.id),
    })
  }
  return events
}
