import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmt2 = (n: number | null | undefined) => (n == null ? '—' : Number(n).toFixed(2))
export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export function fmtDate(d: string | Date | null | undefined, pattern = 'd MMM yyyy') {
  if (!d) return '—'
  return format(new Date(d), pattern)
}

/** College time zone for clock times, so server (UTC on Vercel) and browser render the same text. */
export const COLLEGE_TZ = process.env.NEXT_PUBLIC_TIME_ZONE || 'Asia/Kolkata'

/** e.g. "28 Oct 2026, 09:05" (+":ss" with seconds) in the college time zone. */
export function fmtDateTime(d: string | Date | null | undefined, opts: { seconds?: boolean } = {}) {
  if (!d) return '—'
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: COLLEGE_TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(d))
      .map((x) => [x.type, x.value]),
  )
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}${opts.seconds ? `:${parts.second}` : ''}`
}

export function fmtRelative(d: string | Date | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter((p) => !/^(dr|prof|mr|ms|mrs)\.?$/i.test(p))
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?'
}

/** Deterministic pastel gradient seed for avatar fallbacks. */
export function hashHue(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % 360
}

export function firstName(name: string | null | undefined) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter((p) => !/^(dr|prof|mr|ms|mrs)\.?$/i.test(p))
  return parts[0] ?? ''
}

export function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(now))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const humanize = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export function bytes(n: number | null | undefined) {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
