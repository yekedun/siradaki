'use client';

import { useState, useTransition } from 'react';
import { Check, LockKeyhole, Store, X } from 'lucide-react';
import { approveShop, rejectShop, getPendingShops } from './actions';

type Shop = { id: string; name: string; slug: string; status: string; created_at: string };

const ADMIN_CSS = `
  .admin-v2 {
    --paper: #FBF8F1;
    --paper-2: #F2ECDF;
    --card: #FFFFFF;
    --ink: #1B1813;
    --ink-2: #5A534A;
    --ink-3: #938A7C;
    --line: #E5DECF;
    --line-2: #D8CFBC;
    --spruce: #184A3A;
    --brass: #9A7220;
    --brass-soft: #F0E7D2;
    --brick: #A23A2E;
    --brick-soft: #F3E2DF;
    --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
    --grot: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, monospace;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--grot);
    min-height: 100vh;
  }
  .admin-topbar {
    align-items: center;
    background: rgba(255,255,255,.86);
    border-bottom: 1px solid var(--line);
    display: flex;
    height: 52px;
    padding: 0 32px;
  }
  .admin-logo {
    align-items: center;
    display: flex;
    font-family: var(--serif);
    font-size: 16px;
    font-weight: 500;
    gap: 8px;
  }
  .admin-mark {
    background: var(--spruce);
    border-radius: 7px;
    height: 26px;
    width: 26px;
  }
  .admin-sep { background: var(--line-2); height: 18px; margin: 0 13px; width: 1px; }
  .admin-page-name { color: var(--ink-3); font-family: var(--serif); font-size: 13px; font-weight: 600; }
  .admin-badge {
    background: var(--brass-soft);
    border-radius: 999px;
    color: var(--brass);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .16em;
    margin-left: auto;
    padding: 5px 29px;
    text-transform: uppercase;
  }
  .admin-body { padding: 28px 40px 64px; }
  .admin-title {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -.01em;
    line-height: 1.05;
    margin: 0 0 6px;
  }
  .admin-copy {
    color: var(--ink-3);
    font-family: var(--serif);
    font-size: 12px;
    margin: 0 0 22px;
  }
  .admin-login {
    margin: 14vh auto 0;
    max-width: 420px;
  }
  .admin-login-card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 1px 0 rgba(27,24,19,.04), 0 6px 18px -10px rgba(27,24,19,.28);
    padding: 22px;
  }
  .admin-label {
    color: var(--ink-3);
    display: block;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .16em;
    margin: 18px 0 8px;
    text-transform: uppercase;
  }
  .admin-input {
    align-items: center;
    border: 1.5px solid var(--line-2);
    border-radius: 12px;
    display: flex;
    gap: 9px;
    height: 44px;
    padding: 0 12px;
  }
  .admin-input svg { color: var(--ink-3); height: 16px; width: 16px; }
  .admin-input input {
    background: transparent;
    border: 0;
    color: var(--ink);
    flex: 1;
    font-family: var(--grot);
    font-size: 14px;
    outline: none;
  }
  .admin-main-button {
    background: var(--spruce);
    border: 0;
    border-radius: 12px;
    color: #fff;
    cursor: pointer;
    font-family: var(--grot);
    font-size: 14px;
    font-weight: 800;
    height: 44px;
    margin-top: 14px;
    width: 100%;
  }
  .admin-table {
    border-collapse: collapse;
    width: 100%;
  }
  .admin-table th {
    border-bottom: 1px solid var(--line-2);
    color: var(--ink-3);
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .16em;
    padding: 0 0 10px;
    text-align: left;
    text-transform: uppercase;
  }
  .admin-table th:last-child { text-align: right; }
  .admin-table td {
    border-bottom: 1px solid var(--line);
    padding: 15px 0;
    vertical-align: middle;
  }
  .admin-shop {
    align-items: center;
    display: flex;
    gap: 12px;
  }
  .admin-shop-icon {
    align-items: center;
    background: var(--paper-2);
    border-radius: 9px;
    color: var(--ink-3);
    display: flex;
    height: 36px;
    justify-content: center;
    width: 36px;
  }
  .admin-shop-name { font-family: var(--serif); font-size: 14px; font-weight: 700; }
  .admin-shop-sub { color: var(--ink-3); font-family: var(--mono); font-size: 11px; margin-top: 2px; }
  .admin-date { color: var(--ink-3); font-family: var(--mono); font-size: 12px; }
  .admin-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .admin-action {
    align-items: center;
    border-radius: 10px;
    cursor: pointer;
    display: inline-flex;
    font-family: var(--serif);
    font-size: 12px;
    font-weight: 800;
    gap: 6px;
    height: 34px;
    justify-content: center;
    min-width: 88px;
    padding: 0 16px;
  }
  .admin-action:disabled { cursor: not-allowed; opacity: .5; }
  .admin-action.approve {
    background: var(--spruce);
    border: 0;
    box-shadow: 0 10px 20px -12px rgba(24,74,58,.75);
    color: #fff;
  }
  .admin-action.reject {
    background: transparent;
    border: 1.5px solid #E4C9C3;
    color: var(--brick);
  }
  .admin-empty {
    border-bottom: 1px solid var(--line);
    color: var(--ink-3);
    font-family: var(--serif);
    padding: 22px 0;
  }
  @media (max-width: 760px) {
    .admin-topbar { padding: 0 18px; }
    .admin-badge { display: none; }
    .admin-body { padding: 24px 18px 48px; }
    .admin-table, .admin-table tbody, .admin-table tr, .admin-table td { display: block; width: 100%; }
    .admin-table thead { display: none; }
    .admin-table tr { border-bottom: 1px solid var(--line); padding: 14px 0; }
    .admin-table td { border-bottom: 0; padding: 5px 0; }
    .admin-actions { justify-content: flex-start; margin-top: 8px; }
  }
`;

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isPending, startTransition] = useTransition();

  async function load(adminKey: string) {
    try {
      const data = await getPendingShops(adminKey);
      setShops(data);
      setAuthed(true);
    } catch {
      setAuthed(false);
      alert('Hatalı anahtar');
    }
  }

  function handleApprove(shopId: string) {
    startTransition(() => {
      approveShop(shopId, key).then(() => load(key));
    });
  }

  function handleReject(shopId: string) {
    startTransition(() => {
      rejectShop(shopId, key).then(() => load(key));
    });
  }

  const pending = shops.filter(s => s.status === 'pending');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <main className="admin-v2">
        <Header />
        {!authed ? (
          <section className="admin-login">
            <div className="admin-login-card">
              <h1 className="admin-title">Admin Girişi</h1>
              <p className="admin-copy">Bekleyen dükkan başvurularını yönetmek için admin anahtarını girin.</p>
              <label className="admin-label" htmlFor="admin-key">Admin anahtarı</label>
              <div className="admin-input">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="admin-key"
                  type="password"
                  placeholder="••••••••"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && load(key)}
                />
              </div>
              <button className="admin-main-button" onClick={() => load(key)}>Giriş</button>
            </div>
          </section>
        ) : (
          <section className="admin-body">
            <h1 className="admin-title">Bekleyen Başvurular</h1>
            <p className="admin-copy">
              Aşağıdaki dükkanlar inceleme bekliyor. Onayladıktan sonra owner panele erişim açılır.
            </p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dükkan</th>
                  <th>Başvuru Tarihi</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr><td colSpan={3} className="admin-empty">Bekleyen başvuru yok.</td></tr>
                ) : pending.map(shop => (
                  <ShopRow
                    key={shop.id}
                    shop={shop}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    disabled={isPending}
                  />
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </>
  );
}

