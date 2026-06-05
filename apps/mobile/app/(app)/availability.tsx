import React, { useEffect, useState } from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { supabase } from '../../lib/supabase';

interface StaffContext {
  staffId: string | null;
  shopSlug: string | null;
  staffName: string;
  services: Array<{ id: string; dur: number }>;
}

export default function StaffAvailabilityRoute() {
  const [context, setContext] = useState<StaffContext>({
    staffId: null,
    shopSlug: null,
    staffName: '',
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
        setContext({ staffId: null, shopSlug: null, staffName: '', services: [] });
        setLoading(false);
        return;
      }

      const [{ data: shop }, { data: services }] = await Promise.all([
        supabase
          .from('shops')
          .select('slug')
          .eq('id', staff.shop_id)
          .maybeSingle(),
        supabase
          .from('services')
          .select('id, duration_min')
          .eq('shop_id', staff.shop_id)
          .eq('is_active', true),
      ]);

      if (!cancelled) {
        setContext({
          staffId: staff.id,
          staffName: staff.name ?? '',
          shopSlug: shop?.slug ?? null,
          services: (services ?? []).map((service) => ({
            id: service.id,
            dur: service.duration_min ?? 30,
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
      shopSlug={context.shopSlug}
      staffId={context.staffId}
      staffList={context.staffId ? [{ id: context.staffId, name: context.staffName }] : []}
      services={context.services}
      loadingContext={loading}
    />
  );
}
