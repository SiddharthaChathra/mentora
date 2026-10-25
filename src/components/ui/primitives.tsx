import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// ───────────────────────────── Card (white, 24px radius, soft blue-tinted shadow) ─────────────────────────────
export function Card({ className, interactive, ...props }: React.ComponentProps<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'relative rounded-[24px] bg-surface shadow-2',
        interactive && 'transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-3',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  eyebrow,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode
  eyebrow?: string
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-primary-50 text-primary-600 [&_svg]:size-[18px]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />
}

// ───────────────────────────── Pills & chips ─────────────────────────────
export const pillVariants = cva('inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-muted text-ink-700',
      brand: 'bg-primary-100 text-primary-700',
      solid: 'bg-primary-600 text-white',
      accent: 'bg-accent-100 text-accent-700',
      success: 'bg-success-100 text-success-700',
      warning: 'bg-warning-100 text-warning-700',
      danger: 'bg-danger-100 text-danger-700',
      info: 'bg-info-100 text-info-700',
      outline: 'border border-line bg-surface text-ink-700',
    },
    size: { sm: 'h-6 px-2.5 text-xs', md: 'h-7 px-3 text-xs' },
  },
  defaultVariants: { tone: 'neutral', size: 'sm' },
})

const DOT: Record<string, string> = {
  neutral: 'bg-ink-400',
  brand: 'bg-primary-600',
  solid: 'bg-white',
  accent: 'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  outline: 'bg-ink-400',
}

export function Pill({ className, tone, size, dot, children, ...props }: React.ComponentProps<'span'> & VariantProps<typeof pillVariants> & { dot?: boolean }) {
  return (
    <span className={cn(pillVariants({ tone, size }), className)} {...props}>
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', DOT[tone ?? 'neutral'])} />}
      {children}
    </span>
  )
}

type Tone = NonNullable<VariantProps<typeof pillVariants>['tone']>

/** v2 status colors: Pending amber · In progress blue · Completed green · Verified blue-solid · Draft grey · Change requested peach. */
export const STATUS_TONE: Record<string, { tone: Tone; label: string }> = {
  PENDING: { tone: 'warning', label: 'Pending' },
  IN_PROGRESS: { tone: 'brand', label: 'In progress' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  VERIFIED: { tone: 'solid', label: 'Verified' },
  FINALIZED: { tone: 'solid', label: 'Finalized' },
  SUBMITTED: { tone: 'info', label: 'Submitted' },
  DRAFT: { tone: 'neutral', label: 'Draft' },
  CHANGE_REQUESTED: { tone: 'accent', label: 'Change requested' },
  APPROVED: { tone: 'success', label: 'Approved' },
  REJECTED: { tone: 'danger', label: 'Rejected' },
  SCHEDULED: { tone: 'brand', label: 'Scheduled' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
  ACTIVE: { tone: 'success', label: 'Active' },
  INVITED: { tone: 'warning', label: 'Invited' },
  SUSPENDED: { tone: 'danger', label: 'Suspended' },
  PASS: { tone: 'success', label: 'Pass' },
  FAIL: { tone: 'danger', label: 'Fail' },
  ABSENT: { tone: 'danger', label: 'Absent' },
  OPEN: { tone: 'warning', label: 'Open' },
  RESOLVED: { tone: 'success', label: 'Resolved' },
  PREVIEW: { tone: 'info', label: 'Preview' },
  COMMITTED: { tone: 'success', label: 'Committed' },
  FAILED: { tone: 'danger', label: 'Failed' },
}

export function StatusPill({ status, className, label }: { status: string; className?: string; label?: string }) {
  const s = STATUS_TONE[status] ?? { tone: 'neutral' as Tone, label: status }
  return (
    <Pill tone={s.tone} dot className={className}>
      {label ?? s.label}
    </Pill>
  )
}

/** Delta chip: arrow + color + text, always says what it compares ("+0.30 vs Sem 4"). */
export function DeltaChip({ value, label, decimals = 2, positiveIsGood = true, className }: { value: number; label?: string; decimals?: number; positiveIsGood?: boolean; className?: string }) {
  const up = value > 0
  const flat = value === 0
  const good = flat ? null : up === positiveIsGood
  return (
    <span
      className={cn(
        'num inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold',
        good == null ? 'bg-surface-muted text-ink-700' : good ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700',
        className,
      )}
    >
      <span aria-hidden>{flat ? '→' : up ? '↑' : '↓'}</span>
      {up ? '+' : ''}
      {value.toFixed(decimals)}
      {label && <span className="font-medium opacity-80">{label}</span>}
    </span>
  )
}

export function NewDot({ label = 'New' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold tracking-wide text-danger-700 uppercase">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger-500 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-danger-500" />
      </span>
      {label}
    </span>
  )
}

// ───────────────────────────── Icon badge (12px radius) ─────────────────────────────
const CHIP: Record<string, string> = {
  brand: 'bg-primary-600 text-white',
  accent: 'bg-badge-peach text-white',
  success: 'bg-badge-green text-white',
  warning: 'bg-badge-peach text-white',
  danger: 'bg-badge-rose text-white',
  info: 'bg-info-500 text-white',
  neutral: 'bg-surface-muted text-ink-700',
  violet: 'bg-badge-lilac text-white',
  soft: 'bg-primary-50 text-primary-600',
}

export function IconChip({
  icon: Icon,
  tone = 'soft',
  size = 'md',
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tone?: keyof typeof CHIP
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const s = size === 'sm' ? 'size-8 rounded-[10px] [&_svg]:size-4' : size === 'lg' ? 'size-12 rounded-[14px] [&_svg]:size-6' : 'size-10 rounded-[12px] [&_svg]:size-5'
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center', s, CHIP[tone], className)}>
      <Icon strokeWidth={2} />
    </span>
  )
}

// ───────────────────────────── Skeleton ─────────────────────────────
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden className={cn('skeleton', className)} {...props} />
}

// ───────────────────────────── Progress ─────────────────────────────
export const progressTone = (pct: number) => (pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger')

export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  label,
  showValue,
  className,
}: {
  value: number
  max?: number
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'auto'
  label: string
  showValue?: boolean
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const t = tone === 'auto' ? progressTone(pct) : tone
  const fill = { brand: 'bg-primary-600', success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500', accent: 'bg-accent-500' }[t]
  const bar = (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} className={cn('h-2 w-full overflow-hidden rounded-full bg-chart-track', !showValue && className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
  if (!showValue) return bar
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {bar}
      <span className="num w-10 shrink-0 text-right text-xs font-semibold text-ink-900">{Math.round(pct)}%</span>
    </div>
  )
}

export function ProgressRing({ value, size = 56, stroke = 6, label, children, className }: { value: number; size?: number; stroke?: number; label: string; children?: React.ReactNode; className?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary-600)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children ?? <span className="num text-xs font-semibold text-ink-900">{Math.round(pct)}%</span>}</div>
    </div>
  )
}

// ───────────────────────────── Misc ─────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] border border-line bg-surface px-1 text-[0.6875rem] font-semibold text-ink-500">{children}</kbd>
}

export function DefinitionList({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="eyebrow">{i.label}</dt>
          <dd className="mt-1 text-sm break-words text-ink-900">{i.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
