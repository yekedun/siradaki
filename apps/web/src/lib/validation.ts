/**
 * Tekrar kullanılabilir validasyon yardımcıları.
 * Tüm web sayfaları bu dosyadan import eder — inline tanım yapmaz.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Shared ile aynı kural: Türk mobil numaraları (5xx ile başlayan), +90/0/90 prefix opsiyonel
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+90|0)?[5][0-9]{9}$/.test(digits);
}
