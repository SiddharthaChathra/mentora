'use client'

import * as React from 'react'
import { BookOpenCheck } from 'lucide-react'
import { LineTrendChart } from '@/components/charts/academic'
import { Icon3DBadge } from '@/components/illustrations/icons3d'
import { Pill } from '@/components/ui/primitives'

/** Floating, gently tilting composition of real Mentora UI pieces — an illustrative product preview. */
export function HeroComposition() {
  const ref = React.useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 })
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Preview of the Mentora dashboard"
      className="relative mx-auto h-[460px] w-full max-w-[540px] [perspective:1400px]"
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -6, y: ((e.clientX - r.left) / r.width - 0.5) * 8 })
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-out)] [transform-style:preserve-3d]" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <div className="absolute top-0 left-0 w-[66%] rounded-[24px] bg-surface p-5 text-ink-700 shadow-3 [transform:translateZ(40px)_rotate(-2deg)]">
          <p className="mb-1 text-sm font-semibold text-ink-900">SGPA Records</p>
          <LineTrendChart compact height={130} data={[{ label: 'Sem 1', value: 7.6 }, { label: 'Sem 2', value: 7.9 }, { label: 'Sem 3', value: 8.4 }, { label: 'Sem 4', value: 8.9 }]} />
        </div>
        <div className="absolute top-14 right-0 w-[44%] rounded-[20px] bg-tile-green p-5 shadow-3 [transform:translateZ(80px)_rotate(3deg)]">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-ink-700">Goals done</p>
            <span className="grid size-9 place-items-center rounded-[12px] bg-badge-green text-white">
              <BookOpenCheck className="size-[18px]" />
            </span>
          </div>
          <p className="num-display mt-3 text-4xl font-semibold text-ink-900">4 / 5</p>
          <p className="mt-2 text-sm text-ink-500">1 more to finish</p>
        </div>
        <div className="absolute right-4 bottom-0 left-6 flex items-center gap-4 rounded-[24px] bg-gradient-banner p-5 text-white shadow-hero [transform:translateZ(60px)]">
          <Icon3DBadge name="credits" size={56} />
          <div>
            <p className="text-sm text-white/90">Credits earned</p>
            <p className="num-display text-3xl font-semibold">
              74 / 160 <Pill className="ml-1 bg-white text-primary-700">46%</Pill>
            </p>
            <p className="text-sm text-white/90">22 more credits in progress</p>
          </div>
        </div>
      </div>
    </div>
  )
}
