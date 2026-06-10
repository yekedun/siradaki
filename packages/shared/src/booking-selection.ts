// Pure helpers for multi-service selection in booking flows (web + mobile).
// No React, no IO — unit-testable in isolation.

export interface SelectableService {
  id: string;
  name: string;
  duration_min: number;
  price: number;
}

/** Toggle an id in/out of the selection, preserving insertion order. */
export function toggleService(selected: string[], id: string): string[] {
  return selected.includes(id)
    ? selected.filter((x) => x !== id)
    : [...selected, id];
}

export interface SelectionTotals {
  count: number;
  durationMin: number;
  price: number;
}

/** Sum duration + price over the selected ids (ids not in `services` are ignored). */
export function computeTotals(services: SelectableService[], selected: string[]): SelectionTotals {
  const byId = new Map(services.map((s) => [s.id, s]));
  let durationMin = 0;
  let price = 0;
  let count = 0;
  for (const id of selected) {
    const s = byId.get(id);
    if (!s) continue;
    count += 1;
    durationMin += s.duration_min;
    price += s.price;
  }
  return { count, durationMin, price };
}

/** "Saç Kesim + Sakal" — selected service names joined in selection order. */
export function buildServiceSummary(services: SelectableService[], selected: string[]): string {
  const byId = new Map(services.map((s) => [s.id, s]));
  return selected
    .map((id) => byId.get(id)?.name)
    .filter((n): n is string => Boolean(n))
    .join(' + ');
}
