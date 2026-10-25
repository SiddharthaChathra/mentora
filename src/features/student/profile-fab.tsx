'use client'

import * as React from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, MessageSquarePlus, Plus, Upload, X } from 'lucide-react'

/** Phone-only floating action button on the mentee profile. */
export function ProfileFab({ href }: { href: string }) {
  const [open, setOpen] = React.useState(false)
  const actions = [
    { label: 'Recommend', icon: MessageSquarePlus, to: `${href}?tab=mentoring&action=recommend` },
    { label: 'Upload', icon: Upload, to: `${href}?tab=resources&new=1` },
    { label: 'Schedule', icon: CalendarPlus, to: `${href}?tab=sessions&new=1` },
  ]
  return (
    <div className="fixed right-4 bottom-24 z-30 flex flex-col items-end gap-2 lg:hidden">
      <AnimatePresence>
        {open &&
          actions.map((a, i) => (
            <motion.div key={a.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} exit={{ opacity: 0, y: 12 }}>
              <Link href={a.to} onClick={() => setOpen(false)} className="flex h-12 items-center gap-2.5 rounded-full bg-surface pr-5 pl-4 text-sm font-medium text-ink-900 shadow-3 ring-1 ring-line">
                <a.icon className="size-5 text-primary-600" /> {a.label}
              </Link>
            </motion.div>
          ))}
      </AnimatePresence>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        onClick={() => setOpen((o) => !o)}
        className="grid size-14 place-items-center rounded-2xl bg-gradient-primary text-white shadow-3"
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </button>
    </div>
  )
}
