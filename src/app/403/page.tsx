import type { Metadata } from 'next'
import { SystemPage } from '@/components/system-page'

export const metadata: Metadata = { title: 'No access' }

export default function ForbiddenPage() {
  return (
    <SystemPage
      code="403"
      title="You don’t have access to this"
      description="This record is outside your permissions — for example, a student who isn’t assigned to you. If you think that’s wrong, contact your HOD."
      illustration="locked"
    />
  )
}
