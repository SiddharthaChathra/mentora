'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Command } from 'cmdk'
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, Clock, Compass, Keyboard, LogOut, Menu as MenuIcon, Plus, Search, Settings, Sparkles, UserRound, Wifi } from 'lucide-react'
import { isScopedRoute } from '@/lib/scope'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/roles'
import { useLocalStorage } from '@/lib/hooks'
import { Avatar } from '@/components/ui/avatar'
import { Kbd } from '@/components/ui/primitives'
import { Dialog, DialogContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Sheet, SheetContent, Tooltip } from '@/components/ui/overlay'
import { useLowBandwidth } from '@/components/providers'
import { commandSearch, signOut, type SearchHit } from '@/server/actions/shell'
import { LogoMark, Logo } from './logo'
import { MOBILE_NAV, NAV, QUICK_ACTIONS, ROLE_LABEL, type NavItem } from './nav'
import { NotificationBell } from './notification-bell'
import { ProductTour } from './product-tour'

export type ShellUser = { id: string; name: string | null; email: string; role: Role; hasAvatar: boolean; avatarVersion: string | null }

const isActive = (pathname: string, item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`))

export function AppShell({
  user,
  badges,
  semester,
  aiEnabled,
  children,
}: {
  user: ShellUser
  badges: Record<string, number>
  semester: number | null
  aiEnabled: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [railOpen, setRailOpen] = useLocalStorage('m_rail', '0')
  const open = railOpen === '1'
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [quickOpen, setQuickOpen] = React.useState(false)
  const [keysOpen, setKeysOpen] = React.useState(false)
  const [tourOpen, setTourOpen] = React.useState(false)
  const { suggested, lowBandwidth, setLowBandwidth } = useLowBandwidth()
  const [dismissed, setDismissed] = React.useState(false)
  const nav = NAV[user.role]
  const quick = QUICK_ACTIONS[user.role]

  // Keyboard shortcuts (UX2-09): ⌘/Ctrl+K or "/" search · "?" shortcuts · role quick actions.
  React.useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (e.key === '?') setKeysOpen(true)
      else {
        const a = quick.find((q) => q.key === e.key.toLowerCase())
        if (a) router.push(a.href)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [quick, router])

  return (
    <div className="relative min-h-dvh bg-canvas xl:bg-canvas-deep xl:p-6">
      <div className="relative flex min-h-dvh xl:mx-auto xl:min-h-[calc(100dvh-48px)] xl:max-w-[1440px] xl:rounded-[32px] xl:bg-shell xl:shadow-[0_30px_80px_-40px_rgb(37_99_235/0.35)]">
        {/* ───────────── Icon rail (tablet+) ───────────── */}
        <aside
          aria-label="Primary"
          className={cn(
            'sticky top-0 z-30 hidden h-dvh shrink-0 flex-col py-5 transition-[width] duration-300 ease-[var(--ease-out)] md:flex xl:top-6 xl:h-[calc(100dvh-48px)]',
            open ? 'w-[var(--rail-w-open)] px-4' : 'w-[var(--rail-w)] items-center px-3',
          )}
        >
          <Link href={nav[0]!.href} aria-label="Mentora home" className={cn('mb-6 flex items-center', open ? 'px-2' : 'justify-center')}>
            {open ? <Logo /> : <LogoMark />}
          </Link>
          <nav className="scrollbar-none flex-1 overflow-y-auto">
            <ul className={cn('space-y-1.5', !open && 'flex flex-col items-center')}>
              {nav.map((item) => {
                const active = isActive(pathname, item)
                const count = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0
                const link = (
                  <Link
                    href={item.href}
                    data-tour={item.tour}
                    aria-current={active ? 'page' : undefined}
                    aria-label={open ? undefined : item.label}
                    className={cn(
                      'relative flex items-center gap-3 rounded-[14px] text-sm font-semibold transition-colors',
                      open ? 'h-11 px-3' : 'size-11 justify-center',
                      active ? 'bg-primary-600 text-white shadow-glow' : 'text-ink-500 hover:bg-surface hover:text-ink-900',
                    )}
                  >
                    <item.icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                    {open && <span className="truncate">{item.label}</span>}
                    {count > 0 && (
                      <span className={cn('num grid min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[0.625rem] font-bold text-white ring-2 ring-shell', open ? 'ml-auto h-5' : 'absolute -top-1 -right-1 h-[18px]')}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                )
                return (
                  <li key={item.href}>
                    {open ? (
                      link
                    ) : (
                      <Tooltip content={item.label} side="right">
                        {link}
                      </Tooltip>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className={cn('mt-4 space-y-1.5 border-t border-line pt-4', !open && 'flex flex-col items-center')}>
            <Tooltip content={open ? 'Collapse' : 'Expand menu'} side="right">
              <button
                type="button"
                onClick={() => setRailOpen(open ? '0' : '1')}
                aria-label={open ? 'Collapse menu' : 'Expand menu'}
                className={cn('flex items-center gap-3 rounded-[14px] text-sm font-semibold text-ink-500 hover:bg-surface hover:text-ink-900', open ? 'h-11 w-full px-3' : 'size-11 justify-center')}
              >
                {open ? <ChevronsLeft className="size-5" /> : <ChevronsRight className="size-5" />}
                {open && 'Collapse'}
              </button>
            </Tooltip>
            <Tooltip content="Sign out" side="right">
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className={cn('flex items-center gap-3 rounded-[14px] text-sm font-semibold text-ink-500 hover:bg-danger-100 hover:text-danger-700', open ? 'h-11 w-full px-3' : 'size-11 justify-center')}
              >
                <LogOut className="size-5" />
                {open && 'Sign out'}
              </button>
            </Tooltip>
          </div>
        </aside>

        {/* ───────────── Main column ───────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 px-3 pt-3 sm:px-5 sm:pt-4 xl:top-6 xl:pt-5">
            <div className="flex h-16 items-center gap-2 rounded-full bg-surface/95 px-2.5 shadow-2 backdrop-blur-xl sm:gap-3 sm:px-3">
              {/* Phone: avatar + greeting */}
              <div className="flex min-w-0 items-center gap-2.5 md:hidden">
                <Avatar userId={user.id} name={user.name} hasImage={user.hasAvatar} version={user.avatarVersion} size="sm" ring />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">Hello, {user.name?.split(' ').find((p) => !/^(dr|prof)\.?$/i.test(p)) ?? 'there'}</p>
                  <p className="truncate text-xs text-ink-500">{ROLE_LABEL[user.role]}</p>
                </div>
              </div>
              <button
                type="button"
                data-tour="search"
                onClick={() => setPaletteOpen(true)}
                className="ml-auto hidden h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surface-muted px-4 text-sm text-ink-500 transition-colors hover:bg-primary-50 md:ml-0 md:flex md:max-w-md"
                aria-label="Search"
              >
                <Search className="size-4 shrink-0" />
                <span className="truncate">{user.role === 'MENTEE' ? 'Search pages and actions…' : 'Search students, subjects, pages…'}</span>
                <span className="ml-auto hidden items-center gap-1 lg:flex">
                  <Kbd>Ctrl</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </button>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search" className="grid size-11 place-items-center rounded-full bg-surface-muted text-ink-700 md:hidden">
                  <Search className="size-5" />
                </button>
                {isScopedRoute(pathname) && <SemesterSwitcher value={semester} />}
                {aiEnabled && user.role === 'MENTOR' && (
                  <Link href="/mentor/mentees?ai=1" className="hidden h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink-900 hover:border-primary-300 hover:text-primary-700 lg:inline-flex">
                    <Sparkles className="size-4 text-primary-600" /> AI Assistant
                  </Link>
                )}
                <NotificationBell userId={user.id} />
                <Menu>
                  <MenuTrigger asChild>
                    <button type="button" className="hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-600 md:block" aria-label="Account menu">
                      <Avatar userId={user.id} name={user.name} hasImage={user.hasAvatar} version={user.avatarVersion} size="sm" ring className="rounded-full" />
                    </button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuLabel>{ROLE_LABEL[user.role]}</MenuLabel>
                    <div className="px-2.5 pb-2">
                      <p className="truncate text-sm font-semibold text-ink-900">{user.name ?? user.email}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                    </div>
                    <MenuSeparator />
                    {user.role === 'MENTEE' && (
                      <MenuItem icon={UserRound} asChild>
                        <Link href="/mentee/profile">My profile</Link>
                      </MenuItem>
                    )}
                    <MenuItem icon={Settings} asChild>
                      <Link href="/account">Account & preferences</Link>
                    </MenuItem>
                    <MenuItem icon={Compass} onSelect={() => setTourOpen(true)}>
                      Show me around
                    </MenuItem>
                    <MenuItem icon={Keyboard} onSelect={() => setKeysOpen(true)}>
                      Keyboard shortcuts
                    </MenuItem>
                    <MenuItem icon={Wifi} onSelect={() => setLowBandwidth(!lowBandwidth)}>
                      Low-bandwidth mode: {lowBandwidth ? 'On' : 'Off'}
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={LogOut} destructive onSelect={() => void signOut()}>
                      Sign out
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            </div>
            {suggested && !lowBandwidth && !dismissed && (
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-full bg-info-100 px-4 py-2 text-sm text-info-700">
                <Wifi className="size-4" /> Your connection looks slow.
                <button type="button" className="font-semibold underline-offset-4 hover:underline" onClick={() => setLowBandwidth(true)}>
                  Switch to low-bandwidth mode
                </button>
                <button type="button" className="ml-auto font-medium" onClick={() => setDismissed(true)}>
                  Dismiss
                </button>
              </div>
            )}
          </header>

          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-6 pb-32 outline-none sm:px-6 md:pb-12 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <MobileNav role={user.role} pathname={pathname} badges={badges} onMore={() => setMoreOpen(true)} onQuick={() => setQuickOpen(true)} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent title="Menu" side="right">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn('flex h-12 items-center gap-3 rounded-[14px] px-3 text-md font-semibold', isActive(pathname, item) ? 'bg-primary-600 text-white' : 'text-ink-700 hover:bg-surface-muted')}
                >
                  <item.icon className="size-5" /> {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link href="/account" onClick={() => setMoreOpen(false)} className="flex h-12 items-center gap-3 rounded-[14px] px-3 font-semibold text-ink-700 hover:bg-surface-muted">
                <Settings className="size-5" /> Account & preferences
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => (setMoreOpen(false), setTourOpen(true))} className="flex h-12 w-full items-center gap-3 rounded-[14px] px-3 font-semibold text-ink-700 hover:bg-surface-muted">
                <Compass className="size-5" /> Show me around
              </button>
            </li>
            <li>
              <button type="button" onClick={() => void signOut()} className="flex h-12 w-full items-center gap-3 rounded-[14px] px-3 font-semibold text-danger-700 hover:bg-danger-100">
                <LogOut className="size-5" /> Sign out
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>

      {/* Quick-action sheet (bottom sheet on phones) */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent title="Quick actions" description="Jump straight to the things you do most.">
          <ul className="grid gap-2">
            {quick.map((a) => (
              <li key={a.href}>
                <Link href={a.href} onClick={() => setQuickOpen(false)} className="flex min-h-16 items-center gap-3 rounded-[20px] bg-surface-muted px-4 py-3 hover:bg-primary-50">
                  <span className="grid size-11 place-items-center rounded-[14px] bg-primary-600 text-white shadow-glow">
                    <a.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900">{a.label}</span>
                    <span className="block text-sm text-ink-500">{a.description}</span>
                  </span>
                  {a.key && (
                    <span className="hidden sm:block">
                      <Kbd>{a.key.toUpperCase()}</Kbd>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={keysOpen} onOpenChange={setKeysOpen}>
        <DialogContent title="Keyboard shortcuts" size="sm">
          <ul className="space-y-2.5 text-sm">
            {[
              ['Search', ['/']],
              ['Command palette', ['Ctrl', 'K']],
              ['Show shortcuts', ['?']],
              ...quick.filter((q) => q.key).map((q) => [q.label, [q.key!.toUpperCase()]] as [string, string[]]),
            ].map(([label, keys]) => (
              <li key={label as string} className="flex items-center justify-between gap-3">
                <span className="text-ink-700">{label as string}</span>
                <span className="flex gap-1">
                  {(keys as string[]).map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} role={user.role} />
      <ProductTour role={user.role} userId={user.id} open={tourOpen} onOpenChange={setTourOpen} />
    </div>
  )
}

function SemesterSwitcher({ value }: { value: number | null }) {
  const router = useRouter()
  const set = (v: string) => {
    document.cookie = `m_sem=${v}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }
  return (
    <label data-tour="semester" className="relative inline-flex">
      <span className="sr-only">Semester</span>
      <select value={value ?? ''} onChange={(e) => set(e.target.value)} className="h-10 max-w-[8.5rem] cursor-pointer appearance-none truncate rounded-full border border-line bg-surface pr-8 pl-3 text-xs font-semibold text-ink-900 outline-none hover:border-primary-300 focus-visible:border-primary-600 sm:h-11 sm:max-w-none sm:pr-9 sm:pl-4 sm:text-sm">
        <option value="">All semesters</option>
        {Array.from({ length: 8 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            Semester {i + 1}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500 sm:right-3.5" />
    </label>
  )
}

function MobileNav({ role, pathname, badges, onMore, onQuick }: { role: Role; pathname: string; badges: Record<string, number>; onMore: () => void; onQuick: () => void }) {
  const items = MOBILE_NAV[role].map((h) => NAV[role].find((n) => n.href === h)!).filter(Boolean)
  const item = (it: NavItem) => {
    const active = isActive(pathname, it)
    const count = it.badgeKey ? (badges[it.badgeKey] ?? 0) : 0
    return (
      <Link key={it.href} href={it.href} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold', active ? 'text-primary-600' : 'text-ink-500')}>
        <span className={cn('relative grid size-9 place-items-center rounded-[12px]', active && 'bg-primary-50')}>
          <it.icon className="size-5" strokeWidth={active ? 2.2 : 1.9} />
          {count > 0 && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger-500 ring-2 ring-surface" />}
        </span>
        <span className="max-w-[72px] truncate">{it.label.split(' ')[0]}</span>
        {active && <motion.span layoutId="mnav" className="absolute top-0 h-[3px] w-8 rounded-full bg-primary-600" />}
      </Link>
    )
  }
  return (
    <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-30 rounded-[24px] bg-surface/95 pb-safe shadow-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-end px-1">
        {items.slice(0, 2).map(item)}
        <div className="-mt-6 flex flex-1 justify-center pb-2">
          <button type="button" onClick={onQuick} aria-label="Quick actions" className="grid size-14 place-items-center rounded-full bg-primary-600 text-white shadow-glow ring-4 ring-canvas">
            <Plus className="size-6" strokeWidth={2.6} />
          </button>
        </div>
        {items.slice(2, 3).map(item)}
        <button type="button" onClick={onMore} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold text-ink-500">
          <span className="grid size-9 place-items-center">
            <MenuIcon className="size-5" />
          </span>
          More
        </button>
      </div>
    </nav>
  )
}

function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (v: boolean) => void; role: Role }) {
  const router = useRouter()
  const [q, setQ] = React.useState('')
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [loading, setLoading] = React.useState(false)
  const [recentRaw, setRecentRaw] = useLocalStorage('m_recent_search', '[]')
  const recent = React.useMemo(() => {
    try {
      return JSON.parse(recentRaw) as SearchHit[]
    } catch {
      return []
    }
  }, [recentRaw])

  React.useEffect(() => {
    if (role === 'MENTEE' || q.trim().length < 2) return
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await commandSearch(q)
      if (!cancelled) {
        setHits(res.ok ? res.data : [])
        setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, role])

  const go = (href: string, hit?: SearchHit) => {
    if (hit) setRecentRaw(JSON.stringify([hit, ...recent.filter((r) => r.href !== hit.href)].slice(0, 5)))
    onOpenChange(false)
    setQ('')
    router.push(href)
  }
  const itemCls = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] px-3 text-sm text-ink-700 data-[selected=true]:bg-primary-50 data-[selected=true]:text-ink-900'
  const groupCls = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.04em] [&_[cmdk-group-heading]]:text-ink-500'
  const shownHits = q.trim().length >= 2 ? hits : []

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && setQ(''))}>
      <DialogContent title="Search" description="Students, subjects, pages and actions" size="md" className="sm:top-[16%] sm:translate-y-0">
        <Command label="Search" className="-mx-1">
          <div className="flex items-center gap-2 rounded-full bg-surface-muted px-4">
            <Search className="size-4 text-ink-500" />
            <Command.Input value={q} onValueChange={setQ} autoFocus placeholder={role === 'MENTEE' ? 'Type a page or action…' : 'Search a student by name or USN…'} className="h-12 flex-1 bg-transparent text-md text-ink-900 outline-none placeholder:text-ink-500" />
          </div>
          <Command.List className="mt-3 max-h-[50dvh] overflow-y-auto">
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-500">{loading ? 'Searching…' : 'No matches.'}</Command.Empty>
            {!q && recent.length > 0 && (
              <Command.Group heading="Recent" className={groupCls}>
                {recent.map((h) => (
                  <Command.Item key={`r-${h.href}`} value={`recent ${h.name} ${h.sub}`} onSelect={() => go(h.href, h)} className={itemCls}>
                    <Clock className="size-4 text-ink-500" /> <span className="font-semibold text-ink-900">{h.name}</span>
                    <span className="truncate text-xs text-ink-500">{h.sub}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {shownHits.length > 0 && (
              <Command.Group heading="People" className={groupCls}>
                {shownHits.map((h) => (
                  <Command.Item key={h.href} value={`${h.name} ${h.sub}`} onSelect={() => go(h.href, h)} className={itemCls}>
                    <Avatar userId={h.id} name={h.name} size="xs" />
                    <span className="font-semibold text-ink-900">{h.name}</span>
                    <span className="truncate text-xs text-ink-500">{h.sub}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group heading="Actions" className={groupCls}>
              {QUICK_ACTIONS[role].map((a) => (
                <Command.Item key={a.href} value={`${a.label} ${a.description}`} onSelect={() => go(a.href)} className={itemCls}>
                  <a.icon className="size-4 text-primary-600" /> {a.label}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Go to" className={groupCls}>
              {NAV[role].map((n) => (
                <Command.Item key={n.href} value={n.label} onSelect={() => go(n.href)} className={itemCls}>
                  <n.icon className="size-4 text-ink-500" /> {n.label}
                </Command.Item>
              ))}
              <Command.Item value="Notifications" onSelect={() => go('/notifications')} className={itemCls}>
                <Bell className="size-4 text-ink-500" /> Notifications
              </Command.Item>
              <Command.Item value="Account settings password" onSelect={() => go('/account')} className={itemCls}>
                <Settings className="size-4 text-ink-500" /> Account & preferences
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
