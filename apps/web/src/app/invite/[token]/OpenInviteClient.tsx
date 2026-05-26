'use client';

import { useEffect, useMemo, useState } from 'react';

interface Props {
  token: string;
}

export default function OpenInviteClient({ token }: Props) {
  const [copied, setCopied] = useState(false);
  const deepLink = useMemo(() => `siradaki://invite/${token}`, [token]);

  useEffect(() => {
    window.location.href = deepLink;
  }, [deepLink]);

  async function copyLink() {
    await navigator.clipboard.writeText(deepLink);
    setCopied(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-ink-900">
      <section className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 text-2xl font-bold text-white">
          S
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Sıradaki Davet
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          Uygulama Açılıyor
        </h1>
        <p className="mb-8 text-base leading-7 text-slate-600">
          Daveti kabul etmek için Sıradaki uygulaması açılacak. Açılmazsa aşağıdaki butonla tekrar deneyebilirsin.
        </p>
        <a
          href={deepLink}
          className="mb-3 w-full rounded-xl bg-ink-900 px-5 py-4 text-center text-sm font-bold text-white no-underline"
        >
          Uygulamada Aç
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-sm font-bold text-ink-900"
        >
          {copied ? 'Kopyalandı' : 'Deep Linki Kopyala'}
        </button>
      </section>
    </main>
  );
}
