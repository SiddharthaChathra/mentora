import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Illustration, type IllustrationName } from '@/components/illustrations'
import { Logo } from '@/components/shell/logo'

export function SystemPage({
  code,
  title,
  description,
  illustration,
  actions,
}: {
  code?: string
  title: string
  description: string
  illustration: IllustrationName
  actions?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas p-3 sm:p-6">
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col rounded-[32px] bg-shell">
        <header className="px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Mentora home">
            <Logo />
          </Link>
        </header>
        <main id="main" className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
          <div className="rounded-[32px] bg-surface p-6 shadow-2">
            <Illustration name={illustration} className="max-w-[260px]" />
          </div>
          {code && <p className="num mt-6 text-sm font-bold tracking-widest text-primary-600">{code}</p>}
          <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-3 text-base text-ink-500">{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {actions ?? (
              <Link href="/dashboard" className={buttonVariants({ size: 'lg' })}>
                Go to my dashboard
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
