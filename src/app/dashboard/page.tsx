import { redirect } from 'next/navigation'
import { ROLE_HOME, requireUser } from '@/server/authz'

/** Server-side role recognition: lands every user on the dashboard for their role. */
export default async function DashboardRedirect() {
  const actor = await requireUser()
  redirect(ROLE_HOME[actor.role])
}
