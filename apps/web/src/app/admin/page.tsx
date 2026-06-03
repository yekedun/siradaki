'use client';

import { useState, useTransition } from 'react';
import { approveShop, rejectShop, getShops } from './actions';

type Owner = { name: string; email: string | null } | null;
type Shop = {
  id: string; name: string; slug: string; status: string;
  created_at: string; owner_user_id: string; owner: Owner;
};

const STATUS_COLOR: Record<string, string> = {
  pending:  '#F59E0B',
  active:   '#10B981',
  rejected: '#EF4444',
};

const PAGE_SIZE = 20;

export default function AdminPage() {
  const [key,        setKey]        = useState('');
  const [authed,     setAuthed]     = useState(false);
  const [shops,      setShops]      = useState<Shop[]>([]);
  const [page,       setPage]       = useState(0);
  const [total,      setTotal]      = useState(0);
  const [isPending,  startTransition] = useTransition();

  async function load(adminKey: string, p = 0) {
    try {
      const result = await getShops(adminKey, p, PAGE_SIZE);
      setShops(result.data);
      setTotal(result.total);
      setPage(p);
      setAuthed(true);
    } catch { setAuthed(false); alert('Hatalı anahtar'); }
  }

  function handleApprove(shopId: string) {
    startTransition(() => {
      approveShop(shopId, key).then(() => load(key, page));
    });
  }

  function handleReject(shopId: string) {
    startTransition(() => {
      rejectShop(shopId, key).then(() => load(key, page));
    });
  }

  if (!authed) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
      <h2 style={{ margin: 0 }}>Admin Girişi</h2>
      <input
        type="password"
        placeholder="Admin anahtarı"
        value={key}
        onChange={e => setKey(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && load(key)}
        style={{ padding: '10px 14px', fontSize: 15, border: '1px solid #CBD5E1', borderRadius: 8 }}
      />
      <button onClick={() => load(key)}
        style={{ padding: '10px 20px', background: '#1E3A8A', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
        Giriş
      </button>
    </div>
  );

  const pending = shops.filter(s => s.status === 'pending');
  const rest    = shops.filter(s => s.status !== 'pending');
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h2 style={{ margin: '0 0 16px' }}>Bekleyen Başvurular ({pending.length})</h2>
        {pending.length === 0 && <p style={{ color: '#64748B' }}>Bekleyen başvuru yok.</p>}
        {pending.map(shop => (
          <ShopRow key={shop.id} shop={shop} onApprove={handleApprove}
            onReject={handleReject} disabled={isPending} />
        ))}
      </div>
      <div>
        <h2 style={{ margin: '0 0 16px' }}>Tüm Kayıtlar ({total})</h2>
        {rest.map(shop => (
          <ShopRow key={shop.id} shop={shop} onApprove={handleApprove}
            onReject={handleReject} disabled={isPending} />
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            disabled={page === 0 || isPending}
            onClick={() => load(key, page - 1)}
            style={{ padding: '8px 18px', border: '1px solid #CBD5E1', borderRadius: 7,
                      background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer',
                      opacity: page === 0 ? 0.4 : 1 }}>
            ← Önceki
          </button>
          <span style={{ fontSize: 13, color: '#64748B' }}>
            Sayfa {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1 || isPending}
            onClick={() => load(key, page + 1)}
            style={{ padding: '8px 18px', border: '1px solid #CBD5E1', borderRadius: 7,
                      background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                      opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}

function ShopRow({ shop, onApprove, onReject, disabled }: {
  shop: Shop; onApprove: (id: string) => void;
  onReject: (id: string) => void; disabled: boolean;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
                   padding: '16px 20px', marginBottom: 10, display: 'flex',
                   alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{shop.name}</div>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
          siradaki.app/{shop.slug} · {new Date(shop.created_at).toLocaleString('tr-TR')}
        </div>
        {shop.owner && (
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
            {shop.owner.name}
            {shop.owner.email && <> · <a href={`mailto:${shop.owner.email}`}
              style={{ color: '#1E3A8A' }}>{shop.owner.email}</a></>}
          </div>
        )}
      </div>
      <span style={{ background: STATUS_COLOR[shop.status] + '22',
                      color: STATUS_COLOR[shop.status], padding: '3px 10px',
                      borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        {shop.status === 'pending' ? 'Bekliyor' : shop.status === 'active' ? 'Aktif' : 'Reddedildi'}
      </span>
      {shop.status === 'pending' && (
        <>
          <button disabled={disabled} onClick={() => onApprove(shop.id)}
            style={{ padding: '7px 16px', background: '#10B981', color: '#fff',
                      border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
            Onayla
          </button>
          <button disabled={disabled} onClick={() => onReject(shop.id)}
            style={{ padding: '7px 16px', background: '#EF4444', color: '#fff',
                      border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
            Reddet
          </button>
        </>
      )}
    </div>
  );
}
