import { describe, expect, it } from 'vitest';

import { mapSupabaseError } from './error-messages';

describe('mapSupabaseError', () => {
  it('maps duplicate registration errors to Turkish copy', () => {
    expect(mapSupabaseError('User already registered')).toBe('Bu e-posta adresi zaten kayıtlı.');
  });

  it('maps unknown signup failures to a generic retry message', () => {
    expect(mapSupabaseError('Network request failed')).toBe('Bir hata oluştu. Lütfen tekrar deneyin.');
  });
});
