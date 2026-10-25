import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getActor } from '@/server/authz'
import { AuthShell } from '../auth-shell'
import { SetPasswordForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Accept your invitation' }

export default async function AcceptInvitePage() {
  const actor = await getActor()
  if (!actor) redirect('/login?error=link')
  if (actor.status === 'SUSPENDED') redirect('/suspended')
  if (actor.status === 'ACTIVE') redirect('/dashboard')
  const role = actor.role === 'MENTEE' ? 'student' : actor.role === 'MENTOR' ? 'mentor' : 'head of department'
  return (
    <AuthShell title="You're" accent="invited" subtitle={`Create a password to join Mentora as a ${role}. Your email: ${actor.email}`}>
      <SetPasswordForm mode="invite" />
    </AuthShell>
  )
}
