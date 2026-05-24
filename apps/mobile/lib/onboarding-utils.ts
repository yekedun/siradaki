export const DEFAULT_WORKING_HOURS = {
  mon: { open: '09:00', close: '19:00', enabled: true },
  tue: { open: '09:00', close: '19:00', enabled: true },
  wed: { open: '09:00', close: '19:00', enabled: true },
  thu: { open: '09:00', close: '19:00', enabled: true },
  fri: { open: '09:00', close: '19:00', enabled: true },
  sat: { open: '10:00', close: '17:00', enabled: true },
  sun: { open: '09:00', close: '19:00', enabled: false },
} as const;

export function buildBarberLink(
  shopSlug: string | null | undefined,
  staffSlug: string | null | undefined,
): string | null {
  if (!shopSlug || !staffSlug) return null;
  return `https://siradaki.app/${shopSlug}/u/${staffSlug}`;
}

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
