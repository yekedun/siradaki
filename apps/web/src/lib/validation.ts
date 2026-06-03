/**
 * Tekrar kullanılabilir validasyon yardımcıları.
 * Tüm web sayfaları bu dosyadan import eder — inline tanım yapmaz.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9]{10,11}$/.test(phone.replace(/[\s-]/g, ''));
}
