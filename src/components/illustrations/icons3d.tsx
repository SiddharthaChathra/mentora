import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Soft 3D icon set (v2 "Sky Dashboard"): glossy rounded forms in blue / white / warm yellow,
 * gentle highlights and a soft contact shadow. Hand-built SVG (no raster assets, crisp at any size).
 */
export type Icon3DName =
  | 'credits'
  | 'goals'
  | 'subjects'
  | 'sessions'
  | 'feedback'
  | 'resources'
  | 'mentees'
  | 'attention'
  | 'coverage'
  | 'import'
  | 'report'
  | 'wave'
  | 'file-pdf'
  | 'file-doc'
  | 'file-link'

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#7DB4FF" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id={`${id}-lb`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="#E0EDFF" />
        <stop offset="1" stopColor="#A9CBFF" />
      </linearGradient>
      <linearGradient id={`${id}-w`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#E7EEFA" />
      </linearGradient>
      <linearGradient id={`${id}-y`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="#FFE38A" />
        <stop offset="1" stopColor="#F5B300" />
      </linearGradient>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="#8BE3A8" />
        <stop offset="1" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="#FFA4A4" />
        <stop offset="1" stopColor="#EF4444" />
      </linearGradient>
      <radialGradient id={`${id}-hl`} cx="0.3" cy="0.22" r="0.6">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#1D4ED8" floodOpacity="0.22" />
      </filter>
    </defs>
  )
}

const Shadow = () => <ellipse cx="32" cy="58" rx="18" ry="3" fill="#1D4ED8" opacity="0.12" />

