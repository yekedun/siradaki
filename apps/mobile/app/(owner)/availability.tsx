import React from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { useShop } from '../../lib/ShopContext';

export default function OwnerAvailabilityRoute() {
  const { shopId, shopSlug, staffList, services, workingHours, loading } = useShop();

  return (
    <AvailabilityScreen
      mode="owner"
      shopId={shopId}
      shopSlug={shopSlug}
      staffList={staffList}
      services={services}
      workingHours={workingHours}
      loadingContext={loading}
    />
  );
}
