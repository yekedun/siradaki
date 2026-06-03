export function mapRegistrationError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (message.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (message.includes('Email not confirmed')) return 'Lütfen e-postanızı doğrulayın.';
  return 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.';
}

export function genericSaveErrorMessage(): string {
  return 'Kaydedilemedi. Lütfen tekrar deneyin.';
}
