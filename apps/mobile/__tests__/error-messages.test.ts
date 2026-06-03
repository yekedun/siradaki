import {
  genericSaveErrorMessage,
  mapRegistrationError,
} from '../lib/error-messages';

describe('mobile error messages', () => {
  it('maps unknown registration exceptions to a retry message', () => {
    expect(mapRegistrationError(new Error('Network request failed'))).toBe(
      'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.',
    );
  });

  it('returns the onboarding save failure copy used in alerts', () => {
    expect(genericSaveErrorMessage()).toBe('Kaydedilemedi. Lütfen tekrar deneyin.');
  });
});
