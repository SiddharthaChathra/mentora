import { requireRole } from '@/server/authz'

export default async function MENTEELayout({ children }: { children: React.ReactNode }) {
  await requireRole('MENTEE')
  return children
}
