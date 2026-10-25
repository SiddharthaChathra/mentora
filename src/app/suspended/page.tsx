import type { Metadata } from 'next'
import { SystemPage } from '@/components/system-page'
import { Button } from '@/components/ui/button'
import { signOut } from '@/server/actions/shell'

export const metadata: Metadata = { title: 'Account suspended' }

export default function SuspendedPage() {
  return (
    <SystemPage
      title="Your account is suspended"
      description="You can’t access Mentora right now. Please contact your Head of Department to restore access."
      illustration="locked"
      actions={
        <form action={async () => { 'use server'; await signOut() }}>
          <Button type="submit" variant="secondary" size="lg">Sign out</Button>
        </form>
      }
    />
  )
}
