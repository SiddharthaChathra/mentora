import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AlertTriangle, CalendarDays, ClipboardCheck, Users } from 'lucide-react'
import { HeroStatCard, IllustratedScoreCard, PastelStatTile, StatBanner } from '@/components/ui/display'
import {
  Card,
  CardBody,
  CardHeader,
  DeltaChip,
  NewDot,
  Pill,
  ProgressBar,
  ProgressRing,
  Skeleton,
  StatusPill,
} from '@/components/ui/primitives'
import { Illustration, type IllustrationName } from '@/components/illustrations'
import { Icon3D, Scene, type Icon3DName } from '@/components/illustrations/icons3d'
import { EmptyState, NotEnoughData } from '@/components/ui/states'
import { Logo } from '@/components/shell/logo'
import { CreditProgress, SgpaTrend } from '@/components/charts/academic'
import {
  DonutWithTotal,
  MiniCalendar,
  ScheduleCards,
  StackedRoundedBarChart,
} from '@/components/charts/dashboard'
import { StyleguideInteractive, StyleguideTable } from './interactive'

export const metadata: Metadata = { title: 'Styleguide', robots: { index: false } }

const COLORS = [
  ['canvas', '#EEF2F9'],
  ['shell', '#F7F9FD'],
  ['surface', '#FFFFFF'],
  ['line', '#E6EAF2'],
  ['ink-900', '#0F172A'],
  ['ink-700', '#334155'],
  ['ink-500', '#55647A'],
  ['primary-600', '#2563EB'],
  ['primary-100', '#DBEAFE'],
  ['tile-blue', '#E3EEFD'],
  ['tile-green', '#E8F4E1'],
  ['tile-peach', '#FDEEDD'],
  ['tile-lilac', '#EEEAFD'],
  ['tile-rose', '#FDE7EA'],
]
const ICONS: Icon3DName[] = [
  'credits',
  'goals',
  'subjects',
  'sessions',
  'feedback',
  'resources',
  'mentees',
  'attention',
  'coverage',
  'import',
  'report',
  'wave',
]
const ILLUSTRATIONS: IllustrationName[] = [
  'no-marks',
  'no-feedback',
  'no-resources',
  'no-sessions',
  'no-mentees',
  'no-notifications',
  'no-results',
  'no-import',
  'not-found',
  'error',
  'success',
  'offline',
]

