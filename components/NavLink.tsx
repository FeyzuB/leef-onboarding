'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** A navigation link that shows when its page (or a page under it) is open. */
export function NavLink({ href, icon, children, compact = false }: { href: string; icon: ReactNode; children: ReactNode; compact?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`) || (href === '/overview' && pathname.startsWith('/plans'));
  const base = compact
    ? 'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition'
    : 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition';
  const state = active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`${base} ${state}`}>
      <span className={active ? 'text-brand-600' : 'text-slate-400'}>{icon}</span>
      {children}
    </Link>
  );
}
