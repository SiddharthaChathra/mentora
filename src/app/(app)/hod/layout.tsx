import { requireRole } from '@/server/authz'

export default async function HODLayout({ children }: { children: React.ReactNode }) {
  await requireRole('HOD')
  return children
}