function Header() {
  return (
    <div className="admin-topbar">
      <div className="admin-logo"><span className="admin-mark" />Sıra<strong>daki</strong></div>
      <div className="admin-sep" />
      <div className="admin-page-name">Admin Paneli</div>
      <div className="admin-badge">Sistem Yöneticisi</div>
    </div>
  );
}

function ShopRow({
  shop,
  onApprove,
  onReject,
  disabled,
}: {
  shop: Shop;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <tr>
      <td>
        <div className="admin-shop">
          <div className="admin-shop-icon"><Store size={15} aria-hidden="true" /></div>
          <div>
            <div className="admin-shop-name">{shop.name}</div>
            <div className="admin-shop-sub">siradaki.app/{shop.slug}</div>
          </div>
        </div>
      </td>
      <td><div className="admin-date">{formatDate(shop.created_at)}</div></td>
      <td>
        <div className="admin-actions">
          <button disabled={disabled} onClick={() => onApprove(shop.id)} className="admin-action approve">
            <Check size={14} aria-hidden="true" /> Onayla
          </button>
          <button disabled={disabled} onClick={() => onReject(shop.id)} className="admin-action reject">
            <X size={14} aria-hidden="true" /> Reddet
          </button>
        </div>
      </td>
    </tr>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value)).replace(',', ' ·');
}
