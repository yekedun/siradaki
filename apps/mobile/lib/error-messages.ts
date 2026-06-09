export function mapRegistrationError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (message.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (message.includes('Email not confirmed')) return 'Lütfen e-postanızı doğrulayın.';
  return 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.';
}

export function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (message.includes('Email not confirmed')) return 'E-posta adresin henüz doğrulanmamış.';
  if (message.includes('already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (message.includes('Too many requests')) return 'Çok fazla deneme. Birkaç dakika bekle.';
  if (message.includes('User not found')) return 'Bu e-posta adresiyle hesap bulunamadı.';
  if (message.includes('network')) return 'Bağlantı hatası. İnternet bağlantını kontrol et.';
  return 'Giriş yapılamadı. Tekrar dene.';
}

export function genericSaveErrorMessage(): string {
  return 'Kaydedilemedi. Lütfen tekrar deneyin.';
}
