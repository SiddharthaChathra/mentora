'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui/states'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return <ErrorState className="rounded-xl bg-surface shadow-2" onRetry={reset} />
}
