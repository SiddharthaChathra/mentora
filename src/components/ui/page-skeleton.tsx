import { Skeleton } from './primitives'

/** Route-level skeleton that mirrors the v2 layouts card-for-card (UX2-15), so content lands without a jump. */
export function PageSkeleton({ kpis = 3, variant = 'dashboard' }: { kpis?: number; variant?: 'dashboard' | 'list' | 'profile' }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-[fade-up_200ms_var(--ease-out)]">
      <span className="sr-only">Loading…</span>
      {variant === 'profile' ? (
        <>
          <div className="flex items-center gap-5 rounded-[24px] bg-primary-100 p-6">
            <Skeleton className="size-24 rounded-full bg-white/60" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-56 bg-white/60" />
              <div className="flex gap-2">
                {[80, 110, 90, 140].map((w) => (
                  <Skeleton key={w} className="h-6 rounded-full bg-white/60" style={{ width: w }} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2 rounded-full bg-surface p-1.5 shadow-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        </>
      ) : (
        <div className="mb-6 space-y-2.5">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      )}

      {variant === 'dashboard' && (
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-[220px] rounded-[24px] bg-primary-100 lg:col-span-4" />
          <div className="grid gap-4 rounded-[24px] bg-surface p-4 shadow-2 sm:grid-cols-3 lg:col-span-8">
            {Array.from({ length: kpis }).map((_, i) => (
              <div key={i} className="rounded-[20px] bg-surface-muted p-5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="mt-5 h-9 w-16" />
                <Skeleton className="mt-4 h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <div className="rounded-[24px] bg-surface p-6 shadow-2 lg:col-span-8">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
          <div className="mt-8 flex h-52 items-end gap-3">
            {[60, 80, 45, 90, 70, 55, 85, 65].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-[12px]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-[24px] bg-surface p-6 shadow-2 lg:col-span-4">
          <Skeleton className="h-5 w-40" />
          {variant === 'list' ? (
            <div className="mt-5 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Skeleton className="mx-auto mt-8 size-40 rounded-full" />
              <div className="mt-6 space-y-2.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
