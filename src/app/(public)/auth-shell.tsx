import Link from 'next/link'
import { Scene } from '@/components/illustrations/icons3d'
import { Logo } from '@/components/shell/logo'
import { RotatingFacts } from './rotating-facts'

export function AuthShell({ children, title, accent, subtitle }: { children: React.ReactNode; title: string; accent?: string; subtitle?: string }) {
  return (
    <div className="min-h-dvh bg-canvas p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-24px)] max-w-[1280px] gap-4 sm:min-h-[calc(100dvh-48px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Form side */}
        <div className="flex flex-col rounded-[32px] bg-shell px-4 py-5 sm:px-10 sm:py-8">
          <header>
            <Link href="/" aria-label="Mentora home">
              <Logo />
            </Link>
          </header>
          {/* Phone banner */}
          <div aria-hidden className="relative mt-5 overflow-hidden rounded-[24px] bg-gradient-hero lg:hidden">
            <Scene name="campus-morning" />
          </div>
          <main id="main" className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8">
            <div className="rounded-[24px] bg-surface p-6 shadow-2 sm:p-8">
              <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink-900">
                {title} {accent && <span className="text-primary-600">{accent}</span>}
              </h1>
              {subtitle && <p className="mt-2 text-base text-ink-500">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>
            <p className="mt-6 text-center text-xs text-ink-500">Students can create an account; mentors and HODs are invited by the college.</p>
          </main>
        </div>

        {/* Visual side */}
        <aside aria-hidden className="relative hidden flex-col overflow-hidden rounded-[32px] bg-gradient-hero p-10 text-white shadow-hero lg:flex">
          <svg viewBox="0 0 600 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d="M80 640 C200 420 360 330 640 300 L640 360 C390 380 250 470 160 640Z" fill="#FFFFFF" opacity="0.12" />
            <circle cx="520" cy="80" r="140" fill="#FFFFFF" opacity="0.06" />
          </svg>
          <div className="relative">
            <p className="text-sm font-semibold text-white/90">Mentora</p>
            <p className="mt-2 max-w-md text-[2rem] leading-tight font-semibold tracking-tight">Mentoring that you can see working.</p>
          </div>
          <div className="relative mt-8">
            <RotatingFacts />
          </div>
          <div className="relative -mx-10 mt-auto -mb-10">
            <Scene name="campus-morning" />
          </div>
        </aside>
      </div>
    </div>
  )
}
