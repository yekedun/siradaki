'use client';

import { useState, useTransition, useEffect } from 'react';
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
  const [isPending,   startTransition] = useTransition();
  const [loadError,   setLoadError]   = useState('');

  async function load(p = 0, f: FilterStatus = filter) {
    setLoadError('');
    try {
      const result = await getShops(adminKey, p, PAGE_SIZE, f === 'all' ? undefined : f);
      setShops(result.data);
      setTotal(result.total);
      setPage(p);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Yüklenemedi');
    }
  }

  useEffect(() => {
    if (adminKey) load(0, filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  function handleFilterChange(f: FilterStatus) {
    setFilter(f);
    load(0, f);
  }

  function handleAction(fn: () => Promise<unknown>) {
    startTransition(() => {
      fn()
        .then(() => load(page, filter))
        .catch((e) => setLoadError(e instanceof Error ? e.message : 'İşlem başarısız'));
    });
  }

  const displayed = search.trim()
    ? shops.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.slug.toLowerCase().includes(search.toLowerCase())
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
          placeholder="Ad veya slug ara…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', fontSize: 14,
            border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
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
        <p style={{ color: '#EF4444', fontSize: 14 }}>{loadError}</p>
      )}

      {/* Liste */}
      {displayed.length === 0 && !loadError && (
        <p style={{ color: '#64748B', fontSize: 14 }}>Kayıt bulunamadı.</p>
      )}
      {displayed.map(shop => (
        <ShopRow
          key={shop.id}
          shop={shop}
          disabled={isPending}
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
            onClick={() => load(page - 1)}
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
            onClick={() => load(page + 1)}
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

function ShopRow({ shop, disabled, onApprove, onReject, onSuspend, onReactivate }: {
  shop: Shop;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{shop.name}</div>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
          siradaki.app/{shop.slug} · {new Date(shop.created_at).toLocaleString('tr-TR')}
        </div>
        {shop.owner && (
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
            {shop.owner.name}
            {shop.owner.email && (
              <> · <a href={`mailto:${shop.owner.email}`} style={{ color: '#1E3A8A' }}>
                {shop.owner.email}
              </a></>
            )}
          </div>
        )}
      </div>

      <span style={{
        background: STATUS_COLOR[shop.status] + '22',
        color: STATUS_COLOR[shop.status],
        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      }}>
        {STATUS_LABEL[shop.status] ?? shop.status}
      </span>

      {shop.status === 'pending' && (
        <>
          <button disabled={disabled} onClick={onApprove}
            style={{ padding: '7px 14px', background: '#10B981', color: '#fff',
              border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
            Onayla
          </button>
          <button disabled={disabled} onClick={onReject}
            style={{ padding: '7px 14px', background: '#EF4444', color: '#fff',
              border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
            Reddet
          </button>
        </>
      )}

      {shop.status === 'active' && (
        <button disabled={disabled} onClick={onSuspend}
          style={{ padding: '7px 14px', background: '#6B7280', color: '#fff',
            border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
          Durdur
        </button>
      )}

      {shop.status === 'suspended' && (
        <button disabled={disabled} onClick={onReactivate}
          style={{ padding: '7px 14px', background: '#1E3A8A', color: '#fff',
            border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
          Aktif Et
        </button>
      )}
    </div>
  );
}