const ICONS: Record<Icon3DName, (id: string) => React.ReactNode> = {
  credits: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <rect x="10" y="38" width="40" height="11" rx="4" fill={`url(#${id}-b)`} />
        <rect x="12" y="40.5" width="36" height="2.5" rx="1.25" fill="#fff" opacity="0.7" />
        <rect x="14" y="27" width="38" height="11" rx="4" fill={`url(#${id}-y)`} />
        <rect x="16" y="29.5" width="34" height="2.5" rx="1.25" fill="#fff" opacity="0.7" />
        <rect x="11" y="16" width="38" height="11" rx="4" fill={`url(#${id}-lb)`} />
        <circle cx="47" cy="17" r="9" fill={`url(#${id}-g)`} />
        <path d="M42.8 17.2l3 3 5.4-6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect x="11" y="16" width="38" height="33" rx="5" fill={`url(#${id}-hl)`} opacity="0.5" />
    </>
  ),
  goals: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <circle cx="30" cy="33" r="21" fill={`url(#${id}-w)`} />
        <circle cx="30" cy="33" r="15" fill={`url(#${id}-b)`} />
        <circle cx="30" cy="33" r="9" fill="#fff" />
        <circle cx="30" cy="33" r="4.5" fill={`url(#${id}-y)`} />
        <path d="M31 32 L52 11" stroke="#1E3A8A" strokeWidth="3" strokeLinecap="round" />
        <path d="M47 9 l7 0 l0 7 l-3.5 -1.2 l-2.3 -2.3Z" fill={`url(#${id}-y)`} />
      </g>
      <circle cx="30" cy="33" r="21" fill={`url(#${id}-hl)`} />
    </>
  ),
  subjects: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M10 14h14a5 5 0 1 1 8 0h0v12a5 5 0 1 0 0 8v0H10z" fill={`url(#${id}-b)`} />
        <path d="M34 14h18v20h-8a5 5 0 1 0-6 0h-4V22a5 5 0 1 1 0-8z" fill={`url(#${id}-y)`} />
        <path d="M10 36h12a5 5 0 1 0 8 0h4v16H10z" fill={`url(#${id}-lb)`} />
        <path d="M36 36h16v16H36v-6a5 5 0 1 0 0-6z" fill={`url(#${id}-g)`} />
      </g>
      <rect x="10" y="14" width="42" height="38" rx="4" fill={`url(#${id}-hl)`} opacity="0.55" />
    </>
  ),
  sessions: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <rect x="8" y="12" width="40" height="38" rx="9" fill={`url(#${id}-w)`} />
        <path d="M8 21a9 9 0 0 1 9-9h22a9 9 0 0 1 9 9v3H8z" fill={`url(#${id}-b)`} />
        <rect x="15" y="7" width="4" height="10" rx="2" fill="#1E40AF" />
        <rect x="37" y="7" width="4" height="10" rx="2" fill="#1E40AF" />
        {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={14 + c * 9} y={30 + r * 8} width="6" height="5" rx="1.5" fill={c === 1 && r === 0 ? '#F5B300' : '#C7D8F3'} />))}
        <circle cx="46" cy="44" r="12" fill={`url(#${id}-y)`} />
        <path d="M46 37.5v7l4.2 2.6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>
      <rect x="8" y="12" width="40" height="38" rx="9" fill={`url(#${id}-hl)`} opacity="0.6" />
    </>
  ),
  feedback: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M14 10h32a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H27l-9 8v-8h-4a8 8 0 0 1-8-8V18a8 8 0 0 1 8-8z" fill={`url(#${id}-b)`} />
        <path d="M30 17.5l3.3 6.7 7.4 1-5.4 5.2 1.3 7.3-6.6-3.5-6.6 3.5 1.3-7.3-5.4-5.2 7.4-1z" fill={`url(#${id}-y)`} />
      </g>
      <path d="M14 10h32a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V18a8 8 0 0 1 8-8z" fill={`url(#${id}-hl)`} />
    </>
  ),
  resources: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <rect x="20" y="8" width="24" height="30" rx="4" fill={`url(#${id}-w)`} transform="rotate(10 32 23)" />
        <rect x="16" y="10" width="24" height="30" rx="4" fill="#fff" transform="rotate(-6 28 25)" />
        <rect x="20" y="17" width="14" height="2.5" rx="1.25" fill="#C7D8F3" transform="rotate(-6 28 25)" />
        <path d="M7 24a5 5 0 0 1 5-5h12l4 4h24a5 5 0 0 1 5 5v19a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6z" fill={`url(#${id}-y)`} />
        <path d="M7 31h50v16a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6z" fill={`url(#${id}-b)`} />
      </g>
      <path d="M7 31h50v16a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6z" fill={`url(#${id}-hl)`} />
    </>
  ),
  mentees: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <circle cx="22" cy="20" r="9" fill={`url(#${id}-y)`} />
        <path d="M6 50a16 15 0 0 1 32 0z" fill={`url(#${id}-y)`} />
        <circle cx="42" cy="22" r="10" fill={`url(#${id}-b)`} />
        <path d="M24 54a18 17 0 0 1 36 0z" fill={`url(#${id}-b)`} />
      </g>
      <circle cx="42" cy="22" r="10" fill={`url(#${id}-hl)`} />
      <circle cx="22" cy="20" r="9" fill={`url(#${id}-hl)`} />
    </>
  ),
  attention: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M30 8a15 15 0 0 1 15 15v10l5 8H10l5-8V23A15 15 0 0 1 30 8z" fill={`url(#${id}-b)`} />
        <circle cx="30" cy="47" r="5" fill={`url(#${id}-y)`} />
        <circle cx="47" cy="15" r="9" fill={`url(#${id}-r)`} />
        <rect x="45.7" y="9.5" width="2.6" height="7" rx="1.3" fill="#fff" />
        <circle cx="47" cy="19.5" r="1.5" fill="#fff" />
      </g>
      <path d="M30 8a15 15 0 0 1 15 15v10l5 8H10l5-8V23A15 15 0 0 1 30 8z" fill={`url(#${id}-hl)`} />
    </>
  ),
  coverage: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M32 6l20 7v14c0 13-8.5 21-20 25-11.5-4-20-12-20-25V13z" fill={`url(#${id}-b)`} />
        <path d="M32 12l14 5v10c0 9.5-6 15.5-14 18.5-8-3-14-9-14-18.5V17z" fill={`url(#${id}-lb)`} />
        <path d="M24.5 29l5.3 5.3 10-11" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M32 6l20 7v14c0 13-8.5 21-20 25-11.5-4-20-12-20-25V13z" fill={`url(#${id}-hl)`} />
    </>
  ),
  import: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M18 46a12 12 0 0 1-1-24 16 16 0 0 1 30.5 3.5A10.5 10.5 0 0 1 46 46z" fill={`url(#${id}-w)`} />
        <circle cx="32" cy="38" r="11" fill={`url(#${id}-b)`} />
        <path d="M32 44v-12m-5 5 5-5 5 5" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M18 46a12 12 0 0 1-1-24 16 16 0 0 1 30.5 3.5A10.5 10.5 0 0 1 46 46z" fill={`url(#${id}-hl)`} opacity="0.6" />
    </>
  ),
  report: (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M14 8h22l12 12v28a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill={`url(#${id}-w)`} />
        <path d="M36 8v9a3 3 0 0 0 3 3h9z" fill="#C7D8F3" />
        <rect x="15" y="24" width="20" height="3" rx="1.5" fill="#93C5FD" />
        <rect x="15" y="31" width="14" height="3" rx="1.5" fill="#C7D8F3" />
        <circle cx="44" cy="42" r="9" fill={`url(#${id}-b)`} />
        <path d="M39 49l-2 9 7-3 7 3-2-9" fill={`url(#${id}-y)`} />
        <circle cx="44" cy="42" r="4" fill="#fff" opacity="0.85" />
      </g>
    </>
  ),
  'file-pdf': (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M16 6h20l12 12v32a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5z" fill={`url(#${id}-w)`} />
        <path d="M36 6v9a3 3 0 0 0 3 3h9z" fill="#C7D8F3" />
        <rect x="17" y="24" width="22" height="3" rx="1.5" fill="#C7D8F3" />
        <rect x="17" y="31" width="16" height="3" rx="1.5" fill="#C7D8F3" />
        <rect x="6" y="38" width="30" height="14" rx="5" fill={`url(#${id}-r)`} />
        <text x="21" y="48.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="ui-sans-serif, system-ui">PDF</text>
      </g>
      <rect x="6" y="38" width="30" height="7" rx="3.5" fill={`url(#${id}-hl)`} opacity="0.7" />
    </>
  ),
  'file-doc': (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <path d="M16 6h20l12 12v32a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5z" fill={`url(#${id}-w)`} />
        <path d="M36 6v9a3 3 0 0 0 3 3h9z" fill="#C7D8F3" />
        <rect x="17" y="24" width="22" height="3" rx="1.5" fill="#C7D8F3" />
        <rect x="17" y="31" width="16" height="3" rx="1.5" fill="#C7D8F3" />
        <rect x="6" y="38" width="30" height="14" rx="5" fill={`url(#${id}-b)`} />
        <text x="21" y="48.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="ui-sans-serif, system-ui">DOC</text>
      </g>
      <rect x="6" y="38" width="30" height="7" rx="3.5" fill={`url(#${id}-hl)`} opacity="0.7" />
    </>
  ),
  'file-link': (id) => (
    <>
      <Shadow />
      <g filter={`url(#${id}-sh)`}>
        <circle cx="32" cy="30" r="22" fill={`url(#${id}-b)`} />
        <path d="M28.5 35.5l7-7M26 31l-3.2 3.2a5 5 0 0 0 7 7L33 38m-2-12l3.2-3.2a5 5 0 0 1 7 7L38 33" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="30" r="22" fill={`url(#${id}-hl)`} />
    </>
  ),
  wave: (id) => (
    <>
      <g filter={`url(#${id}-sh)`}>
        <path d="M22 50c-7-4-12-11-12-17 0-2.5 3-3.5 4.6-1.5L19 37V15.5a3.4 3.4 0 0 1 6.8 0V28V11.5a3.4 3.4 0 0 1 6.8 0V28V13.5a3.4 3.4 0 0 1 6.8 0V30V19a3.4 3.4 0 0 1 6.8 0v17c0 11-7 17-16 17-3 0-5-1-8.2-3z" fill={`url(#${id}-y)`} />
      </g>
      <path d="M46 10c3 2 5 5 5.5 8.5M50 6c4 3 6.5 7 7 11.5" stroke="#93C5FD" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
}

