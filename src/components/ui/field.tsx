'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from 'radix-ui'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FieldShellProps = {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/** Error + hint row shared by every field. */
function FieldMessages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger-700">
        <span aria-hidden className="inline-block size-1.5 rounded-full bg-danger-500" />
        {error}
      </p>
    )
  if (hint)
    return (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
        {hint}
      </p>
    )
  return null
}

const controlBase =
  'peer block w-full border bg-surface text-ink-900 shadow-1 transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-transparent focus:border-primary-500 focus:shadow-[0_0_0_4px_var(--primary-100)] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-500 read-only:bg-surface-muted/60'

const floatingLabel =
  'pointer-events-none absolute left-5 top-1/2 origin-left -translate-y-1/2 text-sm text-ink-500 transition-all duration-200 ease-[var(--ease-out)] peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[0.6875rem] peer-focus:font-semibold peer-focus:text-primary-700 peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[0.6875rem] peer-[:not(:placeholder-shown)]:font-semibold'

export type InputProps = Omit<React.ComponentProps<'input'>, 'id'> & {
  id: string
  label: string
  error?: string
  hint?: string
  trailing?: React.ReactNode
}

export function Input({ id, label, error, hint, trailing, className, required, ...props }: InputProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <input
          id={id}
          placeholder=" "
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            controlBase,
            'h-14 rounded-full px-5 pt-5 pb-1.5 text-md',
            trailing && 'pr-12',
            error ? 'border-danger-500 focus:border-danger-500 focus:shadow-[0_0_0_4px_var(--danger-100)]' : 'border-line',
          )}
          {...props}
        />
        <label htmlFor={id} className={floatingLabel}>
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

export type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'id'> & { id: string; label: string; error?: string; hint?: string }

export function Textarea({ id, label, error, hint, className, required, rows = 4, ...props }: TextareaProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          placeholder=" "
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            controlBase,
            'min-h-28 resize-y rounded-2xl px-5 pt-7 pb-3 text-md leading-relaxed',
            error ? 'border-danger-500' : 'border-line',
          )}
          {...props}
        />
        <label htmlFor={id} className={cn(floatingLabel, 'top-5 peer-focus:top-2.5 peer-[:not(:placeholder-shown)]:top-2.5')}>
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

export type SelectProps = Omit<React.ComponentProps<'select'>, 'id'> & {
  id: string
  label: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

/** Native select: best keyboard, screen-reader and mobile picker support. */
export function Select({ id, label, error, hint, options, placeholder = 'Select…', className, required, ...props }: SelectProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            controlBase,
            'h-14 appearance-none rounded-full pt-5 pr-11 pb-1.5 pl-5 text-md',
            error ? 'border-danger-500' : 'border-line',
          )}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label htmlFor={id} className="pointer-events-none absolute top-2.5 left-5 text-[0.6875rem] font-semibold text-ink-500">
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-500" />
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

/** Compact select for toolbars and filters. */
export function FilterSelect({
  label,
  options,
  className,
  ...props
}: React.ComponentProps<'select'> & { label: string; options: { value: string; label: string }[] }) {
  return (
    <label className={cn('relative inline-flex', className)}>
      <span className="sr-only">{label}</span>
      <select
        className="h-10 w-full cursor-pointer appearance-none rounded-full border border-line bg-surface pr-9 pl-4 text-sm font-medium text-ink-900 shadow-1 outline-none hover:border-line-strong focus-visible:border-primary-500 focus-visible:shadow-[0_0_0_4px_var(--primary-100)]"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500" />
    </label>
  )
}

export function Checkbox({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { id: string; label: React.ReactNode; description?: string }) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <CheckboxPrimitive.Root
        id={id}
        className="peer mt-0.5 grid size-5 shrink-0 place-items-center rounded-[7px] border border-line-strong bg-surface shadow-1 transition-colors outline-none focus-visible:shadow-[0_0_0_4px_var(--primary-100)] data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600"
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3.5 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug">
        <span className="font-medium text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-ink-500">{description}</span>}
      </label>
    </div>
  )
}

export function Switch({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { id: string; label: string; description?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-6', className)}>
      <label htmlFor={id} className="cursor-pointer text-sm">
        <span className="font-medium text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-ink-500">{description}</span>}
      </label>
      <SwitchPrimitive.Root
        id={id}
        className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-line-strong transition-colors outline-none focus-visible:shadow-[0_0_0_4px_var(--primary-100)] data-[state=checked]:bg-primary-600"
        {...props}
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow-2 transition-transform duration-200 ease-[var(--ease-out)] data-[state=checked]:translate-x-6" />
      </SwitchPrimitive.Root>
    </div>
  )
}

/** Free-text tags (skills, interests, expertise). Enter or comma adds a tag. */
export function TagInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  max = 15,
  suggestions = [],
}: {
  id: string
  label: string
  value: string[]
  onChange: (v: string[]) => void
  hint?: string
  error?: string
  max?: number
  suggestions?: string[]
}) {
  const [draft, setDraft] = React.useState('')
  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, '')
    if (!t || value.length >= max || value.some((v) => v.toLowerCase() === t.toLowerCase())) return
    onChange([...value, t.slice(0, 40)])
    setDraft('')
  }
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6)
  return (
    <div>
      <div
        className={cn(
          'rounded-2xl border bg-surface px-4 pt-6 pb-2 shadow-1 transition-[border-color,box-shadow] focus-within:border-primary-500 focus-within:shadow-[0_0_0_4px_var(--primary-100)]',
          error ? 'border-danger-500' : 'border-line',
          'relative',
        )}
      >
        <label htmlFor={id} className="absolute top-2.5 left-4 text-[0.6875rem] font-semibold text-ink-500">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pr-1 pl-2.5 text-xs font-medium text-primary-700">
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== t))}
                className="grid size-5 place-items-center rounded-full hover:bg-primary-100"
                aria-label={`Remove ${t}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            id={id}
            value={draft}
            onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add(draft)
              } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
            }}
            onBlur={() => draft && add(draft)}
            placeholder={value.length ? '' : 'Type and press Enter'}
            className="min-w-32 flex-1 bg-transparent py-1 text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-500"
            aria-describedby={hint ? `${id}-hint` : undefined}
          />
        </div>
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="min-h-8 rounded-full border border-dashed border-line-strong px-2.5 text-xs text-ink-700 hover:border-primary-500 hover:text-primary-700"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

export function FieldGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1">
        <span className="block text-base font-semibold text-ink-900">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-500">{description}</span>}
      </legend>
      {children}
    </fieldset>
  )
}

export type { FieldShellProps }
