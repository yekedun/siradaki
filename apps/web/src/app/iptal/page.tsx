'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isValidPhone } from '@/lib/validation';

const FN_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

function formatDate(iso: string) {
  const d = new Date(iso);
  const day  = d.toLocaleDateString('tr-TR', { weekday: 'long', timeZone: 'Europe/Istanbul' });
  const date = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' });
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
  return `${day}, ${date} · ${time}`;
}

type Appointment = {
  id: string;
  starts_at: string;
  service_name: string | null;
  staff_name: string | null;
};

type CancelState = 'idle' | 'cancelling' | 'cancelled' | 'error' | 'too_late';

function InvalidLink() {
  return (
    <div className="min-h-screen bg-[#F9F9F6] font-sans text-[#0B1220] flex items-center justify-center p-6">
      <div className="max-w-[400px] text-center">
        <div className="text-[11px] font-bold tracking-[0.22em] text-[#A0303F] uppercase mb-3">Geçersiz Bağlantı</div>
        <h1 className="font-display text-[36px] leading-[0.95] uppercase mb-3">Bu link hatalı</h1>
        <p className="text-sm text-[#0B1220]/55 leading-relaxed mb-6">
          İptal bağlantısı geçersiz görünüyor. Randevu onay sayfasındaki bağlantıyı kullanın.
        </p>
        <Link href="/" className="text-sm font-bold text-[#FF4D1C] hover:underline">Ana sayfaya dön</Link>
      </div>
    </div>
  );
}

