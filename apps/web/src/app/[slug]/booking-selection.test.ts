import { describe, it, expect } from 'vitest';
import { toggleService, computeTotals, buildServiceSummary, type SelectableService } from './booking-selection';

const SERVICES: SelectableService[] = [
  { id: 'a', name: 'Saç Kesim', duration_min: 30, price: 200 },
  { id: 'b', name: 'Sakal',     duration_min: 20, price: 120 },
  { id: 'c', name: 'Yıkama',    duration_min: 15, price: 80  },
];

describe('toggleService', () => {
  it('adds an id that is not selected', () => {
    expect(toggleService(['a'], 'b')).toEqual(['a', 'b']);
  });
  it('removes an id that is already selected', () => {
    expect(toggleService(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('keeps at least nothing-special: empty in, single out', () => {
    expect(toggleService([], 'a')).toEqual(['a']);
  });
});

describe('computeTotals', () => {
  it('sums duration and price for selected ids only', () => {
    expect(computeTotals(SERVICES, ['a', 'b'])).toEqual({ count: 2, durationMin: 50, price: 320 });
  });
  it('returns zeros for empty selection', () => {
    expect(computeTotals(SERVICES, [])).toEqual({ count: 0, durationMin: 0, price: 0 });
  });
  it('ignores ids not present in the service list', () => {
    expect(computeTotals(SERVICES, ['a', 'zzz'])).toEqual({ count: 1, durationMin: 30, price: 200 });
  });
});

describe('buildServiceSummary', () => {
  it('joins selected service names in list order', () => {
    expect(buildServiceSummary(SERVICES, ['a', 'b'])).toBe('Saç Kesim + Sakal');
  });
  it('returns empty string for empty selection', () => {
    expect(buildServiceSummary(SERVICES, [])).toBe('');
  });
});
