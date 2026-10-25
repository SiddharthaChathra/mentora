import type { Metadata } from 'next'
import { AuthShell } from '../auth-shell'
import { SignupForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Create your account' }

export default function SignupPage() {
  return (
    <AuthShell title="Join" accent="Mentora" subtitle="Create your student account. Your HOD will connect you with a mentor.">
      <SignupForm />
    </AuthShell>
  )
}
