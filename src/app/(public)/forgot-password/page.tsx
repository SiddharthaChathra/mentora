import type { Metadata } from 'next'
import { AuthShell } from '../auth-shell'
import { ForgotForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Reset your password' }

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your" accent="password?" subtitle="Enter your email and we’ll send you a secure reset link.">
      <ForgotForm />
    </AuthShell>
  )
}
