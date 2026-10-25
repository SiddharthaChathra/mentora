'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'

const FACTS = [
  { k: 'Restricted by design', v: 'Mentors only ever see the students actively assigned to them, enforced in the database.' },
  { k: 'Transparent insights', v: 'Every strength and focus area comes with “Why am I seeing this?” and the marks behind it.' },
  { k: 'Verified records', v: 'Mentors verify submitted marks; corrections go through an approval, never a silent edit.' },
  { k: 'Reports that print well', v: 'A clean, paginated student report generated only from verified data.' },
]

export function RotatingFacts() {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % FACTS.length), 5200)
    return () => clearInterval(t)
  }, [])
  const f = FACTS[i]!
  return (
    <div className="max-w-md">
      <div className="frost relative min-h-[136px] rounded-[24px] p-6">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.32 }}>
            <p className="text-xs font-semibold tracking-[0.04em] text-white uppercase">{f.k}</p>
            <p className="mt-2 text-lg leading-snug font-semibold text-white">{f.v}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex gap-1.5">
        {FACTS.map((_, j) => (
          <span key={j} className={`h-1.5 rounded-full transition-all duration-300 ${j === i ? 'w-6 bg-white' : 'w-1.5 bg-white/45'}`} />
        ))}
      </div>
    </div>
  )
}
