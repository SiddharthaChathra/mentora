import { requireRole } from '@/server/authz'

export default async function MENTORLayout({ children }: { children: React.ReactNode }) {
  await requireRole('MENTOR')
  return children
}
