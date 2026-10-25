import Link from 'next/link'
import { CalendarClock, CalendarDays, Download, ExternalLink, Mail, MapPin, Phone, Video } from 'lucide-react'
import { bytes, cn, fmtDate } from '@/lib/utils'
import { MODE_LABEL } from '@/lib/labels'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { NewDot, Pill, ProgressRing } from '@/components/ui/primitives'
import { Icon3D } from '@/components/illustrations/icons3d'
import type { MentorSummary } from '@/server/services/people'
import type { Recommendation, Resource, Session } from '@/server/services/mentoring'

export function MentorCard({ mentor, nextSession, className }: { mentor: MentorSummary | null; nextSession?: Session | null; className?: string }) {
  if (!mentor)
    return (
      <div className={cn('flex h-full flex-col justify-center rounded-[20px] border border-dashed border-line-strong p-5 text-center', className)}>
        <p className="font-medium text-ink-900">No mentor assigned yet</p>
        <p className="mt-1 text-sm text-ink-500">Your HOD assigns mentors. You’ll be notified as soon as it happens.</p>
      </div>
    )
  return (
    <div className={className}>
      <div className="flex items-center gap-3.5">
        <Avatar userId={mentor.id} name={mentor.fullName} hasImage={!!mentor.avatarPath} version={mentor.avatarPath} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{mentor.fullName ?? 'Your mentor'}</p>
          <p className="truncate text-sm text-ink-500">{mentor.designation}</p>
          {mentor.groupName && <p className="text-xs text-ink-500">{mentor.groupName}</p>}
        </div>
      </div>
      {mentor.expertise.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {mentor.expertise.slice(0, 4).map((e) => (
            <Pill key={e} tone="brand">
              {e}
            </Pill>
          ))}
        </div>
      )}
      <ul className="mt-4 space-y-2 text-sm">
        {mentor.officialEmail && (
          <li>
            <a href={`mailto:${mentor.officialEmail}`} className="inline-flex min-h-8 items-center gap-2 text-ink-700 hover:text-primary-700">
              <Mail className="size-4 text-ink-500" /> {mentor.officialEmail}
            </a>
          </li>
        )}
        {mentor.phone && (
          <li>
            <a href={`tel:${mentor.phone.replace(/\s/g, '')}`} className="inline-flex min-h-8 items-center gap-2 text-ink-700 hover:text-primary-700">
              <Phone className="size-4 text-ink-500" /> {mentor.phone}
            </a>
          </li>
        )}
        {nextSession && (
          <li className="inline-flex items-center gap-2 text-ink-700">
            <CalendarClock className="size-4 text-ink-500" /> Next session {fmtDate(nextSession.scheduledAt, 'EEE d MMM, h:mm a')}
          </li>
        )}
      </ul>
      <p className="mt-4 text-xs text-ink-500">Assigned by your HOD · since {fmtDate(mentor.since)}</p>
    </div>
  )
}

export function SessionCard({ session, href, showStudent }: { session: Session; href?: string; showStudent?: boolean }) {
  const d = new Date(session.scheduledAt)
  const Inner = (
    <div className="flex gap-4">
      <div className="grid w-16 shrink-0 place-items-center rounded-xl bg-primary-50 py-2.5 text-center">
        <span className="text-[0.6875rem] font-semibold tracking-wide text-primary-700 uppercase">{fmtDate(d, 'MMM')}</span>
        <span className="num-display text-2xl leading-none font-semibold text-ink-900">{fmtDate(d, 'd')}</span>
        <span className="text-[0.6875rem] text-ink-500">{fmtDate(d, 'EEE')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink-900">{session.agenda || 'Mentoring session'}</p>
        <p className="mt-1 text-sm text-ink-500">
          {fmtDate(d, 'h:mm a')} · {session.durationMin} min · {MODE_LABEL[session.mode]}
        </p>
        {showStudent && <p className="mt-0.5 text-sm text-ink-700">{session.studentName ?? session.groupName ?? 'All mentees'}</p>}
        {session.location && (
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-sm text-ink-700">
            {session.mode === 'ONLINE' ? <Video className="size-4 shrink-0 text-ink-500" /> : <MapPin className="size-4 shrink-0 text-ink-500" />}
            <span className="truncate">{session.location}</span>
          </p>
        )}
      </div>
    </div>
  )
  return href ? (
    <Link href={href} className="block rounded-[16px] p-1 transition-colors hover:bg-surface-muted">
      {Inner}
    </Link>
  ) : (
    Inner
  )
}

const RES_TILE = { 'file-pdf': 'bg-tile-rose', 'file-doc': 'bg-tile-blue', 'file-link': 'bg-tile-green' } as const

export function resourceIcon(r: Pick<Resource, 'mime' | 'externalUrl' | 'hasFile'>) {
  return r.externalUrl && !r.hasFile ? 'file-link' : r.mime === 'application/pdf' ? 'file-pdf' : 'file-doc'
}

export function ResourceTile({ r, href }: { r: Resource; href: string }) {
  const icon = resourceIcon(r)
  return (
    <Link href={href} className="group relative flex h-full flex-col rounded-[24px] bg-surface p-3 shadow-2 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-3">
      <div className={cn('relative grid h-28 place-items-center rounded-[18px]', RES_TILE[icon])}>
        <Icon3D name={icon} size={64} className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-4deg]" />
        {!r.seen && (
          <span className="absolute top-3 right-3 rounded-full bg-surface px-2 py-0.5">
            <NewDot />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
        <p className="line-clamp-2 font-semibold text-ink-900">{r.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-500">{r.instructions || 'No instructions'}</p>
        <p className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs text-ink-500">
          {r.subject && <Pill tone="brand">{r.subject.code}</Pill>}
          <span>
            {r.hasFile ? bytes(r.sizeBytes) : 'Link'} · {fmtDate(r.createdAt, 'd MMM')}
          </span>
        </p>
      </div>
    </Link>
  )
}

export function ResourceActions({ r, className }: { r: Resource; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {r.hasFile && (
        <a href={`/api/resources/${r.id}/download`} className={buttonVariants({ size: 'sm' })}>
          <Download /> Download
        </a>
      )}
      {r.hasFile && (r.mime === 'application/pdf' || r.mime?.startsWith('image/')) && (
        <a href={`/api/resources/${r.id}/download?inline=1`} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
          <ExternalLink /> Preview
        </a>
      )}
      {r.externalUrl && (
        <a href={r.externalUrl} target="_blank" rel="noreferrer noopener" className={buttonVariants({ size: 'sm', variant: r.hasFile ? 'secondary' : 'primary' })}>
          <ExternalLink /> Open link
        </a>
      )}
    </div>
  )
}

export function GoalProgress({ goal }: { goal: Recommendation }) {
  const total = goal.steps.length
  const done = goal.steps.filter((s) => s.done).length
  const pct = goal.status === 'COMPLETED' ? 100 : total ? (done / total) * 100 : goal.status === 'IN_PROGRESS' ? 50 : 0
  return (
    <div className="flex items-center gap-3">
      <ProgressRing value={pct} size={48} stroke={5} label={`${goal.title} progress`} />
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium text-ink-900">{goal.title}</p>
        <p className="text-xs text-ink-500">
          {total ? `${done}/${total} steps` : goal.status === 'COMPLETED' ? 'Completed' : 'No steps yet'}
          {goal.dueDate && (
            <>
              {' · '}
              <CalendarDays className="inline size-3 -translate-y-px" /> {fmtDate(goal.dueDate, 'd MMM')}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
