'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { updateShop } from '@berber/db';
import type { WorkingHours, WorkingDayHours } from '@berber/shared';
import { missingWorkingHoursMessage, shopSaveErrorMessage } from './error-messages';

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
];

export default function AyarlarPage() {
  const [shopId, setShopId]   = useState<string | null>(null);
  const [slug, setSlug]       = useState('');
  const [name, setName]       = useState('');
  const [address, setAddress] = useState('');
  const [wh, setWh]           = useState<WorkingHours | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from('shops')
        .select('id, slug, name, display_name, address, working_hours')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (!shop) return;
      setShopId(shop.id);
      setSlug(shop.slug ?? '');
      setName(shop.display_name || shop.name || '');
      setAddress(shop.address ?? '');
      setWh((shop.working_hours as unknown as WorkingHours) ?? null);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setDay(key: keyof WorkingHours, patch: Partial<WorkingDayHours>) {
    setWh(prev => prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev);
  }

  async function handleSave() {
    if (!wh) {
      setError(missingWorkingHoursMessage());
      return;
    }
    if (!shopId) {
      setError('Dükkan bilgisi yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }
    setSaving(true); setSaved(false); setError(null);
    try {
      const { error } = await updateShop(supabase, shopId, {
        name,
        display_name: name,
        address,
        working_hours: wh ?? undefined,
      });
      if (error) {
        setError(shopSaveErrorMessage(error.message));
        return;
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setError(shopSaveErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://siradaki.app/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dükkan</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">Ayarlar</h1>
      </div>

      {/* Booking link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Randevu Linkin</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm font-semibold text-blue-900">siradaki.app/{slug}</p>
          <button onClick={copyLink} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors">
            <ExternalLink size={14} className="text-blue-600" />
          </a>
        </div>
      </div>

      {/* Shop info */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-900">Dükkan Bilgileri</p>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Dükkan Adı</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Şehir / Adres</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="örn. Beşiktaş, İstanbul"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
      </div>

      {/* Working hours */}
      {wh && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Çalışma Saatleri</p>
          <div className="space-y-3">
            {DAYS.map(({ key, label }) => {
              const day = wh[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <button
                    onClick={() => setDay(key, { enabled: !day.enabled })}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${day.enabled ? 'bg-blue-900' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${day.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
                  {day.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.open ?? '09:00'}
                        onChange={e => setDay(key, { open: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:border-blue-900 outline-none"
                      />
                      <span className="text-xs text-gray-400">–</span>
                      <input
                        type="time"
                        value={day.close ?? '19:00'}
                        onChange={e => setDay(key, { close: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:border-blue-900 outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 flex-1">Kapalı</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check size={15} /> Kaydedildi
          </span>
        )}
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