export function Icon3D({ name, size = 48, className, title }: { name: Icon3DName; size?: number; className?: string; title?: string }) {
  const id = `i3-${React.useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <Defs id={id} />
      {ICONS[name](id)}
    </svg>
  )
}

/** Icon in a white circle — used on the blue StatBanner (ref-kouliah). */
export function Icon3DBadge({ name, size = 56, className }: { name: Icon3DName; size?: number; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgb(15_23_42/0.35)]', className)} style={{ width: size, height: size }}>
      <Icon3D name={name} size={Math.round(size * 0.72)} />
    </span>
  )
}

// ───────────────────────────── Scenic illustrations ─────────────────────────────
export type SceneName = 'sky-path' | 'campus-morning' | 'summit'

export function Scene({ name, className, title }: { name: SceneName; className?: string; title?: string }) {
  const id = `sc-${React.useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className={cn('block h-auto w-full', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5AA2F8" stopOpacity="0" />
          <stop offset="1" stopColor="#BFDBFE" />
        </linearGradient>
        <linearGradient id={`${id}-h1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A7D3FF" />
          <stop offset="1" stopColor="#7CB8FA" />
        </linearGradient>
        <linearGradient id={`${id}-h2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9EBFF" />
          <stop offset="1" stopColor="#B8D7FB" />
        </linearGradient>
        <linearGradient id={`${id}-road`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF4C2" />
          <stop offset="1" stopColor="#FFE38A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#${id}-sky)`} />
      {/* clouds */}
      <g fill="#FFFFFF" opacity="0.9">
        <ellipse cx="70" cy="70" rx="34" ry="11" />
        <ellipse cx="92" cy="62" rx="20" ry="12" />
        <ellipse cx="300" cy="48" rx="40" ry="10" opacity="0.75" />
        <ellipse cx="322" cy="40" rx="20" ry="11" opacity="0.75" />
      </g>
      {name === 'sky-path' && (
        <>
          <path d="M0 150 C80 118 150 128 210 140 S330 120 400 132 V200 H0Z" fill={`url(#${id}-h2)`} />
          <path d="M0 168 C90 146 160 156 230 162 S350 150 400 158 V200 H0Z" fill={`url(#${id}-h1)`} />
          <path d="M200 140 C196 158 168 182 120 200 H262 C232 182 210 160 204 140Z" fill={`url(#${id}-road)`} />
          <path d="M202 148 L202 154 M200 164 L199 172 M196 182 L193 194" stroke="#93C5FD" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {name === 'campus-morning' && (
        <>
          <circle cx="320" cy="78" r="40" fill={`url(#${id}-sun)`} />
          <path d="M0 160 C100 140 300 140 400 160 V200 H0Z" fill={`url(#${id}-h2)`} />
          <g fill="#FFFFFF">
            <rect x="120" y="96" width="70" height="70" rx="6" />
            <path d="M112 100 L155 72 L198 100Z" />
            <rect x="200" y="112" width="58" height="54" rx="6" />
            <rect x="72" y="118" width="40" height="48" rx="6" />
          </g>
          <g fill="#BFDBFE">
            {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={132 + c * 18} y={110 + r * 22} width="10" height="12" rx="2" />))}
            {[0, 1].map((c) => <rect key={c} x={212 + c * 20} y={126} width="12" height="12" rx="2" />)}
          </g>
          <path d="M0 176 C100 160 300 160 400 176 V200 H0Z" fill={`url(#${id}-h1)`} />
          {[48, 280, 330].map((x) => (
            <g key={x}>
              <rect x={x - 2} y="150" width="4" height="22" fill="#94A3B8" opacity="0.6" />
              <circle cx={x} cy="146" r="14" fill="#86EFAC" opacity="0.85" />
            </g>
          ))}
        </>
      )}
      {name === 'summit' && (
        <>
          <path d="M40 200 L180 70 L240 130 L280 100 L380 200Z" fill={`url(#${id}-h1)`} />
          <path d="M180 70 L205 94 L190 92 L180 100 L170 90 L160 92Z" fill="#FFFFFF" />
          <path d="M180 70 V42" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" />
          <path d="M181 42 L206 49 L181 57Z" fill="#F5B300" />
          <path d="M0 180 C100 165 300 165 400 180 V200 H0Z" fill={`url(#${id}-h2)`} />
        </>
      )}
    </svg>
  )
}
