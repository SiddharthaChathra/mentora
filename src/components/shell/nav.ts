import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  FileDown,
  FileText,
  FileUp,
  GraduationCap,
  History,
  LayoutGrid,
  LifeBuoy,
  MessageSquareHeart,
  MessageSquarePlus,
  Network,
  PenLine,
  Route,
  Settings2,
  ShieldAlert,
  Upload,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/roles'

export type NavItem = { href: string; label: string; icon: LucideIcon; group?: string; exact?: boolean; badgeKey?: string; tour?: string }

export const NAV: Record<Role, NavItem[]> = {
  MENTEE: [
    { href: '/mentee', label: 'Overview', icon: LayoutGrid, exact: true },
    { href: '/mentee/academics', label: 'Academic records', icon: GraduationCap, tour: 'academics' },
    { href: '/mentee/analytics', label: 'Performance', icon: BarChart3 },
    { href: '/mentee/mentoring', label: 'Feedback & plan', icon: MessageSquareHeart, badgeKey: 'feedback' },
    { href: '/mentee/resources', label: 'Notes & resources', icon: BookOpenText, badgeKey: 'resources' },
    { href: '/mentee/sessions', label: 'Sessions', icon: CalendarDays },
    { href: '/mentee/journey', label: 'Journey', icon: Route },
    { href: '/mentee/profile', label: 'My profile', icon: UserRound },
  ],
  MENTOR: [
    { href: '/mentor', label: 'Overview', icon: LayoutGrid, exact: true },
    { href: '/mentor/mentees', label: 'My mentees', icon: UsersRound, tour: 'mentees' },
    { href: '/mentor/verifications', label: 'Verifications', icon: ClipboardCheck, badgeKey: 'verifications' },
    { href: '/mentor/recommendations', label: 'Recommendations', icon: MessageSquareHeart },
    { href: '/mentor/resources', label: 'Resources', icon: BookOpenText },
    { href: '/mentor/sessions', label: 'Sessions', icon: CalendarDays },
    { href: '/mentor/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/mentor/reports', label: 'PDF reports', icon: FileText },
  ],
  HOD: [
    { href: '/hod', label: 'Department', icon: LayoutGrid, exact: true },
    { href: '/hod/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/hod/interventions', label: 'Interventions', icon: ShieldAlert },
    { href: '/hod/students', label: 'Students', icon: Users },
    { href: '/hod/mentors', label: 'Mentors', icon: LifeBuoy },
    { href: '/hod/assignments', label: 'Assignments', icon: Network, tour: 'assignments' },
    { href: '/hod/users', label: 'Users & roles', icon: UserCog },
    { href: '/hod/imports', label: 'Imports', icon: FileUp },
    { href: '/hod/exports', label: 'Exports', icon: FileDown },
    { href: '/hod/settings', label: 'Settings', icon: Settings2 },
    { href: '/hod/audit', label: 'Audit history', icon: History },
  ],
}

/** Bottom navigation on phones: four destinations; the centre "+" opens QUICK_ACTIONS. */
export const MOBILE_NAV: Record<Role, string[]> = {
  MENTEE: ['/mentee', '/mentee/academics', '/mentee/mentoring', '/mentee/resources'],
  MENTOR: ['/mentor', '/mentor/mentees', '/mentor/verifications', '/mentor/sessions'],
  HOD: ['/hod', '/hod/students', '/hod/assignments', '/hod/interventions'],
}

export type QuickAction = { label: string; href: string; icon: LucideIcon; key?: string; description: string }

export const QUICK_ACTIONS: Record<Role, QuickAction[]> = {
  MENTEE: [
    { label: 'Add or update marks', href: '/mentee/academics?new=1', icon: PenLine, key: 'm', description: 'Start a semester or add subjects' },
    { label: 'Open my feedback', href: '/mentee/mentoring', icon: MessageSquareHeart, description: 'See what your mentor shared' },
    { label: 'Edit my profile', href: '/mentee/profile', icon: UserRound, description: 'Photo, skills and goals' },
  ],
  MENTOR: [
    { label: 'Write a recommendation', href: '/mentor/mentees?action=recommend', icon: MessageSquarePlus, key: 'n', description: 'Pick a mentee, then write' },
    { label: 'Upload study material', href: '/mentor/resources?new=1', icon: Upload, key: 'u', description: 'Files or links with instructions' },
    { label: 'Schedule a session', href: '/mentor/sessions?new=1', icon: CalendarPlus, key: 's', description: 'One-to-one or group' },
  ],
  HOD: [
    { label: 'Invite people', href: '/hod/users?invite=1', icon: UserPlus, key: 'i', description: 'Students, mentors or HODs' },
    { label: 'Assign mentors', href: '/hod/assignments?filter=unassigned', icon: Network, key: 'a', description: 'Place unassigned students' },
    { label: 'Bulk import', href: '/hod/imports', icon: FileUp, description: 'CSV or Excel with preview' },
  ],
}

export const ROLE_LABEL: Record<Role, string> = { MENTEE: 'Mentee', MENTOR: 'Mentor', HOD: 'Head of Department' }
