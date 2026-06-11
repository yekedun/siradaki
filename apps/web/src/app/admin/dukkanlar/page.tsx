'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useAdminKey } from '../context';
import {
  getShops, approveShop, rejectShop, suspendShop, reactivateShop,
  type Shop, type ShopStatus,
} from './actions';

const STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  active:    '#10B981',
  rejected:  '#EF4444',
  suspended: '#6B7280',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Bekliyor',
  active:    'Aktif',
  rejected:  'Reddedildi',
  suspended: 'Durduruldu',
};

const PAGE_SIZE = 20;

type FilterStatus = ShopStatus | 'all';

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all',       label: 'Tümü' },
  { value: 'pending',   label: 'Bekliyor' },
  { value: 'active',    label: 'Aktif' },
  { value: 'suspended', label: 'Durduruldu' },
  { value: 'rejected',  label: 'Reddedildi' },
];

export default function DukkanlarPage() {
  const adminKey = useAdminKey();
  const [shops,       setShops]       = useState<Shop[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);
  const [filter,      setFilter]      = useState<FilterStatus>('all');
  const [search,      setSearch]      = useState('');
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [isPending,   startTransition] = useTransition();
  const [loadError,   setLoadError]   = useState('');

  const load = useCallback(async (p: number, f: FilterStatus) => {
    setLoadError('');
    try {
      const result = await getShops(adminKey, p, PAGE_SIZE, f === 'all' ? undefined : f);
      setShops(result.data);
      setTotal(result.total);
      setPage(p);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi');
    }
  }, [adminKey]);

  useEffect(() => {
    if (adminKey) load(0, 'all');
  }, [adminKey, load]);

  function handleFilterChange(f: FilterStatus) {
    setFilter(f);
    load(0, f);
  }

  function handleAction(fn: () => Promise<void | { error?: string }>) {
    startTransition(() => {
      fn()
        .then((res) => {
          if (res?.error) { setLoadError(res.error); return; }
          load(page, filter);
        })
        .catch((e) => setLoadError(e instanceof Error ? e.message : 'İşlem başarısız'));
    });
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  const displayed = search.trim()
    ? shops.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.slug.toLowerCase().includes(search.toLowerCase()) ||
        (s.owner?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.owner?.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : shops;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Dükkanlar</h2>

      {/* Araç çubuğu */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Dükkan adı, slug, owner adı veya e-posta ara…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', fontSize: 14,
            border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              style={{
                padding: '7px 14px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
                border: filter === opt.value ? '2px solid #1E3A8A' : '1px solid #CBD5E1',
                background: filter === opt.value ? '#EFF6FF' : '#fff',
                color: filter === opt.value ? '#1E3A8A' : '#475569',
                fontWeight: filter === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <p style={{ color: '#EF4444', fontSize: 14, margin: 0 }}>{loadError}</p>
      )}

      {displayed.length === 0 && !loadError && (
        <p style={{ color: '#64748B', fontSize: 14 }}>Kayıt bulunamadı.</p>
      )}

      {displayed.map(shop => (
        <ShopRow
          key={shop.id}
          shop={shop}
          expanded={expandedId === shop.id}
          disabled={isPending}
          onToggle={() => toggleExpand(shop.id)}
          onApprove={() => handleAction(() => approveShop(shop.id, adminKey))}
          onReject={()  => handleAction(() => rejectShop(shop.id, adminKey))}
          onSuspend={()  => handleAction(() => suspendShop(shop.id, adminKey))}
          onReactivate={() => handleAction(() => reactivateShop(shop.id, adminKey))}
        />
      ))}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            disabled={page === 0 || isPending}
            onClick={() => load(page - 1, filter)}
            style={{ padding: '8px 18px', border: '1px solid #CBD5E1', borderRadius: 7,
              background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.4 : 1 }}
          >
            ← Önceki
          </button>
          <span style={{ fontSize: 13, color: '#64748B' }}>
            Sayfa {page + 1} / {totalPages} · Toplam {total}
          </span>
          <button
            disabled={page >= totalPages - 1 || isPending}
            onClick={() => load(page + 1, filter)}
            style={{ padding: '8px 18px', border: '1px solid #CBD5E1', borderRadius: 7,
              background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}

function ShopRow({ shop, expanded, disabled, onToggle, onApprove, onReject, onSuspend, onReactivate }: {
  shop: Shop;
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>

      {/* Kompakt satır */}
      <div
        onClick={onToggle}
        style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer', userSelect: 'none',
          background: expanded ? '#F8FAFC' : '#fff',
          borderBottom: expanded ? '1px solid #E2E8F0' : 'none',
        }}
      >
        {/* Chevron */}
        <span style={{
          fontSize: 10, color: '#94A3B8', flexShrink: 0,
          display: 'inline-block', transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'none',
        }}>▶</span>

        {/* Dükkan adı + slug */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shop.name}
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
            siradaki.app/{shop.slug}
          </div>
        </div>

        {/* Owner özet */}
        <div style={{ minWidth: 180, fontSize: 13, color: '#475569' }}>
          {shop.owner ? (
            <>
              <div style={{ fontWeight: 500 }}>{shop.owner.name}</div>
              <div style={{ color: '#94A3B8', fontSize: 12 }}>{shop.owner.email ?? '—'}</div>
            </>
          ) : (
            <span style={{ color: '#CBD5E1', fontStyle: 'italic', fontSize: 12 }}>Owner kaydı yok</span>
          )}
        </div>

        {/* Durum badge */}
        <span style={{
          background: STATUS_COLOR[shop.status] + '22',
          color: STATUS_COLOR[shop.status],
          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          flexShrink: 0,
        }}>
          {STATUS_LABEL[shop.status] ?? shop.status}
        </span>

        {/* Aksiyon butonları — tıklama izole */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {shop.status === 'pending' && (
            <>
              <button disabled={disabled} onClick={onApprove}
                style={{ padding: '6px 12px', background: '#10B981', color: '#fff',
                  border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                Onayla
              </button>
              <button disabled={disabled} onClick={onReject}
                style={{ padding: '6px 12px', background: '#EF4444', color: '#fff',
                  border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                Reddet
              </button>
            </>
          )}
          {shop.status === 'active' && (
            <button disabled={disabled} onClick={onSuspend}
              style={{ padding: '6px 12px', background: '#6B7280', color: '#fff',
                border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
              Durdur
            </button>
          )}
          {shop.status === 'suspended' && (
            <button disabled={disabled} onClick={onReactivate}
              style={{ padding: '6px 12px', background: '#1E3A8A', color: '#fff',
                border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
              Aktif Et
            </button>
          )}
        </div>
      </div>

      {/* Expanded detay paneli */}
      {expanded && (
        <div style={{
          padding: '16px 20px 20px 48px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px',
          background: '#F8FAFC',
        }}>
          {/* Sol: Owner */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Hesap Sahibi
            </div>
            {shop.owner ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <DetailRow label="Ad Soyad" value={shop.owner.name} />
                <DetailRow label="E-posta" value={shop.owner.email}
                  href={shop.owner.email ? `mailto:${shop.owner.email}` : undefined} />
                <DetailRow label="Telefon" value={shop.owner.phone}
                  href={shop.owner.phone ? `tel:${shop.owner.phone}` : undefined} />
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#CBD5E1', fontStyle: 'italic', margin: 0 }}>
                Kayıt bilgisi bulunamadı
              </p>
            )}
          </div>

          {/* Sağ: Dükkan */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Dükkan Detayı
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <DetailRow label="Adres" value={shop.address} />
              <DetailRow label="Dükkan Tel" value={shop.phone}
                href={shop.phone ? `tel:${shop.phone}` : undefined} />
              <DetailRow label="Listeleme" value={shop.is_listed ? 'Listede' : 'Gizli'} />
              <DetailRow label="Kayıt" value={new Date(shop.created_at).toLocaleString('tr-TR')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, href }: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13 }}>
      <span style={{ color: '#94A3B8', minWidth: 80, flexShrink: 0 }}>{label}:</span>
      {href && value ? (
        <a href={href} style={{ color: '#1E3A8A' }}>{value}</a>
      ) : (
        <span style={{ color: value ? '#1E293B' : '#CBD5E1' }}>{value ?? '—'}</span>
      )}
    </div>
  );
}
