import { describe, expect, it } from 'vitest';

import { missingWorkingHoursMessage, shopSaveErrorMessage } from './error-messages';

describe('dashboard settings error messages', () => {
  it('explains why saving cannot continue when working hours are missing', () => {
    expect(missingWorkingHoursMessage()).toBe(
      'Çalışma saatleri henüz ayarlanmamış. Lütfen önce çalışma saatlerini girin.',
    );
  });

  it('includes the failed save reason when one is available', () => {
    expect(shopSaveErrorMessage('permission denied')).toBe(
      'Ayarlar kaydedilemedi: permission denied',
    );
  });
});
