'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui/states'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main id="main" className="relative z-[2] grid min-h-dvh place-items-center px-4">
      <ErrorState title="Something went wrong" description="An unexpected error occurred. Nothing you saved was lost. Please try again." onRetry={reset} />
    </main>
  )
}
