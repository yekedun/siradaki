'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminKeyContext } from './context';

const SESSION_KEY = 'admin_key';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [key, setKey]       = useState('');
  const [input, setInput]   = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // sessionStorage'dan key'i yükle
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setKey(stored);
  }, []);

  const handleLogin = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: input }),
      });
      if (!res.ok) throw new Error('Hatalı anahtar');
      sessionStorage.setItem(SESSION_KEY, input);
      setKey(input);
    } catch {
      setError('Hatalı anahtar. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setKey('');
    setInput('');
  }, []);

  if (!key) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F7F8FA',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360, padding: 32,
          background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E3A8A' }}>Sıradaki Admin</h2>
          <input
            type="password"
            placeholder="Admin anahtarı"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ padding: '10px 14px', fontSize: 15, border: '1px solid #CBD5E1',
              borderRadius: 8, outline: 'none' }}
          />
          {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#1E3A8A', color: '#fff',
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Kontrol ediliyor…' : 'Giriş'}
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin/metrikler', label: 'Metrikler' },
    { href: '/admin/dukkanlar', label: 'Dükkanlar' },
  ];

  return (
    <AdminKeyContext.Provider value={key}>
      <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#1E3A8A', color: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Sıradaki Admin</span>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} style={{
                fontSize: 13, color: pathname.startsWith(item.href) ? '#fff' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none', fontWeight: pathname.startsWith(item.href) ? 600 : 400,
                borderBottom: pathname.startsWith(item.href) ? '2px solid #fff' : '2px solid transparent',
                paddingBottom: 2,
              }}>
                {item.label}
              </Link>
            ))}
          </div>
          <button onClick={handleLogout} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)',
            background: 'none', border: 'none', cursor: 'pointer' }}>
            Çıkış
          </button>
        </div>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
          {children}
        </div>
      </div>
    </AdminKeyContext.Provider>
  );
}
