'use client'

import * as React from 'react'
import { cn, hashHue, initials } from '@/lib/utils'

const SIZES = { xs: 'size-7 text-[0.625rem]', sm: 'size-9 text-xs', md: 'size-11 text-sm', lg: 'size-14 text-base', xl: 'size-24 text-2xl' }

/**
 * Avatars live in a private bucket; /api/avatars/[id] checks access and streams the image.
 * Fallback: initials on a deterministic pastel gradient.
 */
export function Avatar({
  userId,
  name,
  hasImage,
  version,
  size = 'md',
  ring,
  className,
}: {
  userId: string
  name: string | null | undefined
  hasImage?: boolean
  version?: string | null
  size?: keyof typeof SIZES
  ring?: boolean
  className?: string
}) {
  const [failed, setFailed] = React.useState(false)
  const hue = hashHue(userId)
  const showImg = hasImage && !failed
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl font-semibold text-ink-900 select-none',
        ring && 'ring-2 ring-offset-2 ring-offset-surface [--tw-ring-color:#3B82F6]',
        SIZES[size],
        className,
      )}
      style={
        showImg
          ? undefined
          : { background: `linear-gradient(135deg, hsl(${hue} 85% 88%), hsl(${(hue + 40) % 360} 80% 80%))` }
      }
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/avatars/${userId}${version ? `?v=${encodeURIComponent(version)}` : ''}`}
          alt={name ? `${name}` : 'Profile photo'}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={name ?? undefined}>{initials(name)}</span>
      )}
    </span>
  )
}

export function AvatarStack({ people, max = 4 }: { people: { id: string; name: string | null; hasImage?: boolean }[]; max?: number }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} userId={p.id} name={p.name} hasImage={p.hasImage} size="xs" className="ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span className="grid size-7 place-items-center rounded-2xl bg-surface-muted text-[0.625rem] font-semibold text-ink-700 ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </div>
  )
}
