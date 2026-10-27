import { Eye } from 'lucide-react'

/** Shown on every Principal view of branch/student data: the Principal observes, HODs and mentors act. */
export function ReadOnlyBanner({ children }: { children?: React.ReactNode }) {
  return (
    <p role="note" className="mb-5 flex flex-wrap items-center gap-2 rounded-[16px] bg-info-100 px-4 py-2.5 text-sm text-info-700">
      <Eye className="size-4 shrink-0" />
      <span className="font-semibold">Viewing as Principal · read-only.</span>
      <span>{children ?? 'Marks, verifications, mentoring notes and assignments stay with the branch HOD and mentors.'}</span>
    </p>
  )
}
