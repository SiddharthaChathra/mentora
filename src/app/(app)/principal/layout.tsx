import { requireRole } from '@/server/authz'

/** /principal/** is reachable only by an ACTIVE Principal; every other role is sent to its own home. */
export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  await requireRole('PRINCIPAL')
  return children
}
