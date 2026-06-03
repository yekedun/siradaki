'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getServices, upsertService, toggleService, deleteService } from '@berber/db';

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
  is_active: boolean;
};

type Form = { id?: string; name: string; duration_min: number; price: string; is_active: boolean };

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const EMPTY_FORM: Form = { name: '', duration_min: 30, price: '', is_active: true };

export default function HizmetlerPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [shopId, setShopId]     = useState<string | null>(null);
  const [form, setForm]         = useState<Form | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const supabase = createClient();

  async function load(sid: string) {
    const { data } = await getServices(supabase, sid);
    setServices((data ?? []) as Service[]);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from('shops').select('id')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      load(shop.id);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!form || !shopId) return;
    if (!form.name.trim()) { setError('Hizmet adı gerekli'); return; }
    if (Number(form.price) <= 0) { setError("Fiyat 0'dan büyük olmalıdır."); return; }
    setSaving(true); setError(null);
    try {
      const { error } = await upsertService(supabase, shopId, {
        id: form.id,
        name: form.name.trim(),
        duration_min: form.duration_min,
        price_cents: Math.round(Number(form.price) * 100),
        is_active: form.is_active,
      });
      if (error) { setError(error.message); return; }
      setForm(null);
      load(shopId);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(svc: Service) {
    if (!shopId) return;
    await toggleService(supabase, svc.id, shopId, !svc.is_active);
    load(shopId);
  }

  async function handleDelete(svcId: string) {
    if (!shopId || !confirm('Bu hizmeti silmek istediğine emin misin?')) return;
    await deleteService(supabase, svcId, shopId);
    load(shopId);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Hizmetler</h1>
        </div>
        <button
          onClick={() => setForm(EMPTY_FORM)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Hizmet Ekle
        </button>
      </div>

      {form && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">{form.id ? 'Hizmeti Düzenle' : 'Yeni Hizmet'}</p>
            <button onClick={() => setForm(null)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Hizmet Adı</label>
              <input
                value={form.name}
                onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))}
                placeholder="örn. Saç Kesimi"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Süre (dakika)</label>
              <div className="grid grid-cols-7 gap-1.5">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => f && ({ ...f, duration_min: d }))}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      form.duration_min === d
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {d}
                    <span className="opacity-60 text-[9px] font-semibold"> dk</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Fiyat (₺)</label>
              <input
                type="number"
                min="1"
                value={form.price}
                onChange={e => setForm(f => f && ({ ...f, price: e.target.value }))}
                placeholder="örn. 200"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'Kaydediliyor…' : form.id ? 'Kaydet' : 'Ekle'}
            </button>
            <button onClick={() => setForm(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              İptal
            </button>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-400">Henüz hizmet eklenmedi</p>
          <p className="text-xs text-gray-300 mt-1">Müşterilerin randevu alabilmesi için en az bir hizmet ekle</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
          {services.map(svc => (
            <div key={svc.id} className={`flex items-center gap-4 px-4 py-3.5 ${!svc.is_active ? 'opacity-50' : ''}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${svc.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">{svc.duration_min} dk</span>
                  {svc.price_cents != null && (
                    <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-bold">
                      {Math.round(svc.price_cents / 100)} ₺
                    </span>
                  )}
                  {!svc.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pasif</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setForm({ id: svc.id, name: svc.name, duration_min: svc.duration_min, price: String(Math.round((svc.price_cents ?? 0) / 100)), is_active: svc.is_active })}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Pencil size={14} className="text-gray-400" />
                </button>
                <button onClick={() => handleToggle(svc)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {svc.is_active
                    ? <X size={14} className="text-gray-400" />
                    : <Check size={14} className="text-green-600" />}
                </button>
                <button onClick={() => handleDelete(svc.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
