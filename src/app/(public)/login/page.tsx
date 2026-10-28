import type { Metadata } from 'next'
import { AuthShell } from '../auth-shell'
import { LoginForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Sign in' }

const NOTICES: Record<string, string> = {
  link: 'That link is invalid or has expired. Sign in, or request a new password reset link.',
  signedOut: 'You have been signed out.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const notice = sp.error ? NOTICES[sp.error] : sp.signedOut ? NOTICES.signedOut : undefined
  return (
    <AuthShell title="Welcome" accent="back" subtitle="Sign in with the email your college registered for you.">
      <LoginForm next={sp.next} notice={notice} />
    </AuthShell>
  )
}
