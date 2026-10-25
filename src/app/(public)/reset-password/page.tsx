import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/server/supabase'
import { buttonVariants } from '@/components/ui/button'
import { AuthShell } from '../auth-shell'
import { SetPasswordForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Choose a new password' }

export default async function ResetPasswordPage() {
  const db = await createClient()
  const { data } = await db.auth.getUser()
  if (!data.user)
    return (
      <AuthShell title="Link" accent="expired" subtitle="Password reset links work once and expire after an hour.">
        <Link href="/forgot-password" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Request a new link
        </Link>
      </AuthShell>
    )
  return (
    <AuthShell title="Choose a new" accent="password" subtitle={`For ${data.user.email}`}>
      <SetPasswordForm mode="reset" />
    </AuthShell>
  )
}
