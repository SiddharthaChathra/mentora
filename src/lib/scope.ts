/** Routes that honour the global semester switcher (UX2-01). The switcher is hidden everywhere else. */
const SCOPED = [
  '/mentee',
  '/mentee/academics',
  '/mentee/analytics',
  '/mentor',
  '/mentor/mentees',
  '/mentor/analytics',
  '/mentor/verifications',
  '/mentor/recommendations',
  '/mentor/reports',
  '/hod',
  '/hod/students',
  '/hod/mentors',
  '/hod/analytics',
  '/hod/interventions',
  '/hod/assignments',
]

export const isScopedRoute = (path: string) => SCOPED.includes(path) || /^\/hod\/mentors\/[^/]+$/.test(path)

/** Mentor/HOD scope: students currently in the chosen semester. */
export const inScope = <T extends { currentSemester: number | null }>(rows: T[], scope: number | null) => (scope ? rows.filter((r) => r.currentSemester === scope) : rows)
