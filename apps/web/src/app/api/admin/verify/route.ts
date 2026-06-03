import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

function assertAdmin(adminKey: string): boolean {
  const secret = process.env.ADMIN_SECRET_KEY ?? '';
  if (!secret) return false;
  const maxLen = Math.max(adminKey.length, secret.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  Buffer.from(adminKey).copy(a);
  Buffer.from(secret).copy(b);
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json() as { key: string };
    if (!assertAdmin(key ?? '')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }
}
