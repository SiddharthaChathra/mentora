import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SystemPage } from '@/components/system-page'
import { Button } from '@/components/ui/button'
import { ROLE_HOME, requireUser } from '@/server/authz'
import { signOut } from '@/server/actions/shell'

export const metadata: Metadata = { title: 'HOD access ended' }

/** An HOD whose appointment ended lands here on their next request — no crash, no stale branch data. */
export default async function HodAccessEndedPage() {
  const actor = await requireUser({ allowEndedHod: true })
  if (actor.role !== 'HOD' || actor.hodActive) redirect(ROLE_HOME[actor.role])
  return (
    <SystemPage
      title="Your HOD access has ended"
      description="Your appointment as Head of Department has ended, so branch pages are no longer available to you. If you think this is a mistake, contact the Principal."
      illustration="locked"
      actions={
        <form
          action={async () => {
            'use server'
            await signOut()
          }}
        >
          <Button type="submit" variant="secondary" size="lg">
            Sign out
          </Button>
        </form>
      }
    />
  )
}
