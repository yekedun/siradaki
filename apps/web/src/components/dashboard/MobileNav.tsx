'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Users, TrendingUp } from 'lucide-react';

const NAV = [
  { href: '/dashboard',           label: 'Özet',   icon: LayoutDashboard },
  { href: '/dashboard/ajanda',    label: 'Ajanda', icon: Calendar },
  { href: '/dashboard/hizmetler', label: 'Hizmet', icon: Scissors },
  { href: '/dashboard/ekip',      label: 'Ekip',   icon: Users },
  { href: '/dashboard/gelir',     label: 'Gelir',  icon: TrendingUp },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-40">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              active ? 'text-blue-900' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
