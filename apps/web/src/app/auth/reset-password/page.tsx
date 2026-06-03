'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { mapSupabaseError } from '@/lib/auth-errors';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // PKCE code exchange durumu
  const [codeExchanged, setCodeExchanged] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  const canSubmit = password.length >= 8 && password === passwordConfirm;

  // Mount'ta URL'deki ?code= parametresini exchange et
  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      // Deep link veya test ortamında code olmayabilir — direkt forma geç
      setCodeExchanged(true);
      return;
    }
    setExchanging(true);
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) {
        setCodeError('Bu bağlantının süresi dolmuş veya geçersiz. Lütfen yeni bir sıfırlama bağlantısı isteyin.');
      } else {
        setCodeExchanged(true);
      }
      setExchanging(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(mapSupabaseError(updateErr.message));
        return;
      }
      setSuccess('Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz.');
      window.setTimeout(() => router.replace('/giris'), 1200);
    } finally {
      setLoading(false);
    }
  }

  // Code exchange devam ediyor
  if (exchanging) {
    return (
      <main className="min-h-screen bg-[#F9F9F6] flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-slate-500">Bağlantı doğrulanıyor…</p>
        </div>
      </main>
    );
  }

  // Code geçersiz/süresi dolmuş
  if (codeError) {
    return (
      <main className="min-h-screen bg-[#F9F9F6] flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 mb-8">
            Sıradaki
          </Link>
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.22em] uppercase text-[#FF4D1C] mb-2">Şifre Sıfırlama</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Bağlantı Geçersiz</h1>
          </div>
          <p className="bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">{codeError}</p>
          <Link
            href="/giris"
            className="block w-full bg-[#FF4D1C] text-white font-bold py-3.5 text-center text-sm"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      </main>
    );
  }

  // Normal form (codeExchanged === true)
  return (
    <main className="min-h-screen bg-[#F9F9F6] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 mb-8">
          Sıradaki
        </Link>

        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.22em] uppercase text-[#FF4D1C] mb-2">Şifre Sıfırlama</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Yeni şifreni belirle</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Yeni şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-900"
              required
            />
          </div>

          <div>
            <label htmlFor="password-confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Yeni şifre tekrar
            </label>
            <input
              id="password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-900"
              required
            />
          </div>

          {error && <p className="bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</p>}
          {success && <p className="bg-green-50 text-green-700 px-4 py-3 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full bg-[#FF4D1C] text-white font-bold py-3.5 disabled:opacity-50 text-sm"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/giris" className="font-semibold text-[#1E3A8A] hover:underline">Giriş sayfasına dön</Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
