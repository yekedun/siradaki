import React, { useEffect, useState } from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { supabase } from '../../lib/supabase';

interface StaffContext {
  staffId: string | null;
  shopId: string | null;
  shopSlug: string | null;
  staffName: string;
  workingHours: Record<string, unknown> | null;
  services: Array<{ id: string; label: string; dur: number; price: string; priceValue: number }>;
}

export default function StaffAvailabilityRoute() {
  const [context, setContext] = useState<StaffContext>({
    staffId: null,
    shopId: null,
    shopSlug: null,
    staffName: '',
    workingHours: null,
    services: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data: staff } = await supabase
        .from('staff')
        .select('id, name, shop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!staff || cancelled) {
        setContext({ staffId: null, shopId: null, shopSlug: null, staffName: '', workingHours: null, services: [] });
        setLoading(false);
        return;
      }

      const [{ data: shop }, { data: services }] = await Promise.all([
        supabase
          .from('shops')
          .select('id, slug, working_hours')
          .eq('id', staff.shop_id)
          .maybeSingle(),
        supabase
          .from('services')
          .select('id, name, duration_min, price_cents')
          .eq('shop_id', staff.shop_id)
          .eq('is_active', true),
      ]);

      if (!cancelled) {
        setContext({
          staffId: staff.id,
          shopId: shop?.id ?? staff.shop_id ?? null,
          staffName: staff.name ?? '',
          shopSlug: shop?.slug ?? null,
          workingHours: (shop?.working_hours as Record<string, unknown> | null) ?? null,
          services: (services ?? []).map((service) => ({
            id: service.id,
            label: service.name ?? '',
            dur: service.duration_min ?? 30,
            price: `${Math.round((service.price_cents ?? 0) / 100)}₺`,
            priceValue: Math.round((service.price_cents ?? 0) / 100),
          })),
        });
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AvailabilityScreen
      mode="staff"
      shopId={context.shopId}
      shopSlug={context.shopSlug}
      staffId={context.staffId}
      staffList={context.staffId ? [{ id: context.staffId, name: context.staffName }] : []}
      services={context.services}
      workingHours={context.workingHours}
      loadingContext={loading}
    />
  );
}
