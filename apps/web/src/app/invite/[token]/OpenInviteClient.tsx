'use client';

import { useEffect } from 'react';
import {
  getInviteOpenUrl,
  ATTEMPT_KEY_PREFIX,
  shouldAutoOpen,
} from './invite-linking';

interface Props {
  token: string;
}

export default function OpenInviteClient({ token }: Props) {
  useEffect(() => {
    if (!shouldAutoOpen(sessionStorage, token)) {
      return;
    }

    const key = `${ATTEMPT_KEY_PREFIX}${token}`;

    const timer = setTimeout(() => {
      sessionStorage.setItem(key, '1');
      const fallbackUrl = window.location.href;
      const openUrl = getInviteOpenUrl(token, navigator.userAgent, fallbackUrl);
      window.location.assign(openUrl);
    }, 250);

    return () => clearTimeout(timer);
  }, [token]);

  function handleOpenApp() {
    const fallbackUrl = window.location.href;
    const openUrl = getInviteOpenUrl(token, navigator.userAgent, fallbackUrl);
    window.location.assign(openUrl);
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
          Berber Olarak Katıl
        </h1>
        <p className="mb-8 text-base leading-7 text-slate-600">
          Sıradaki uygulaması telefonunda kuruluysa otomatik açılır. Açılmazsa
          aşağıdaki butona dokun.
        </p>
        <button
          type="button"
          onClick={handleOpenApp}
          className="w-full rounded-xl bg-ink-900 px-5 py-4 text-center text-sm font-bold text-white"
        >
          Uygulamada Aç
        </button>
      </section>
    </main>
  );
}