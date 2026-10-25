import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const isDev = process.env.NODE_ENV !== 'production'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseUrl}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace(/^http/, 'ws')}`,
  `frame-src 'self' blob: ${supabaseUrl}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  // Never print server-action arguments (they include passwords and student data).
  logging: { serverFunctions: false },
  agentRules: false,
  serverExternalPackages: ['@react-pdf/renderer', 'exceljs', 'pdf-parse', 'sharp'],
  // PDF fonts are read from disk at runtime; make sure they ship with the serverless bundle.
  outputFileTracingIncludes: { '/api/reports/**': ['./src/server/report/fonts/**'], '/api/exports/**': ['./src/server/report/fonts/**'] },
  images: {
    remotePatterns: [new URL(`${supabaseUrl}/storage/v1/**`)],
  },
  experimental: {
    serverActions: { bodySizeLimit: '26mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
