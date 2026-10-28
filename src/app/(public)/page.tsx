import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, CheckCircle2, FileLock2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Icon3D, type Icon3DName } from '@/components/illustrations/icons3d'
import { Logo } from '@/components/shell/logo'
import { HeroComposition } from './hero-composition'

export const metadata: Metadata = { title: 'Mentora · Mentoring, made measurable' }

const ROLES: { eyebrow: string; title: string; body: string; points: string[]; icon: Icon3DName; tile: string }[] = [
  {
    eyebrow: 'For students',
    title: 'See your progress, not just your marks',
    body: 'A guided profile, semester-wise records, clear SGPA and CGPA trends and an improvement plan you can follow, with your mentor’s feedback in one place.',
    points: ['Fast marks entry that saves as you type', 'Strengths and focus areas, with the evidence', 'New feedback and resources, clearly marked'],
    icon: 'credits',
    tile: 'bg-tile-blue',
  },
  {
    eyebrow: 'For mentors',
    title: 'Every assigned mentee, understood at a glance',
    body: 'Transparent analytics, structured recommendations with statuses and dates, study material, sessions and a professional PDF report, only for students assigned to you.',
    points: ['Needs-attention list with explained reasons', 'Goals, action points and follow-ups', 'One-click verified PDF report'],
    icon: 'feedback',
    tile: 'bg-tile-green',
  },
  {
    eyebrow: 'For HODs',
    title: 'Your whole branch, structured and accountable',
    body: 'Assign and rebalance mentors with drag and drop, track coverage and workload, find students who need intervention and keep a complete audit history.',
    points: ['Mentoring hierarchy and coverage', 'Bulk import with preview and validation', 'Grading schemes and risk rules you control'],
    icon: 'coverage',
    tile: 'bg-tile-peach',
  },
  {
    eyebrow: 'For the Principal',
    title: 'The whole college, branch by branch',
    body: 'Every student grouped by branch, branch-by-branch comparisons and health, HOD appointments and branch transfers — read-only on student records, so ownership stays clear.',
    points: ['College coverage and branch health at a glance', 'Appoint HODs and approve branch transfers', 'Branches compared — students never ranked'],
    icon: 'mentees',
    tile: 'bg-tile-lilac',
  },
]

const SECURITY = [
  { icon: LockKeyhole, title: 'Row-level security', body: 'Access rules live in the database. Mentors only ever see students actively assigned to them.' },
  { icon: KeyRound, title: 'Roles you can trust', body: 'Students sign up as students only, in the branch named by their USN. HODs see only their branch; HOD appointments and roles change through an audited flow.' },
  { icon: FileLock2, title: 'Private files', body: 'Uploads stay private and are served through short-lived links after a permission check.' },
  { icon: ShieldCheck, title: 'Full audit trail', body: 'Changes to marks, CGPA, assignments and mentoring records record who, what and when.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas p-3 sm:p-5">
      <div className="mx-auto max-w-[1360px]">
        <header className="sticky top-3 z-30 mb-4 flex h-16 items-center justify-between rounded-full bg-surface/95 px-4 shadow-2 backdrop-blur-xl sm:px-6">
          <Link href="/" aria-label="Mentora home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <a href="#roles" className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-ink-700 hover:bg-surface-muted sm:inline-flex">
              Product
            </a>
            <a href="#security" className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-ink-700 hover:bg-surface-muted sm:inline-flex">
              Security
            </a>
            <Link href="/login" className={buttonVariants({ size: 'sm' })}>
              Sign in <ArrowRight />
            </Link>
          </nav>
        </header>

        <main id="main">
          {/* Hero */}
          <section className="relative isolate overflow-hidden rounded-[32px] bg-gradient-hero px-6 py-14 text-white shadow-hero sm:px-12 lg:py-20">
            <svg aria-hidden viewBox="0 0 1200 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
              <path d="M200 640 C420 420 700 330 1240 290 L1240 360 C760 380 520 470 340 640Z" fill="#FFFFFF" opacity="0.12" />
              <circle cx="1080" cy="60" r="220" fill="#FFFFFF" opacity="0.06" />
            </svg>
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
              <div className="stagger">
                <span className="frost inline-flex h-8 items-center rounded-full px-4 text-sm font-semibold">Smart mentor–mentee management</span>
                <h1 className="mt-6 text-[2.75rem] leading-[1.05] font-bold tracking-tight !text-white sm:text-[3.75rem]">Mentoring, made measurable.</h1>
                <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-white/90">Mentora connects student performance, faculty guidance and measurable progress in one secure, clear workspace for students, mentors and HODs.</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-base font-semibold text-primary-700 shadow-3 hover:bg-primary-50">
                    Sign in to Mentora <ArrowRight className="size-4" />
                  </Link>
                  <a href="#roles" className="frost inline-flex h-12 items-center rounded-full px-6 text-base font-semibold text-white hover:brightness-125">
                    See how it works
                  </a>
                </div>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
                  {['Free student sign-up', 'Verified academic records', 'Built for phones too'].map((t) => (
                    <li key={t} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <HeroComposition />
            </div>
          </section>

          {/* Roles */}
          <section id="roles" className="py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">One platform, three roles</p>
              <h2 className="mt-3 text-[2rem] font-bold tracking-tight text-ink-900 sm:text-[2.5rem]">Built around the mentee profile</h2>
              <p className="mt-3 text-lg text-ink-500">After sign-in, Mentora recognises your role on the server and takes you straight to the workspace made for you.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {ROLES.map((r) => (
                <article key={r.title} className="flex flex-col rounded-[24px] bg-surface p-6 shadow-2 sm:p-8">
                  <div className={`grid size-20 place-items-center rounded-[20px] ${r.tile}`}>
                    <Icon3D name={r.icon} size={56} />
                  </div>
                  <p className="eyebrow mt-6">{r.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink-900">{r.title}</h3>
                  <p className="mt-2 text-ink-700">{r.body}</p>
                  <ul className="mt-5 space-y-2">
                    {r.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-ink-700">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-500" /> {p}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Privacy band */}
          <section id="security" className="rounded-[32px] bg-surface px-6 py-14 shadow-2 sm:px-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow">Security & privacy</p>
                <h2 className="mt-3 max-w-xl text-[2rem] font-bold tracking-tight text-ink-900">Student data, protected at every layer</h2>
              </div>
              <Icon3D name="coverage" size={88} className="hidden md:block" />
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SECURITY.map((s) => (
                <div key={s.title} className="rounded-[20px] bg-surface-muted p-5">
                  <span className="grid size-10 place-items-center rounded-[12px] bg-primary-600 text-white">
                    <s.icon className="size-5" />
                  </span>
                  <p className="mt-4 font-semibold text-ink-900">{s.title}</p>
                  <p className="mt-1.5 text-sm text-ink-700">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 text-center">
            <h2 className="text-[2rem] font-bold tracking-tight text-ink-900">Ready when your college is.</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-500">Accounts are created by your HOD. Check your inbox for an invitation, or sign in if you already have one.</p>
            <Link href="/login" className={`${buttonVariants({ size: 'lg' })} mt-8`}>
              Sign in <ArrowRight />
            </Link>
          </section>
        </main>

        <footer className="flex flex-col items-center justify-between gap-3 rounded-full bg-surface px-6 py-5 text-sm text-ink-500 shadow-2 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Mentora · Built for academic mentoring</p>
        </footer>
      </div>
    </div>
  )
}