function IptalForm({ shopSlug }: { shopSlug: string }) {
  const [phone, setPhone]               = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState('');

  const [cancelStates, setCancelStates] = useState<Record<string, CancelState>>({});
  const [cancelErrors,  setCancelErrors]  = useState<Record<string, string>>({});
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null);

  const phoneOk = isValidPhone(phone);

  async function handleLookup() {
    if (!phoneOk || lookupLoading) return;
    setLookupLoading(true);
    setLookupError('');
    setAppointments(null);
    setCancelStates({});
    setCancelErrors({});
    setConfirmingId(null);
    try {
      const res = await fetch(`${FN_BASE}/widget-get-appointments-by-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), shop_slug: shopSlug }),
      });
      if (!res.ok) { setLookupError('Randevular alınamadı. Lütfen tekrar deneyin.'); return; }
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } catch {
      setLookupError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleCancel(apptId: string) {
    if (cancelStates[apptId] === 'cancelling') return;
    setCancelStates(s => ({ ...s, [apptId]: 'cancelling' }));
    setCancelErrors(e => ({ ...e, [apptId]: '' }));
    setConfirmingId(null);
    try {
      const res = await fetch(`${FN_BASE}/widget-cancel-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: apptId, phone: phone.trim() }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setCancelErrors(e => ({ ...e, [apptId]: data.error ?? 'Randevu iptal edilemez.' }));
        setCancelStates(s => ({ ...s, [apptId]: 'too_late' }));
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCancelErrors(e => ({ ...e, [apptId]: data.error ?? 'İptal işlemi başarısız.' }));
        setCancelStates(s => ({ ...s, [apptId]: 'error' }));
        return;
      }
      setCancelStates(s => ({ ...s, [apptId]: 'cancelled' }));
    } catch {
      setCancelErrors(e => ({ ...e, [apptId]: 'Bağlantı hatası.' }));
      setCancelStates(s => ({ ...s, [apptId]: 'error' }));
    }
  }

  const inputCls = 'bg-white border border-[#D6DBE5] rounded-none px-3.5 py-3 text-[15px] text-[#0B1220] font-sans w-full outline-none transition-[border-color] duration-[140ms] focus:border-[#0B1220]';
  const labelCls = 'text-[11px] font-bold tracking-[0.16em] text-[#0B1220]/45 uppercase mb-1.5 block';

  return (
    <div className="min-h-screen bg-[#F9F9F6] font-sans text-[#0B1220]">
      <header className="bg-[#0B1220] text-[#F9F9F6]">
        <div className="max-w-[520px] mx-auto px-5 pt-7 pb-8">
          <div className="text-[11px] font-bold tracking-[0.22em] text-[#FF4D1C] uppercase">
            Randevu İptali · Sıradaki
          </div>
          <h1 className="font-display text-[48px] leading-[0.9] tracking-normal uppercase mt-3">
            Randevumu İptal Et
          </h1>
        </div>
      </header>

      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-16">

        <div className="mb-8">
          <div className="text-[11px] font-bold tracking-[0.22em] text-[#FF4D1C] uppercase mb-3">
            Telefon Numarası
          </div>
          <p className="text-sm text-[#0B1220]/55 mb-4 leading-relaxed">
            Randevu alırken kullandığın telefon numarasını gir.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="cancel-phone" className={labelCls}>Telefon</label>
              <input
                id="cancel-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => setPhoneTouched(true)}
                onKeyDown={e => e.key === 'Enter' && phoneOk && handleLookup()}
                placeholder="0(5xx) xxx xx xx"
                className={inputCls}
              />
              {phoneTouched && phone.length > 0 && !phoneOk && (
                <div className="text-xs text-[#A0303F] mt-1">Geçerli bir mobil telefon numarası gir</div>
              )}
            </div>
            <button
              onClick={handleLookup}
              disabled={!phoneOk || lookupLoading}
              className={[
                'h-12 rounded-none border-0 font-sans font-bold text-sm transition-colors duration-[140ms]',
                phoneOk && !lookupLoading
                  ? 'bg-[#0B1220] text-[#F9F9F6] cursor-pointer hover:bg-[#15192A]'
                  : 'bg-[#EEF1F5] text-[#8590A4] cursor-not-allowed',
              ].join(' ')}
            >
              {lookupLoading ? 'Aranıyor…' : 'Randevuları Getir'}
            </button>
          </div>
          {lookupError && (
            <div className="mt-3 text-sm text-[#A0303F]">{lookupError}</div>
          )}
        </div>

        {appointments !== null && (
          <div>
            <div className="text-[11px] font-bold tracking-[0.22em] text-[#FF4D1C] uppercase mb-3">
              Yaklaşan Randevular
            </div>

            {appointments.length === 0 ? (
              <div className="bg-white border border-[#D6DBE5] p-5 text-sm text-[#0B1220]/50">
                Bu numarayla yaklaşan randevu bulunamadı.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {appointments.map(appt => {
                  const state = cancelStates[appt.id] ?? 'idle';
                  const errMsg = cancelErrors[appt.id] ?? '';
                  const isConfirming = confirmingId === appt.id;

                  return (
                    <div key={appt.id} className="bg-white border border-[#D6DBE5] p-5">
                      <div className="flex flex-col gap-1 mb-4">
                        <div className="text-[13px] font-bold text-[#0B1220]">{formatDate(appt.starts_at)}</div>
                        {appt.service_name && (
                          <div className="text-sm text-[#0B1220]/60">{appt.service_name}</div>
                        )}
                        {appt.staff_name && (
                          <div className="text-xs text-[#0B1220]/40">{appt.staff_name}</div>
                        )}
                      </div>

                      {state === 'cancelled' ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-[#16A34A]">
                          <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                          İptal edildi
                        </div>
                      ) : state === 'too_late' ? (
                        <div className="text-sm text-[#A0303F]">{errMsg}</div>
                      ) : state === 'error' ? (
                        <div className="text-sm text-[#A0303F]">{errMsg || 'Bir hata oluştu.'}</div>
                      ) : !isConfirming ? (
                        <button
                          onClick={() => setConfirmingId(appt.id)}
                          className="text-sm font-bold text-[#A0303F] hover:underline cursor-pointer bg-transparent border-0 p-0 font-sans"
                        >
                          Randevuyu iptal et
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm text-[#0B1220]/60">Randevuyu iptal etmek istediğine emin misin?</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="flex-1 h-10 rounded-none border border-[#D6DBE5] bg-transparent text-[#0B1220]/70 font-sans font-bold text-sm cursor-pointer hover:border-[#0B1220] transition-colors"
                            >
                              Hayır
                            </button>
                            <button
                              onClick={() => handleCancel(appt.id)}
                              disabled={state === 'cancelling'}
                              className="flex-[1.5] h-10 rounded-none border-0 bg-[#A0303F] text-white font-sans font-bold text-sm cursor-pointer hover:bg-[#882838] transition-colors disabled:opacity-60"
                            >
                              {state === 'cancelling' ? 'İptal ediliyor…' : 'Evet, iptal et'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IptalPageInner() {
  const params = useSearchParams();
  const shopSlug = params.get('dukkan') ?? '';

  if (!shopSlug) return <InvalidLink />;
  return <IptalForm shopSlug={shopSlug} />;
}

export default function IptalPage() {
  return (
    <Suspense>
      <IptalPageInner />
    </Suspense>
  );
}
