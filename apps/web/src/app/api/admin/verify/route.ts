import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '../../../admin/lib/assert-admin';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json() as { key: string };
    assertAdmin(key ?? '');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
}
