'use client';

import { useEffect } from 'react';
import {
  getInviteOpenUrl,
  ATTEMPT_KEY_PREFIX,
  shouldAutoOpen,
} from './invite-linking';

// Update these when the app is published to stores
const APP_STORE_URL = 'https://apps.apple.com/app/siradaki/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.siradaki.app';

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

        <div className="mt-10 w-full border-t border-slate-200 pt-8">
          <p className="mb-4 text-sm text-slate-500">
            Sıradaki uygulaması telefonunda yüklü değil mi?
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              App Store&apos;dan İndir (iPhone)
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Google Play&apos;den İndir (Android)
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}