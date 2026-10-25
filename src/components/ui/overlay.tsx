'use client'

import * as React from 'react'
import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

// ───────────────────────────── Dialog (bottom sheet on phones) ─────────────────────────────
export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

export function DialogContent({
  title,
  description,
  children,
  className,
  size = 'md',
  footer,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}) {
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size]
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-900/35 backdrop-blur-[2px] data-[state=open]:animate-[fade-up_200ms_var(--ease-out)]" />
      <D.Content
        className={cn(
          'fixed z-50 flex max-h-[92dvh] w-full flex-col bg-surface shadow-3 outline-none',
          // phone: bottom sheet
          'inset-x-0 bottom-0 rounded-t-[28px] pb-safe data-[state=open]:animate-[fade-up_320ms_var(--ease-out)]',
          // tablet+: centered dialog
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] sm:pb-0',
          width,
          className,
        )}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2 sm:px-6 sm:pt-6">
          <div>
            <D.Title className="text-xl font-semibold text-ink-900">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-ink-500">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-2">
              <X />
            </Button>
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-[24px] sm:px-6">
            {footer}
          </div>
        )}
      </D.Content>
    </D.Portal>
  )
}

// ───────────────────────────── Side sheet ─────────────────────────────
export const Sheet = D.Root
export const SheetTrigger = D.Trigger

export function SheetContent({
  title,
  description,
  children,
  side = 'right',
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  side?: 'right' | 'left'
  className?: string
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-900/25 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-3 outline-none data-[state=open]:animate-[fade-up_320ms_var(--ease-out)]',
          side === 'right' ? 'right-0 sm:rounded-l-[28px]' : 'left-0 sm:rounded-r-[28px]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <D.Title className="text-xl font-semibold text-ink-900">{title}</D.Title>
            <D.Description className={description ? 'mt-0.5 text-sm text-ink-500' : 'sr-only'}>{description ?? title}</D.Description>
          </div>
          <D.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </D.Content>
    </D.Portal>
  )
}

// ───────────────────────────── Dropdown menu ─────────────────────────────
export const Menu = DM.Root
export const MenuTrigger = DM.Trigger

export function MenuContent({ children, align = 'end', className }: { children: React.ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={8}
        className={cn(
          'z-50 min-w-52 rounded-[18px] border border-line bg-surface p-1.5 shadow-3 outline-none data-[state=open]:animate-[fade-up_200ms_var(--ease-out)]',
          className,
        )}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  )
}

export function MenuItem({
  children,
  icon: Icon,
  destructive,
  className,
  ...props
}: React.ComponentProps<typeof DM.Item> & { icon?: React.ComponentType<{ className?: string }>; destructive?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[12px] px-2.5 text-sm font-medium text-ink-700 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted data-[highlighted]:text-ink-900',
        destructive && 'text-danger-700 data-[highlighted]:bg-danger-100 data-[highlighted]:text-danger-700',
        className,
      )}
      {...props}
    >
      {/* asChild needs exactly one child element, so the icon slot is only rendered for plain items. */}
      {props.asChild ? (
        children
      ) : (
        <>
          {Icon && <Icon className="size-4 shrink-0 text-current opacity-80" />}
          {children}
        </>
      )}
    </DM.Item>
  )
}

export const MenuSeparator = () => <DM.Separator className="my-1 h-px bg-line" />
export const MenuLabel = ({ children }: { children: React.ReactNode }) => (
  <DM.Label className="px-2.5 pt-1.5 pb-1 text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">{children}</DM.Label>
)

// ───────────────────────────── Popover ─────────────────────────────
export const Popover = P.Root
export const PopoverTrigger = P.Trigger
export const PopoverClose = P.Close

export function PopoverContent({
  children,
  className,
  align = 'center',
  side,
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          'z-50 w-80 max-w-[calc(100vw-32px)] rounded-[20px] border border-line bg-surface p-4 shadow-3 outline-none data-[state=open]:animate-[fade-up_200ms_var(--ease-out)]',
          className,
        )}
      >
        {children}
      </P.Content>
    </P.Portal>
  )
}

// ───────────────────────────── Tooltip ─────────────────────────────
export const TooltipProvider = T.Provider

export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-64 rounded-[10px] bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-3 data-[state=delayed-open]:animate-[fade-up_160ms_var(--ease-out)]"
          >
            {content}
            <T.Arrow className="fill-ink-900" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}

// ───────────────────────────── Confirm (replaces window.confirm) ─────────────────────────────
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}
