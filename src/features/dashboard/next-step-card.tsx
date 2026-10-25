'use client'

import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/lib/hooks'
import { Icon3D, type Icon3DName } from '@/components/illustrations/icons3d'

export type NextStep = { id: string; title: string; body: string; cta: { label: string; href: string }; icon: Icon3DName; calm?: boolean }

/** UX2-03 "Next step": one action at a time, dismissible (remembered per step on this device). */
export function NextStepCard({ step, className }: { step: NextStep; className?: string }) {
  const [dismissed, setDismissed] = useLocalStorage(`m_next_${step.id}`, '0')
  if (dismissed === '1' && !step.calm) {
    return (
      <div className={cn('flex flex-col justify-center rounded-[24px] bg-surface p-6 shadow-2', className)}>
        <p className="text-sm text-ink-500">Next step hidden.</p>
        <button type="button" onClick={() => setDismissed('0')} className="mt-1 w-fit text-sm font-semibold text-primary-600 hover:underline">
          Show it again
        </button>
      </div>
    )
  }
  return (
    <section aria-label="Next step" className={cn('relative flex flex-col rounded-[24px] bg-tile-blue p-6', className)}>
      {!step.calm && (
        <button type="button" onClick={() => setDismissed('1')} aria-label="Dismiss next step" className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-ink-500 hover:bg-white">
          <X className="size-4" />
        </button>
      )}
      <div className="flex items-start gap-4">
        <Icon3D name={step.icon} size={56} />
        <div className="min-w-0 pr-6">
          <p className="eyebrow text-primary-700">Next step</p>
          <h2 className="mt-1 text-lg font-semibold text-ink-900">{step.title}</h2>
          <p className="mt-1 text-sm text-ink-700">{step.body}</p>
        </div>
      </div>
      <Link href={step.cta.href} className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-full bg-primary-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgb(37_99_235/0.55)] hover:bg-primary-700">
        {step.cta.label} <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
