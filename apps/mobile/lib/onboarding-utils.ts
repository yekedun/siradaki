export function buildOnboardingServiceInsert(
  shopId: string,
  name: string,
  durationMin: number,
  priceInput: string,
) {
  return {
    shop_id: shopId,
    name: name.trim(),
    duration_min: durationMin,
    price_cents: Math.round(Number(priceInput) * 100),
    is_active: true,
  };
}
