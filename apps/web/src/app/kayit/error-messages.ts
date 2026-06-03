export function mapSupabaseError(msg: string): string {
  if (msg.includes('already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (msg.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (msg.includes('Email not confirmed')) return 'Lütfen e-postanızı doğrulayın.';
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
