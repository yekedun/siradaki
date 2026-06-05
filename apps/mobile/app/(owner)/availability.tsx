import React from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { useShop } from '../../lib/ShopContext';

export default function OwnerAvailabilityRoute() {
  const { shopSlug, staffList, loading } = useShop();

  return (
    <AvailabilityScreen
      mode="owner"
      shopSlug={shopSlug}
      staffList={staffList}
      loadingContext={loading}
    />
  );
}
