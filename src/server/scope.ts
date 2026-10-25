import 'server-only'
import { cookies } from 'next/headers'

/** Global semester switcher (UX2-01): remembered per user in a cookie; null = all semesters. */
export async function getSemesterScope(): Promise<number | null> {
  const v = Number((await cookies()).get('m_sem')?.value)
  return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null
}
