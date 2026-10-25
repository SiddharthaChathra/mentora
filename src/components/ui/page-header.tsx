import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  accent,
  description,
  breadcrumbs,
  actions,
  eyebrow,
  className,
}: {
  title: string
  /** Accent word rendered after the title in primary blue, e.g. "Hello, Ananya". */
  accent?: string
  description?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
  eyebrow?: string
  className?: string
}) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
              {breadcrumbs.map((b, i) => (
                <li key={`${b.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-ink-400" />}
                  {b.href ? (
                    <Link href={b.href} className="hover:text-ink-900">
                      {b.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink-700">
                      {b.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
          {title}
          {accent && (
            <>
              {' '}
              <span className="text-primary-600">{accent}</span>
            </>
          )}
        </h1>
        {description && <p className="mt-1 max-w-[68ch] text-base text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
