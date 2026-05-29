'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, Scissors, Users, TrendingUp, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const NAV = [
  { href: '/dashboard',           label: 'Özet',      icon: LayoutDashboard },
  { href: '/dashboard/ajanda',    label: 'Ajanda',    icon: Calendar },
  { href: '/dashboard/hizmetler', label: 'Hizmetler', icon: Scissors },
  { href: '/dashboard/ekip',      label: 'Ekip',      icon: Users },
  { href: '/dashboard/gelir',     label: 'Gelir',     icon: TrendingUp },
  { href: '/dashboard/ayarlar',   label: 'Ayarlar',   icon: Settings },
];

export function Sidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-gray-100 bg-white h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Sıradaki</p>
        <p className="text-sm font-bold text-gray-900 truncate">{shopName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} className={active ? 'text-blue-900' : 'text-gray-400'} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={16} className="text-gray-400" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
