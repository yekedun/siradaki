import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@berber/db';
import OpenInviteClient from './OpenInviteClient';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Sıradaki Davet',
  description: 'Sıradaki berber davetini uygulamada aç.',
};

type InviteState = 'valid' | 'not_found' | 'used' | 'expired';

async function getInviteState(token: string): Promise<InviteState> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from('invite_tokens')
    .select('used_at, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return 'not_found';
  if (data.used_at) return 'used';
  if (new Date(data.expires_at) < new Date()) return 'expired';
  return 'valid';
}

const ERROR_COPY: Record<Exclude<InviteState, 'valid'>, { title: string; body: string }> = {
  not_found: {
    title: 'Geçersiz Davet',
    body: 'Bu davet bağlantısı geçerli değil. Lütfen dükkan sahibinden yeni bir davet isteyin.',
  },
  used: {
    title: 'Davet Kullanılmış',
    body: 'Bu davet daha önce kullanılmış. Her davetle yalnızca bir kişi katılabilir.',
  },
  expired: {
    title: 'Davetin Süresi Dolmuş',
    body: 'Bu davetin süresi dolmuş (48 saat). Lütfen dükkan sahibinden yeni bir davet isteyin.',
  },
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const state = await getInviteState(token);

  if (state !== 'valid') {
    const { title, body } = ERROR_COPY[state];
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-ink-900">
        <section className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-500">
            !
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
            Sıradaki Davet
          </p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-base leading-7 text-slate-600">{body}</p>
        </section>
      </main>
    );
  }

  return <OpenInviteClient token={token} />;
}
