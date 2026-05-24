import { buildBlockInsert } from '../lib/block-actions';

describe('buildBlockInsert', () => {
  it('returns an error when staffId is missing', () => {
    const result = buildBlockInsert({
      staffId: null,
      startTime: '09:30',
      durationMin: 30,
      reason: 'mola',
      baseDate: new Date(2026, 4, 24, 8, 0, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Hesap bilgileri');
    }
  });

  it('builds a Supabase insert payload only when staffId exists', () => {
    const result = buildBlockInsert({
      staffId: 'staff-1',
      startTime: '09:30',
      durationMin: 45,
      reason: 'kisisel',
      baseDate: new Date(2026, 4, 24, 8, 0, 0),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toMatchObject({
        staff_id: 'staff-1',
        reason: 'personal',
        created_via: 'app',
      });
      expect(result.payload.starts_at).toBe(new Date(2026, 4, 24, 9, 30, 0).toISOString());
      expect(result.payload.ends_at).toBe(new Date(2026, 4, 24, 10, 15, 0).toISOString());
    }
  });
});
