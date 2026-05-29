import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getShopByOwner } from '@berber/db';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const { data: shop } = await getShopByOwner(supabase, user.id);
  if (!shop) redirect('/kayit');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar shopName={shop.display_name || shop.name || 'Dükkan'} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
