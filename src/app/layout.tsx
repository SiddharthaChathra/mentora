import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Mentora · Mentoring, made measurable', template: '%s · Mentora' },
  description:
    'Mentora connects student performance, faculty guidance and measurable progress — a secure mentor–mentee platform for students, mentors and HODs.',
  applicationName: 'Mentora',
  openGraph: { title: 'Mentora', description: 'Mentoring, made measurable.', type: 'website' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#EEF2F9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const lowBandwidth = jar.get('m_lowbw')?.value === '1'
  return (
    <html
      lang="en-IN"
      data-low-bandwidth={lowBandwidth ? 'true' : 'false'}
      className={jakarta.variable}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-3"
        >
          Skip to content
        </a>
        <Providers lowBandwidth={lowBandwidth}>{children}</Providers>
      </body>
    </html>
  )
}
