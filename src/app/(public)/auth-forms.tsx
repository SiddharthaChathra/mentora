'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { forgotSchema, loginSchema, setPasswordSchema, signupSchema } from '@/lib/validators'
import { requestPasswordReset, setNewPassword, signIn, signUp } from '@/server/actions/auth'
import { cn } from '@/lib/utils'

function FormAlert({ children, tone = 'danger' }: { children: React.ReactNode; tone?: 'danger' | 'success' | 'info' }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'mb-5 rounded-lg px-3.5 py-3 text-sm',
        tone === 'danger' && 'bg-danger-100 text-danger-700',
        tone === 'success' && 'bg-success-100 text-success-700',
        tone === 'info' && 'bg-info-100 text-info-700',
      )}
    >
      {children}
    </div>
  )
}

function PasswordInput({ id, label, error, autoComplete, ...rest }: React.ComponentProps<typeof Input>) {
  const [show, setShow] = React.useState(false)
  const [caps, setCaps] = React.useState(false)
  return (
    <div>
      <Input
        id={id}
        label={label}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        error={error}
        onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
        trailing={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="grid size-10 place-items-center rounded-lg text-ink-500 hover:bg-surface-muted hover:text-ink-900"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...rest}
      />
      {caps && <p className="mt-1.5 text-xs font-medium text-warning-700">Caps Lock is on</p>}
    </div>
  )
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', next } })
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    const res = await signIn(values)
    if (res && !res.ok) setError(res.error.message)
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {notice && <FormAlert tone="info">{notice}</FormAlert>}
      {error && <FormAlert>{error}</FormAlert>}
      <Input id="email" label="Email" type="email" autoComplete="email" inputMode="email" required {...form.register('email')} error={form.formState.errors.email?.message} />
      <PasswordInput id="password" label="Password" autoComplete="current-password" required {...form.register('password')} error={form.formState.errors.password?.message} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary-600 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Sign in <ArrowRight />
      </Button>
      <p className="text-center text-sm text-ink-500">
        New student?{' '}
        <Link href="/signup" className="font-medium text-primary-600 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}

export function ForgotForm() {
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<z.input<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    const res = await requestPasswordReset(values)
    if (res.ok) setSent(true)
    else setError(res.error.message)
  })
  if (sent)
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-100 text-success-700">
          <MailCheck className="size-7" />
        </span>
        <p className="mt-4 font-medium text-ink-900">Check your inbox</p>
        <p className="mt-1 text-sm text-ink-500">If an account exists for {form.getValues('email')}, we’ve sent a link to reset your password. It expires in one hour.</p>
        <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <FormAlert>{error}</FormAlert>}
      <Input id="email" label="Email" type="email" autoComplete="email" required {...form.register('email')} error={form.formState.errors.email?.message} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}

const RULES = [
  { test: (v: string) => v.length >= 10, label: 'At least 10 characters' },
  { test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: 'Upper and lowercase letters' },
  { test: (v: string) => /[0-9]/.test(v), label: 'At least one number' },
]

function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid gap-1.5 text-xs" aria-label="Password requirements">
      {RULES.map((r) => {
        const ok = r.test(value)
        return (
          <li key={r.label} className={cn('flex items-center gap-1.5', ok ? 'text-success-700' : 'text-ink-500')}>
            <CheckCircle2 className={cn('size-3.5', ok ? 'opacity-100' : 'opacity-40')} /> {r.label}
          </li>
        )
      })}
    </ul>
  )
}

export function SignupForm() {
  const [error, setError] = React.useState<string | null>(null)
  const [checkEmail, setCheckEmail] = React.useState(false)
  const form = useForm<z.input<typeof signupSchema>>({ resolver: zodResolver(signupSchema), defaultValues: { full_name: '', email: '', password: '', confirm: '' } })
  const pw = useWatch({ control: form.control, name: 'password' }) ?? ''
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    const res = await signUp(values)
    if (!res) return
    if (!res.ok) setError(res.error.message)
    else if (res.data === 'check-email') setCheckEmail(true)
  })
  if (checkEmail)
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-100 text-success-700">
          <MailCheck className="size-7" />
        </span>
        <p className="mt-4 font-medium text-ink-900">Confirm your email</p>
        <p className="mt-1 text-sm text-ink-500">We sent a confirmation link to {form.getValues('email')}. Open it to finish creating your account.</p>
        <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <FormAlert>{error}</FormAlert>}
      <Input id="full_name" label="Full name" autoComplete="name" required {...form.register('full_name')} error={form.formState.errors.full_name?.message} />
      <Input id="email" label="College email" hint="Your USN email, e.g. nnm23cs001@… — your branch is taken from it." type="email" autoComplete="email" inputMode="email" required {...form.register('email')} error={form.formState.errors.email?.message} />
      <PasswordInput id="password" label="Password" autoComplete="new-password" required {...form.register('password')} error={form.formState.errors.password?.message} />
      <PasswordRules value={pw} />
      <PasswordInput id="confirm" label="Confirm password" autoComplete="new-password" required {...form.register('confirm')} error={form.formState.errors.confirm?.message} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Create student account <ArrowRight />
      </Button>
      <p className="text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-ink-500">Mentors and HODs join by invitation from the college.</p>
    </form>
  )
}

export function SetPasswordForm({ mode }: { mode: 'reset' | 'invite' }) {
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<z.input<typeof setPasswordSchema>>({ resolver: zodResolver(setPasswordSchema), defaultValues: { password: '', confirm: '' } })
  const pw = useWatch({ control: form.control, name: 'password' }) ?? ''
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    const res = await setNewPassword(values, mode)
    if (res && !res.ok) setError(res.error.message)
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <FormAlert>{error}</FormAlert>}
      <PasswordInput id="password" label="New password" autoComplete="new-password" required {...form.register('password')} error={form.formState.errors.password?.message} />
      <PasswordRules value={pw} />
      <PasswordInput id="confirm" label="Confirm password" autoComplete="new-password" required {...form.register('confirm')} error={form.formState.errors.confirm?.message} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        {mode === 'invite' ? 'Create password & continue' : 'Update password'} <ArrowRight />
      </Button>
    </form>
  )
}
