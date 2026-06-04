import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '../../../admin/lib/assert-admin';

// In-memory rate limit: 5 attempts per IP per 10 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Çok fazla deneme. 10 dakika sonra tekrar deneyin.' }, { status: 429 });
  }

  try {
    const { key } = await req.json() as { key: string };
    assertAdmin(key ?? '');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
}