/** Dev-only visual reference for DESIGN.md v2 "Sky Dashboard". Sample values are illustrative only. */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="bg-canvas min-h-dvh p-3 sm:p-6">
      <main id="main" className="bg-shell mx-auto max-w-[1360px] space-y-10 rounded-[32px] p-5 sm:p-8">
        <header>
          <Logo />
          <h1 className="text-ink-900 mt-6 text-[1.75rem] font-bold tracking-tight">
            Sky Dashboard · DESIGN.md v2
          </h1>
          <p className="text-ink-500 mt-1 text-base">
            Tokens, type, components, data graphics and illustrations.
          </p>
        </header>

        <section>
          <h2 className="eyebrow mb-4">Color tokens</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {COLORS.map(([n, h]) => (
              <li key={n} className="bg-surface shadow-2 overflow-hidden rounded-[16px]">
                <div className="h-14" style={{ background: h }} />
                <div className="p-2.5">
                  <p className="text-ink-900 text-xs font-semibold">{n}</p>
                  <p className="num text-ink-500 text-[0.6875rem]">{h}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <HeroStatCard
            className="lg:col-span-4"
            label="Average SGPA of my mentees"
            value={7.84}
            decimals={2}
            delta={{ value: 0.21, label: 'vs last sem' }}
            cta={{ label: 'Review mentees', href: '#' }}
          />
          <div className="bg-surface shadow-2 grid gap-4 rounded-[24px] p-4 sm:grid-cols-3 lg:col-span-8">
            <PastelStatTile
              label="Needs attention"
              value={4}
              tile="rose"
              icon={<AlertTriangle />}
              helper="Top reason: declining SEE marks"
            />
            <PastelStatTile
              label="Pending follow-ups"
              value={7}
              tile="peach"
              icon={<ClipboardCheck />}
              helper="3 overdue"
            />
            <PastelStatTile
              label="Sessions this week"
              value={5}
              tile="green"
              icon={<CalendarDays />}
              delta={{ value: 2, label: 'vs last week', decimals: 0 }}
            />
          </div>
        </section>

        <StatBanner
          stats={[
            {
              icon: 'credits',
              label: 'Credits earned',
              value: '74 / 160',
              pct: 46,
              helper: '22 more credits in progress',
            },
            {
              icon: 'goals',
              label: 'Goals completed',
              value: '4 / 5',
              pct: 80,
              helper: '1 more goal to finish',
            },
            {
              icon: 'subjects',
              label: 'Subjects · Sem 5',
              value: '5 / 6',
              pct: 83,
              helper: '1 result still pending',
            },
          ]}
        />

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SgpaTrend
              semesters={[
                { semesterNo: 1, sgpa: 7.6 },
                { semesterNo: 2, sgpa: 7.9 },
                { semesterNo: 3, sgpa: 7.4 },
                { semesterNo: 4, sgpa: 8.6 },
                { semesterNo: 5, sgpa: 8.9 },
              ]}
            />
          </div>
          <IllustratedScoreCard
            className="lg:col-span-4"
            label="CGPA"
            help="CGPA"
            value={8.12}
            caption="Across 5 semesters · 92 credits · Best: Sem 5 (8.90)"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <StackedRoundedBarChart
              title="Subject Performance Overview"
              description="Average MSE % vs SEE %"
              series={[
                { key: 'mse', label: 'MSE %', color: 'var(--chart-1)' },
                { key: 'see', label: 'SEE %', color: 'var(--chart-2)' },
              ]}
              rows={[
                { label: 'CS302', values: { mse: 78, see: 71 } },
                { label: 'CS303', values: { mse: 64, see: 72 } },
                { label: 'MAT301', values: { mse: 55, see: 49 } },
                { label: 'CS304', values: { mse: 81, see: 84 } },
                { label: 'CS305', values: { mse: 70, see: 66 } },
              ]}
            />
          </div>
          <div className="lg:col-span-4">
            <DonutWithTotal
              title="Recommendation Summary"
              views={[
                {
                  key: 'all',
                  label: 'Overall',
                  slices: [
                    { key: 'c', label: 'Completed', value: 18, color: 'var(--chart-2)' },
                    { key: 'i', label: 'In progress', value: 9, color: 'var(--chart-1)' },
                    { key: 'p', label: 'Pending', value: 6, color: 'var(--chart-4)' },
                  ],
                },
                {
                  key: 'm',
                  label: 'This month',
                  slices: [
                    { key: 'c', label: 'Completed', value: 4, color: 'var(--chart-2)' },
                    { key: 'i', label: 'In progress', value: 3, color: 'var(--chart-1)' },
                  ],
                },
              ]}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <StyleguideTable />
          </div>
          <div className="space-y-4 lg:col-span-4">
            <MiniCalendar marked={['2026-10-27']} />
            <ScheduleCards
              empty={null}
              items={[
                {
                  id: '1',
                  kind: 'session',
                  date: '2026-10-27T10:00:00Z',
                  title: 'Progress check',
                  sub: 'Sample mentor',
                },
                { id: '2', kind: 'goal', date: '2026-11-04T04:00:00Z', title: 'Finish 3 practice papers' },
              ]}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Typography" />
            <CardBody className="space-y-3">
              <p className="text-ink-900 text-[1.75rem] font-semibold tracking-tight">Page title 28/36</p>
              <p className="text-ink-900 text-lg font-semibold">Card title 17/24</p>
              <p className="text-ink-700 text-base">
                Body 14/22 in Plus Jakarta Sans, with tabular numbers everywhere: 8.42 · 42/50.
              </p>
              <p className="text-ink-500 text-sm">Helper 13/20</p>
              <p className="eyebrow">Table header 11/16</p>
              <p className="num-display text-ink-900 text-5xl font-semibold">52</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Components" />
            <CardBody>
              <StyleguideInteractive />
            </CardBody>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="eyebrow">Pills, chips, progress</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'PENDING',
              'IN_PROGRESS',
              'COMPLETED',
              'VERIFIED',
              'DRAFT',
              'CHANGE_REQUESTED',
              'SUBMITTED',
              'FAIL',
            ].map((s) => (
              <StatusPill key={s} status={s} />
            ))}
            <DeltaChip value={0.3} label="vs Sem 4" />
            <DeltaChip value={-0.42} label="vs Sem 3" />
            <Pill tone="outline">Outline</Pill>
            <NewDot />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing value={68} label="Example" />
            <ProgressBar value={82} tone="auto" showValue label="Example" className="w-60" />
            <ProgressBar value={61} tone="auto" showValue label="Example" className="w-60" />
            <ProgressBar value={34} tone="auto" showValue label="Example" className="w-60" />
            <Skeleton className="h-10 w-40" />
          </div>
          <CreditProgress earned={76} inProgress={22} required={160} className="max-w-md" />
        </section>

        <section>
          <h2 className="eyebrow mb-4">3D icons</h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-12">
            {ICONS.map((n) => (
              <li key={n} className="bg-surface shadow-2 flex flex-col items-center gap-2 rounded-[16px] p-3">
                <Icon3D name={n} size={56} />
                <span className="text-ink-500 text-[0.6875rem]">{n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {(['sky-path', 'campus-morning', 'summit'] as const).map((n) => (
            <div key={n} className="bg-gradient-hero shadow-hero overflow-hidden rounded-[24px]">
              <p className="p-4 text-sm font-semibold text-white">{n}</p>
              <Scene name={n} />
            </div>
          ))}
        </section>

        <section>
          <h2 className="eyebrow mb-4">States & empty-state illustrations</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <EmptyState
                illustration="no-marks"
                title="No marks yet"
                description="Add your first semester to see trends."
              />
            </Card>
            <Card>
              <CardBody>
                <NotEnoughData reason="SGPA not calculated: 2 subjects missing grade points (MA302, PH101)" />
              </CardBody>
            </Card>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {ILLUSTRATIONS.map((n) => (
              <li key={n} className="bg-surface shadow-2 rounded-[16px] p-3 text-center">
                <Illustration name={n} className="mx-auto" />
                <p className="text-ink-500 mt-1 text-[0.6875rem]">{n}</p>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-ink-500 text-xs">
          <Users className="inline size-3.5" /> Sample values on this page are illustrative; product screens
          use real data only.
        </p>
      </main>
    </div>
  )
}
