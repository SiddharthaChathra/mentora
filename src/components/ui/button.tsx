import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** v2 buttons: pill shapes. Primary = blue pill; secondary/outline = white pill with line ("See More", "AI Assistant"). */
export const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold select-none transition-[background,box-shadow,transform,color,border-color] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-on-primary shadow-[0_8px_20px_-8px_rgb(37_99_235/0.55)] hover:bg-primary-700',
        secondary: 'border border-line bg-surface text-ink-900 hover:border-primary-300 hover:text-primary-700',
        ghost: 'text-ink-700 hover:bg-surface-muted hover:text-ink-900',
        soft: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
        destructive: 'bg-danger-600 text-white shadow-[0_8px_20px_-8px_rgb(220_38_38/0.55)] hover:bg-danger-700',
        link: 'h-auto rounded-none px-0 text-primary-600 underline-offset-4 hover:underline',
        frost: 'frost text-white hover:brightness-125',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-md',
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  )
}
