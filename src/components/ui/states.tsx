import * as React from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Illustration, type IllustrationName } from '@/components/illustrations'

export function EmptyState({
  illustration,
  title,
  description,
  action,
  secondary,
  compact,
  className,
}: {
  illustration: IllustrationName
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  secondary?: React.ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'px-4 py-6' : 'px-6 py-12', className)}>
      <Illustration name={illustration} className={compact ? 'max-w-[150px]' : 'max-w-[220px]'} />
      <h3 className={cn('mt-4 text-ink-900', compact ? 'text-base font-semibold' : 'text-xl font-semibold')}>{title}</h3>
      {description && <p className="mt-1.5 max-w-[42ch] text-sm text-ink-500">{description}</p>}
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  )
}

export function ErrorState({
  title = 'We couldn’t load this',
  description = 'Check your connection and try again. Nothing you entered was lost.',
  onRetry,
  retryHref,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  retryHref?: string
  className?: string
}) {
  const btn =
    'mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink-900 hover:border-primary-300'
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <Illustration name="error" className="max-w-[200px]" />
      <h3 className="mt-4 text-xl font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-[42ch] text-sm text-ink-500">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={btn}>
          <RotateCcw className="size-4" /> Try again
        </button>
      )}
      {retryHref && !onRetry && (
        <a href={retryHref} className={btn}>
          <RotateCcw className="size-4" /> Try again
        </a>
      )}
    </div>
  )
}

/** Inline "not enough data" explanation used wherever a derived value is withheld. */
export function NotEnoughData({ reason, className }: { reason: string; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-[16px] border border-dashed border-line-strong bg-surface-muted px-4 py-3 text-sm', className)}>
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-400" />
      <p>
        <span className="font-medium text-ink-900">Not enough data.</span> <span className="text-ink-500">{reason}</span>
      </p>
    </div>
  )
}
