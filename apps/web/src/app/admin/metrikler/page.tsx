'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAdminKey } from '../context';
import { getMetrics, type Metrics } from './actions';

const CARDS = [
  { key: 'totalShops',   label: 'Toplam Dükkan',    color: '#1E3A8A' },
  { key: 'activeShops',  label: 'Aktif Dükkan',      color: '#10B981' },
  { key: 'pendingShops', label: 'Bekleyen Başvuru',  color: '#F59E0B' },
  { key: 'totalUsers',   label: 'Toplam Kullanıcı', color: '#8B5CF6' },
] as const;

export default function MetriklerPage() {
  const adminKey = useAdminKey();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!adminKey) return;
    getMetrics(adminKey)
      .then(setMetrics)
      .catch(e => setError(e instanceof Error ? e.message : 'Yüklenemedi'));
  }, [adminKey]);

  if (error) return <p style={{ color: '#EF4444' }}>{error}</p>;
  if (!metrics) return <p style={{ color: '#64748B' }}>Yükleniyor…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Platform Metrikleri</h2>

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {CARDS.map(card => (
          <div key={card.key} style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
            padding: '20px 24px', borderTop: `4px solid ${card.color}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
              {metrics[card.key]}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* 30 günlük trend */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
          Son 30 Gün
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={metrics.dailyStats} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickFormatter={(d: string) => {
                const [, m, day] = d.split('-');
                return `${day}/${m}`;
              }}
              interval={4}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(d) => {
                const str = String(d);
                return new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
              }}
              formatter={(value, name) => [
                value,
                name === 'shops' ? 'Yeni Dükkan' : 'Yeni Randevu',
              ]}
            />
            <Legend
              formatter={(name: string) => name === 'shops' ? 'Yeni Dükkan' : 'Yeni Randevu'}
            />
            <Bar dataKey="shops"        fill="#1E3A8A" radius={[3, 3, 0, 0] as [number, number, number, number]} />
            <Bar dataKey="appointments" fill="#10B981" radius={[3, 3, 0, 0] as [number, number, number, number]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
