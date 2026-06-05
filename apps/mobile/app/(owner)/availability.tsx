import React from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { useShop } from '../../lib/ShopContext';

export default function OwnerAvailabilityRoute() {
  const { shopSlug, staffList, services, loading } = useShop();

  return (
    <AvailabilityScreen
      mode="owner"
      shopSlug={shopSlug}
      staffList={staffList}
      services={services}
      loadingContext={loading}
    />
  );
}
