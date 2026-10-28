/**
 * Runs once when the server starts. Vercel servers run in UTC (and reserve the TZ env var), so pin Node's time zone
 * to the college's: server-rendered clock times then match the browser (no hydration mismatch, no "4:30 AM" sessions).
 */
export function register() {
  process.env.TZ = process.env.NEXT_PUBLIC_TIME_ZONE || 'Asia/Kolkata'
}
