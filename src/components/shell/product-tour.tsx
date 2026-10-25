'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import type { Role } from '@/lib/roles'
import { useLocalStorage, useMounted } from '@/lib/hooks'
import { Button } from '@/components/ui/button'

type Step = { target?: string; title: string; body: string }

const STEPS: Record<Role, Step[]> = {
  MENTEE: [
    { title: 'Welcome to Mentora', body: 'Your dashboard shows credits, goals and SGPA at a glance, plus the single best next step for you.' },
    { target: 'academics', title: 'Your academic records', body: 'Add each semester’s subjects and marks. Everything autosaves; submit when it matches your official result.' },
    { target: 'semester', title: 'Switch semesters', body: 'Focus the dashboard on one semester, or see everything.' },
    { target: 'search', title: 'Find anything', body: 'Search pages and actions. Press / or Ctrl+K anytime.' },
  ],
  MENTOR: [
    { title: 'Your mentoring overview', body: 'See who needs attention, follow-ups due and how your mentees are trending. Every flag explains its reason.' },
    { target: 'mentees', title: 'Your mentees', body: 'Only students assigned to you by your HOD appear here. Open a profile to recommend, upload or schedule.' },
    { target: 'search', title: 'Search a student', body: 'Find any of your mentees by name or USN. Press / anytime.' },
    { target: 'semester', title: 'Focus a semester', body: 'Filter dashboards to students in one semester.' },
  ],
  HOD: [
    { title: 'Your department at a glance', body: 'Coverage, workload and the students who need intervention, all from real records.' },
    { target: 'assignments', title: 'Assign mentors', body: 'Drag students between mentors or bulk-reassign. Every change is audited and can be undone for 10 seconds.' },
    { target: 'search', title: 'Search everyone', body: 'Jump to any student or mentor by name or USN.' },
    { target: 'semester', title: 'Filter by semester', body: 'Dashboards and lists respect the semester you choose here.' },
  ],
}

export function ProductTour({ role, userId, open, onOpenChange }: { role: Role; userId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [seen, setSeen] = useLocalStorage(`m_tour_${userId}`, '0')
  const mounted = useMounted()
  const [step, setStep] = React.useState(0)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const autoOpen = seen === '0'
  const visible = mounted && (open || autoOpen)
  const steps = STEPS[role]
  const s = steps[step]!

  React.useEffect(() => {
    if (!visible) return
    const measure = () => {
      const el = s.target ? document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`) : null
      const r = el?.getBoundingClientRect()
      setRect(r && r.width > 0 ? r : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [visible, s.target])

  if (!visible) return null
  const close = () => {
    setSeen('1')
    setStep(0)
    onOpenChange(false)
  }
  const cardStyle: React.CSSProperties = rect
    ? { top: Math.min(window.innerHeight - 220, rect.bottom + 12), left: Math.min(Math.max(16, rect.left), window.innerWidth - 336) }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="absolute inset-0 bg-ink-900/40" onClick={close} />
      {rect && <div aria-hidden className="pointer-events-none absolute rounded-[16px] ring-4 ring-primary-300 ring-offset-4 ring-offset-transparent" style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgb(15 23 42 / 0.15)' }} />}
      <div className="absolute w-[320px] max-w-[calc(100vw-32px)] rounded-[24px] bg-surface p-5 shadow-3" style={cardStyle}>
        <p className="eyebrow">
          Step {step + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-lg font-semibold text-ink-900">
          {s.title}
        </h2>
        <p className="mt-1.5 text-sm text-ink-700">{s.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={close} className="text-sm font-semibold text-ink-500 hover:text-ink-900">
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={() => (step < steps.length - 1 ? setStep(step + 1) : close())} autoFocus>
              {step < steps.length - 1 ? 'Next' : 'Done'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
