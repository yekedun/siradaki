// W2 · Dükkan Booking Sayfası — Server component
// Route: /[slug]  →  siradaki.app/keskin-berber
// Fetches shop/services/staff on the server, passes to BookingClient

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '../../lib/supabase/server';
import BookingClient from './BookingClient';

function ShopPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Onay Bekleniyor</h1>
        <p className="text-sm text-gray-500">Bu dükkan henüz onay bekliyor. Onaylandıktan sonra rezervasyon alabilirsiniz.</p>
      </div>
    </div>
  );
}

function ShopRejectedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚫</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Dükkan Aktif Değil</h1>
        <p className="text-sm text-gray-500">Bu dükkan artık aktif değil.</p>
      </div>
    </div>
  );
}

interface Props {
  params: Promise<{ slug: string }>;
}

/* ── Metadata ─────────────────────────────────────────────────── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from('shops')
    .select('name, display_name, address')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  if (!shop) return { title: 'Dükkan Bulunamadı' };
  const name = shop.name || shop.display_name;
  return {
    title: `${name} — Online Randevu · Sıradaki`,
    description: `${name}${shop.address ? ' · ' + shop.address : ''} — Online randevu al.`,
  };
}

/* ── Page ─────────────────────────────────────────────────────── */
export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Shop — query all statuses so we can show custom pages for pending/rejected
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, display_name, address, slug, timezone, status')
    .eq('slug', slug)
    .maybeSingle();

  if (!shop) notFound();
  if (shop.status === 'pending') return <ShopPendingPage />;
  if (shop.status === 'rejected') return <ShopRejectedPage />;
  if (shop.status !== 'active') notFound();

  // Fetch services + staff in parallel — both depend on shop.id
  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, duration_min, price_cents')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name'),
  ]);

  const sortedStaff = (staff ?? []).sort((a, b) => {
    return (a.name ?? '').localeCompare(b.name ?? '', 'tr');
  });

  return (
    <BookingClient
      shop={{
        id:      shop.id,
        name:    shop.name || shop.display_name,
        address: shop.address ?? null,
        slug:    shop.slug,
        timezone: shop.timezone,
      }}
      services={(services ?? []).map(s => ({
        id:           s.id,
        name:         s.name,
        duration_min: s.duration_min,
        price:        Math.round((s.price_cents ?? 0) / 100),
      }))}
      staff={sortedStaff.map(s => ({ id: s.id, name: s.name, phone: null }))}
    />
  );
}
