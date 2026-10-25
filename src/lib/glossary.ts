/** UX2-14 plain-language definitions shown by "?" help buttons. */
export const GLOSSARY = {
  SGPA: 'Semester Grade Point Average: each subject’s grade points × its credits, added up and divided by the semester’s total credits.',
  CGPA: 'Cumulative GPA across all complete semesters, weighted by credits. Semesters with missing grade points are left out until they’re complete.',
  GRADE_POINTS: 'The points a grade is worth on your department’s 10-point scale (e.g. O = 10, A+ = 9). Set by your HOD in the grading scheme.',
  CREDITS: 'How much a subject counts towards your SGPA. Credits are earned only for subjects you pass.',
  MSE: 'Mid-Semester Exam — the internal test held mid-way through the semester.',
  SEE: 'Semester-End Exam — the final exam at the end of the semester.',
  GRADE: 'Leave blank to calculate it from your marks with the department’s grading scheme, or type the grade on your official result.',
} as const

export type GlossaryTerm = keyof typeof GLOSSARY
