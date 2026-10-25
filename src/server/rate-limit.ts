import 'server-only'
import { headers } from 'next/headers'
import { AppError } from './handle'

// Fixed-window limiter. In-memory per server instance: good enough as a brake on brute force
// alongside Supabase Auth's own rate limits. Swap for a shared store (e.g. Upstash) at scale.
const buckets = new Map<string, { count: number; resetAt: number }>()

export async function clientIp() {
  const h = await headers()
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim()
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const ip = await clientIp()
  const k = `${key}:${ip}`
  const now = Date.now()
  const b = buckets.get(k)
  if (!b || b.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs })
    return
  }
  b.count++
  if (b.count > limit) {
    const mins = Math.ceil((b.resetAt - now) / 60000)
    throw new AppError('RATE_LIMITED', `Too many attempts. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again.`)
  }
}
