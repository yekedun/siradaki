'use client';

import { useEffect, useState } from 'react';
import { UserPlus, UserX, UserCheck, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getStaff, setStaffActive, canDeactivateStaff } from '@berber/db';

type Staff = {
  id: string;
  user_id: string | null;
  name: string;
  role: string;
  is_active: boolean;
  slug: string | null;
};

export default function EkipPage() {
  const [staff, setStaff]           = useState<Staff[]>([]);
  const [shopId, setShopId]         = useState<string | null>(null);
  const [shopSlug, setShopSlug]     = useState<string | null>(null);
  const [ownerId, setOwnerId]       = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const supabase = createClient();

  async function load(sid: string) {
    const { data } = await getStaff(supabase, sid);
    setStaff((data ?? []) as Staff[]);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setOwnerId(user.id);
      const { data: shop } = await supabase
        .from('shops').select('id, slug')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      setShopSlug(shop.slug);
      load(shop.id);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleActive(s: Staff) {
    if (!shopId) return;
    if (!s.is_active) {
      await setStaffActive(supabase, s.id, shopId, true);
      load(shopId);
      return;
    }
    const canDeactivate = await canDeactivateStaff(supabase, shopId, s.id);
    if (!canDeactivate) {
      setError('Başka aktif personel eklemeden kendinizi devre dışı bırakamazsınız.');
      return;
    }
    if (!confirm(`${s.name} adlı personeli pasif yapmak istediğine emin misin?`)) return;
    await setStaffActive(supabase, s.id, shopId, false);
    load(shopId);
  }

  async function handleInvite() {
    if (!shopId) return;
    setInviting(true); setError(null); setInviteLink(null);
    try {
      const res = await fetch('/api/invite-barber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Davet oluşturulamadı'); return; }
      setInviteLink(json.invite_link ?? json.deep_link ?? null);
    } finally {
      setInviting(false);
    }
  }

  const activeStaff   = staff.filter(s => s.is_active);
  const inactiveStaff = staff.filter(s => !s.is_active);

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ekip Yönetimi</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Ustalar</h1>
        </div>
        <button
          onClick={handleInvite}
          disabled={inviting}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus size={16} /> Personel Ekle
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {inviteLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-blue-900 mb-1">Davet Linki Oluşturuldu</p>
          <p className="text-xs text-blue-700 mb-2">Bu linki personeline WhatsApp veya SMS ile gönder.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 break-all">{inviteLink}</code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Kopyala
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 mb-4">
        {activeStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aktif personel yok</div>
        ) : activeStaff.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-blue-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
              {(s.name ?? '?')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-400">
                {s.role === 'admin' ? 'Yönetici' : 'Personel'}
                {s.user_id === ownerId ? ' · Hesap Sahibi' : s.user_id ? ' · Kayıtlı' : ' · Davet bekleniyor'}
              </p>
            </div>
            {s.slug && shopSlug && (
              <a href={`/${shopSlug}/u/${s.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ExternalLink size={14} className="text-gray-400" />
              </a>
            )}
            <button onClick={() => handleToggleActive(s)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
              <UserX size={14} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {inactiveStaff.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Pasif</p>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 opacity-60">
            {inactiveStaff.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-gray-300 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {(s.name ?? '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{s.name}</p>
                  <p className="text-xs text-gray-400">Pasif</p>
                </div>
                <button onClick={() => handleToggleActive(s)} className="p-2 rounded-lg hover:bg-green-50 transition-colors">
                  <UserCheck size={14} className="text-gray-400 hover:text-green-600" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
