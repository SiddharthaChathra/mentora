'use client'

import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GLOSSARY, type GlossaryTerm } from '@/lib/glossary'
import { Popover, PopoverContent, PopoverTrigger } from './overlay'

/** Small "?" that explains a term (UX2-14). A popover, not a tooltip, so it works on touch screens too. */
export function HelpTip({ term, label, className, tone = 'default' }: { term: GlossaryTerm; label?: string; className?: string; tone?: 'default' | 'inverse' }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is ${label ?? term}?`}
          className={cn(
            'inline-grid size-5 shrink-0 place-items-center rounded-full align-middle transition-colors',
            tone === 'inverse' ? 'text-white/80 hover:bg-white/15 hover:text-white' : 'text-ink-400 hover:bg-primary-50 hover:text-primary-700',
            className,
          )}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm normal-case tracking-normal">
        <p className="font-semibold text-ink-900">{label ?? term}</p>
        <p className="mt-1 text-ink-700">{GLOSSARY[term]}</p>
      </PopoverContent>
    </Popover>
  )
}
