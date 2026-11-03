import Link from 'next/link';
import type { User } from '@prisma/client';
import { Compass, KeyRound, Layers, LayoutDashboard, LogOut, Network, Settings2, Sprout, Users } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { NavLink } from '@/components/NavLink';
import { Avatar } from '@/components/ui';
import { isAdmin, isLead } from '@/lib/auth';

const iconSize = 18;

function navLinks(user: User, hasPlan: boolean) {
  return [
    ...(isLead(user)
      ? [
          { href: '/overview', label: 'Overview', icon: <LayoutDashboard size={iconSize} /> },
          { href: '/people', label: 'People', icon: <Users size={iconSize} /> },
          { href: '/templates', label: 'Templates', icon: <Layers size={iconSize} /> },
        ]
      : []),
    ...(hasPlan || !isLead(user) ? [{ href: '/my-plan', label: 'My plan', icon: <Sprout size={iconSize} /> }] : []),
    { href: '/team', label: 'Where to find things', icon: <Compass size={iconSize} /> },
    { href: '/organogram', label: 'Who is who', icon: <Network size={iconSize} /> },
    ...(isAdmin(user) ? [{ href: '/admin', label: 'Teams & roles', icon: <Settings2 size={iconSize} /> }] : []),
  ];
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-sm">
        <Sprout size={20} />
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-accent-600">Stadsbeheer</span>
        <span className="block text-base font-bold text-slate-900">Onboarding</span>
      </span>
    </Link>
  );
}

const roleLabel = { NEW_HIRE: 'New colleague', LEAD: 'Lead', ADMIN: 'Admin' } as const;

/** Sidebar on wide screens, a top bar with scrollable links on small ones. */
export function Nav({ user, hasPlan }: { user: User; hasPlan: boolean }) {
  const links = navLinks(user, hasPlan);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} icon={link.icon}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{roleLabel[user.appRole]}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            <Link href="/change-password" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
              <KeyRound size={14} /> Password
            </Link>
            <form action={logout} className="flex-1">
              <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                <LogOut size={14} /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-1">
            <Link href="/change-password" aria-label="Change password" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <KeyRound size={18} />
            </Link>
            <form action={logout}>
              <button type="submit" aria-label="Log out" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} icon={link.icon} compact>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
    </>
  );
}
