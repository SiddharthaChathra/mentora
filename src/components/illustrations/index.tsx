import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Mentora illustration set — hand-built SVG in a soft 3D style:
 * blue / white / warm-yellow palette, gradient-lit rounded forms, soft contact shadows.
 * All decorative by default (aria-hidden); pass `title` to expose meaning to assistive tech.
 */

export type IllustrationName =
  | 'no-marks'
  | 'no-feedback'
  | 'no-resources'
  | 'no-sessions'
  | 'no-mentees'
  | 'no-notifications'
  | 'no-results'
  | 'no-import'
  | 'login'
  | 'step-profile'
  | 'step-academic'
  | 'step-history'
  | 'step-about'
  | 'not-found'
  | 'error'
  | 'success'
  | 'offline'
  | 'locked'

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-bg`} cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#DBEAFE" />
        <stop offset="70%" stopColor="#EFF6FF" />
        <stop offset="100%" stopColor="#EEF2F9" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#BFDBFE" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
      <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#F5B300" />
      </linearGradient>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#BAE6FD" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
      <linearGradient id={`${id}-jade`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#86EFAC" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#EEF0F7" />
      </linearGradient>
      <linearGradient id={`${id}-coral`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FCA5A5" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
      <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="60%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="160%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id={`${id}-lift`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#2563EB" floodOpacity="0.16" />
      </filter>
    </defs>
  )
}

const Ground = ({ id, cx = 120, w = 70 }: { id: string; cx?: number; w?: number }) => (
  <ellipse cx={cx} cy="158" rx={w} ry="9" fill="#2563EB" opacity="0.12" filter={`url(#${id}-soft)`} />
)
const Halo = ({ id }: { id: string }) => <circle cx="120" cy="88" r="78" fill={`url(#${id}-bg)`} />
const Sparkle = ({ x, y, s = 1, c = '#F5B300' }: { x: number; y: number; s?: number; c?: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -7 C1 -2 2 -1 7 0 C2 1 1 2 0 7 C-1 2 -2 1 -7 0 C-2 -1 -1 -2 0 -7Z"
    fill={c}
  />
)
const Dot = ({ x, y, r = 3, c = '#60A5FA' }: { x: number; y: number; r?: number; c?: string }) => <circle cx={x} cy={y} r={r} fill={c} />

function Paper({ id, x, y, w, h, r = 10, rotate = 0 }: { id: string; x: number; y: number; w: number; h: number; r?: number; rotate?: number }) {
  return (
    <g transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`} filter={`url(#${id}-lift)`}>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id}-paper)`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="#E2E4EE" />
    </g>
  )
}

const SCENES: Record<IllustrationName, (id: string) => React.ReactNode> = {
  'no-marks': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <Paper id={id} x={74} y={40} w={84} h={104} rotate={-6} />
      <Paper id={id} x={86} y={34} w={84} h={108} />
      <rect x="100" y="52" width="40" height="6" rx="3" fill="#D6D9E8" />
      <rect x="100" y="64" width="26" height="6" rx="3" fill="#E4E6F0" />
      <rect x="102" y="104" width="10" height="24" rx="4" fill={`url(#${id}-sky)`} />
      <rect x="118" y="90" width="10" height="38" rx="4" fill={`url(#${id}-brand)`} />
      <rect x="134" y="98" width="10" height="30" rx="4" fill={`url(#${id}-sun)`} />
      <g transform="rotate(38 176 64)">
        <rect x="168" y="30" width="14" height="66" rx="7" fill={`url(#${id}-sun)`} />
        <rect x="168" y="30" width="14" height="12" rx="6" fill="#FEF3C7" />
        <path d="M168 92 L175 108 L182 92Z" fill="#FFFBEB" />
      </g>
      <Sparkle x={62} y={56} />
      <Dot x={190} y={128} />
    </>
  ),
  'no-feedback': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M56 46 h88 a16 16 0 0 1 16 16 v34 a16 16 0 0 1 -16 16 h-58 l-18 16 v-16 h-12 a16 16 0 0 1 -16 -16 v-34 a16 16 0 0 1 16 -16Z" fill={`url(#${id}-brand)`} />
        <path d="M56 46 h88 a16 16 0 0 1 16 16 v34 a16 16 0 0 1 -16 16 h-58 l-18 16 v-16 h-12 a16 16 0 0 1 -16 -16 v-34 a16 16 0 0 1 16 -16Z" fill={`url(#${id}-shine)`} />
      </g>
      <rect x="64" y="66" width="62" height="7" rx="3.5" fill="#FFFFFF" opacity="0.9" />
      <rect x="64" y="82" width="40" height="7" rx="3.5" fill="#FFFFFF" opacity="0.6" />
      <g filter={`url(#${id}-lift)`}>
        <path d="M128 92 h50 a14 14 0 0 1 14 14 v20 a14 14 0 0 1 -14 14 h-6 v12 l-14 -12 h-30 a14 14 0 0 1 -14 -14 v-20 a14 14 0 0 1 14 -14Z" fill={`url(#${id}-sun)`} />
      </g>
      <circle cx="140" cy="116" r="4" fill="#fff" />
      <circle cx="153" cy="116" r="4" fill="#fff" />
      <circle cx="166" cy="116" r="4" fill="#fff" />
      <Sparkle x={190} y={60} c="#38BDF8" />
      <Dot x={44} y={120} c="#F5B300" />
    </>
  ),
  'no-resources': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <Paper id={id} x={92} y={30} w={60} h={78} rotate={-10} />
      <Paper id={id} x={104} y={26} w={60} h={78} rotate={8} />
      <rect x="116" y="42" width="34" height="5" rx="2.5" fill="#D6D9E8" transform="rotate(8 133 44)" />
      <g filter={`url(#${id}-lift)`}>
        <path d="M62 70 h40 l10 10 h66 a10 10 0 0 1 10 10 v48 a12 12 0 0 1 -12 12 h-112 a12 12 0 0 1 -12 -12 v-58 a10 10 0 0 1 10 -10Z" fill={`url(#${id}-brand)`} />
        <path d="M52 96 h136 v42 a12 12 0 0 1 -12 12 h-112 a12 12 0 0 1 -12 -12Z" fill={`url(#${id}-mist)`} />
        <path d="M52 96 h136 v42 a12 12 0 0 1 -12 12 h-112 a12 12 0 0 1 -12 -12Z" fill={`url(#${id}-shine)`} opacity="0.7" />
      </g>
      <rect x="108" y="116" width="24" height="6" rx="3" fill="#fff" opacity="0.85" />
      <Sparkle x={58} y={50} c="#38BDF8" />
      <Dot x={196} y={64} c="#F5B300" />
    </>
  ),
  'no-sessions': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <rect x="58" y="40" width="104" height="104" rx="18" fill={`url(#${id}-paper)`} />
        <path d="M58 58 a18 18 0 0 1 18 -18 h68 a18 18 0 0 1 18 18 v10 h-104Z" fill={`url(#${id}-brand)`} />
      </g>
      <rect x="80" y="30" width="8" height="22" rx="4" fill="#1D4ED8" />
      <rect x="132" y="30" width="8" height="22" rx="4" fill="#1D4ED8" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => (
          <rect key={`${c}${r}`} x={72 + c * 20} y={80 + r * 18} width="12" height="10" rx="3" fill={c === 2 && r === 1 ? '#F5B300' : '#E4E6F0'} />
        )),
      )}
      <g filter={`url(#${id}-lift)`}>
        <circle cx="168" cy="122" r="26" fill={`url(#${id}-sky)`} />
        <circle cx="168" cy="122" r="26" fill={`url(#${id}-shine)`} />
      </g>
      <path d="M168 108 v15 l10 6" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Sparkle x={50} y={128} />
    </>
  ),
  'no-mentees': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} w={84} />
      {[
        { x: 78, c: 'sky', h: 0 },
        { x: 162, c: 'sun', h: 0 },
        { x: 120, c: 'brand', h: -10 },
      ].map((p) => (
        <g key={p.x} filter={`url(#${id}-lift)`}>
          <path d={`M${p.x - 26} ${150} v-26 a26 26 0 0 1 52 0 v26Z`} transform={`translate(0 ${p.h})`} fill={`url(#${id}-${p.c})`} />
          <circle cx={p.x} cy={86 + p.h} r="18" fill={`url(#${id}-${p.c})`} />
          <circle cx={p.x} cy={86 + p.h} r="18" fill={`url(#${id}-shine)`} />
        </g>
      ))}
      <Sparkle x={120} y={44} c="#F5B300" s={1.2} />
      <Dot x={46} y={70} />
      <Dot x={198} y={74} c="#93C5FD" />
    </>
  ),
  'no-notifications': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} w={56} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M120 36 a40 40 0 0 1 40 40 v26 l12 18 h-104 l12 -18 v-26 a40 40 0 0 1 40 -40Z" fill={`url(#${id}-brand)`} />
        <path d="M120 36 a40 40 0 0 1 40 40 v26 l12 18 h-104 l12 -18 v-26 a40 40 0 0 1 40 -40Z" fill={`url(#${id}-shine)`} />
        <circle cx="120" cy="134" r="12" fill={`url(#${id}-sun)`} />
      </g>
      <g filter={`url(#${id}-lift)`}>
        <circle cx="166" cy="54" r="18" fill={`url(#${id}-jade)`} />
      </g>
      <path d="M158 54 l6 6 l11 -12" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={66} y={60} c="#38BDF8" />
    </>
  ),
  'no-results': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <Paper id={id} x={64} y={46} w={88} h={94} rotate={-4} />
      <rect x="80" y="64" width="50" height="6" rx="3" fill="#D6D9E8" />
      <rect x="80" y="78" width="36" height="6" rx="3" fill="#E4E6F0" />
      <rect x="80" y="92" width="44" height="6" rx="3" fill="#E4E6F0" />
      <g filter={`url(#${id}-lift)`}>
        <circle cx="146" cy="96" r="30" fill="#FFFFFF" opacity="0.55" />
        <circle cx="146" cy="96" r="30" fill="none" stroke={`url(#${id}-brand)`} strokeWidth="11" />
        <rect x="166" y="118" width="14" height="40" rx="7" transform="rotate(-45 173 138)" fill={`url(#${id}-sun)`} />
      </g>
      <circle cx="136" cy="86" r="8" fill="#fff" opacity="0.8" />
      <Sparkle x={196} y={54} c="#38BDF8" />
    </>
  ),
  'no-import': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <rect x="62" y="44" width="116" height="96" rx="14" fill={`url(#${id}-paper)`} />
        <path d="M62 58 a14 14 0 0 1 14 -14 h88 a14 14 0 0 1 14 14 v8 h-116Z" fill={`url(#${id}-jade)`} />
      </g>
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="74" y={76 + r * 15} width="26" height="8" rx="3" fill="#E4E6F0" />
          <rect x="106" y={76 + r * 15} width="26" height="8" rx="3" fill="#E4E6F0" />
          <rect x="138" y={76 + r * 15} width="28" height="8" rx="3" fill="#E4E6F0" />
        </g>
      ))}
      <g filter={`url(#${id}-lift)`}>
        <circle cx="178" cy="132" r="22" fill={`url(#${id}-brand)`} />
      </g>
      <path d="M178 142 v-18 m-8 8 l8 -8 l8 8" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle x={50} y={64} />
    </>
  ),
  login: (id) => (
    <>
      <circle cx="120" cy="90" r="84" fill={`url(#${id}-bg)`} />
      <ellipse cx="120" cy="92" rx="92" ry="30" fill="none" stroke="#BFDBFE" strokeWidth="1.5" strokeDasharray="3 6" transform="rotate(-14 120 92)" />
      <Ground id={id} w={80} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M62 120 l58 -14 l58 14 v18 l-58 14 l-58 -14Z" fill={`url(#${id}-mist)`} />
        <path d="M62 120 l58 14 l58 -14" fill="none" stroke="#fff" strokeOpacity="0.5" />
        <path d="M66 104 l54 -12 l54 12 v16 l-54 12 l-54 -12Z" fill={`url(#${id}-brand)`} />
        <path d="M66 104 l54 -12 l54 12 v16 l-54 12 l-54 -12Z" fill={`url(#${id}-shine)`} opacity="0.6" />
      </g>
      <g filter={`url(#${id}-lift)`}>
        <path d="M84 70 l36 -16 l36 16 l-36 16Z" fill="#1E3A8A" />
        <path d="M98 76 v14 c0 6 44 6 44 0 v-14 l-22 10Z" fill="#1E40AF" />
        <path d="M152 72 v20" stroke={`url(#${id}-sun)`} strokeWidth="3" strokeLinecap="round" />
        <circle cx="152" cy="94" r="4" fill={`url(#${id}-sun)`} />
      </g>
      <g filter={`url(#${id}-lift)`}>
        <rect x="170" y="34" width="44" height="34" rx="9" fill={`url(#${id}-paper)`} />
        <path d="M178 58 l8 -8 l7 5 l12 -12" stroke="#22C55E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g filter={`url(#${id}-lift)`}>
        <circle cx="42" cy="66" r="16" fill={`url(#${id}-sky)`} />
        <circle cx="42" cy="66" r="16" fill={`url(#${id}-shine)`} />
      </g>
      <Sparkle x={200} y={112} />
      <Sparkle x={30} y={118} c="#93C5FD" s={0.8} />
    </>
  ),
  'step-profile': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <rect x="62" y="42" width="116" height="100" rx="18" fill={`url(#${id}-paper)`} />
      </g>
      <circle cx="100" cy="82" r="20" fill={`url(#${id}-sun)`} />
      <circle cx="100" cy="82" r="20" fill={`url(#${id}-shine)`} />
      <path d="M78 124 a22 18 0 0 1 44 0Z" fill={`url(#${id}-sun)`} />
      <rect x="132" y="70" width="34" height="7" rx="3.5" fill="#D6D9E8" />
      <rect x="132" y="86" width="24" height="7" rx="3.5" fill="#E4E6F0" />
      <rect x="132" y="102" width="30" height="7" rx="3.5" fill="#E4E6F0" />
      <Sparkle x={186} y={44} c="#38BDF8" />
    </>
  ),
  'step-academic': (id) => SCENES.login(id),
  'step-history': (id) => SCENES['no-marks'](id),
  'step-about': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M120 40 l14 30 l32 4 l-24 22 l7 32 l-29 -16 l-29 16 l7 -32 l-24 -22 l32 -4Z" fill={`url(#${id}-sun)`} />
        <path d="M120 40 l14 30 l32 4 l-24 22 l7 32 l-29 -16 l-29 16 l7 -32 l-24 -22 l32 -4Z" fill={`url(#${id}-shine)`} />
      </g>
      <g filter={`url(#${id}-lift)`}>
        <circle cx="62" cy="120" r="16" fill={`url(#${id}-sky)`} />
        <circle cx="180" cy="116" r="14" fill={`url(#${id}-mist)`} />
      </g>
      <Sparkle x={182} y={56} c="#2563EB" />
      <Sparkle x={56} y={58} c="#22C55E" s={0.8} />
    </>
  ),
  'not-found': (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M44 96 L196 44 L150 150 L120 112 Z" fill={`url(#${id}-brand)`} />
        <path d="M120 112 L196 44 L104 132 Z" fill={`url(#${id}-mist)`} />
        <path d="M44 96 L196 44 L120 112 Z" fill={`url(#${id}-shine)`} opacity="0.6" />
      </g>
      <path d="M40 140 q30 -30 60 -10 t40 -20" stroke="#BFDBFE" strokeWidth="2" strokeDasharray="4 6" fill="none" />
      <Sparkle x={200} y={120} />
      <Dot x={60} y={50} c="#F5B300" />
    </>
  ),
  error: (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <rect x="58" y="74" width="62" height="34" rx="12" fill={`url(#${id}-brand)`} />
        <rect x="120" y="82" width="20" height="6" rx="3" fill="#1D4ED8" />
        <rect x="120" y="94" width="20" height="6" rx="3" fill="#1D4ED8" />
        <rect x="154" y="74" width="34" height="34" rx="12" fill={`url(#${id}-sun)`} />
      </g>
      <path d="M140 72 l6 10 l-6 6 l8 10" stroke="#EF4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={70} y={52} c="#38BDF8" />
    </>
  ),
  success: (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} w={60} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M92 40 h56 v30 a28 28 0 0 1 -56 0Z" fill={`url(#${id}-sun)`} />
        <path d="M92 40 h56 v30 a28 28 0 0 1 -56 0Z" fill={`url(#${id}-shine)`} />
        <path d="M92 48 h-14 a12 12 0 0 0 14 22" stroke="#FDE68A" strokeWidth="6" fill="none" />
        <path d="M148 48 h14 a12 12 0 0 1 -14 22" stroke="#FDE68A" strokeWidth="6" fill="none" />
        <rect x="112" y="96" width="16" height="22" fill="#FDE68A" />
        <rect x="94" y="116" width="52" height="16" rx="6" fill={`url(#${id}-brand)`} />
      </g>
      <Sparkle x={70} y={46} c="#2563EB" />
      <Sparkle x={176} y={40} c="#22C55E" />
      <Dot x={60} y={100} c="#93C5FD" />
      <Dot x={184} y={96} c="#38BDF8" />
      <rect x="168" y="66" width="8" height="8" rx="2" fill="#F5B300" transform="rotate(20 172 70)" />
      <rect x="56" y="74" width="7" height="7" rx="2" fill="#22C55E" transform="rotate(-20 60 78)" />
    </>
  ),
  offline: (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} />
      <g filter={`url(#${id}-lift)`}>
        <path d="M84 116 a30 30 0 0 1 4 -60 a36 36 0 0 1 68 8 a26 26 0 0 1 -4 52Z" fill={`url(#${id}-sky)`} />
        <path d="M84 116 a30 30 0 0 1 4 -60 a36 36 0 0 1 68 8 a26 26 0 0 1 -4 52Z" fill={`url(#${id}-shine)`} />
      </g>
      <path d="M100 136 l40 -40" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
      <Sparkle x={190} y={58} />
    </>
  ),
  locked: (id) => (
    <>
      <Halo id={id} />
      <Ground id={id} w={56} />
      <path d="M100 76 v-14 a20 20 0 0 1 40 0 v14" stroke="#9AA1AE" strokeWidth="10" fill="none" strokeLinecap="round" />
      <g filter={`url(#${id}-lift)`}>
        <rect x="84" y="74" width="72" height="62" rx="16" fill={`url(#${id}-brand)`} />
        <rect x="84" y="74" width="72" height="62" rx="16" fill={`url(#${id}-shine)`} />
      </g>
      <circle cx="120" cy="100" r="8" fill="#fff" />
      <rect x="117" y="104" width="6" height="16" rx="3" fill="#fff" />
      <Sparkle x={176} y={60} c="#F5B300" />
    </>
  ),
}

export function Illustration({
  name,
  className,
  title,
}: {
  name: IllustrationName
  className?: string
  title?: string
}) {
  const id = `il-${React.useId().replace(/:/g, '')}`
  return (
    <svg
      viewBox="0 0 240 176"
      className={cn('h-auto w-full max-w-[240px]', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <Defs id={id} />
      {SCENES[name](id)}
    </svg>
  )
}
