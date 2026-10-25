import Link from 'next/link'
import { EmptyState } from '@/components/ui/states'
import { buttonVariants } from '@/components/ui/button'

export default function AppNotFound() {
  return (
    <EmptyState
      illustration="not-found"
      title="We couldn’t find that"
      description="It may have been removed, or the link is wrong."
      action={
        <Link href="/dashboard" className={buttonVariants()}>
          Back to my dashboard
        </Link>
      }
    />
  )
}
