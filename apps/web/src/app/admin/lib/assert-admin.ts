import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe admin key doğrulaması.
 * Hatalı key veya eksik env var durumunda exception fırlatır.
 */
export function assertAdmin(adminKey: string): void {
  const secret = process.env.ADMIN_SECRET_KEY ?? '';
  if (!secret) throw new Error('ADMIN_SECRET_KEY env var eksik');
  const maxLen = Math.max(adminKey.length, secret.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  Buffer.from(adminKey).copy(a);
  Buffer.from(secret).copy(b);
  if (!timingSafeEqual(a, b)) throw new Error('Yetkisiz');
}
