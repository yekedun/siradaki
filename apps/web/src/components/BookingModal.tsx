'use client';

// W3a — Booking modal
// 4 states: form | loading | success | error

import { useState, useRef } from 'react';
import { isValidPhone } from '@/lib/validation';

type ModalState = 'form' | 'loading' | 'success' | 'error';
type ErrorType  = 'conflict' | 'rate_limit' | 'generic';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  summary: string;
  shopId: string;
  shopSlug: string;
  staffId: string | null;
  staffPhone?: string | null;
  serviceIds: string[];
  startsAt: string;
  onSuccess: () => void;
}

const FN_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

function Overline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] font-bold tracking-[0.22em] uppercase leading-none ${className ?? 'text-[#FF4D1C]'}`}>
      {children}
    </div>
  );
}

function ModalForm({
  summary, onClose, onConfirm,
}: {
  summary: string;
  onClose: () => void;
  onConfirm: (name: string, phone: string, note: string) => void;
}) {
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [note,  setNote]  = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const ok = name.trim().length >= 2 && isValidPhone(phone);

  const inputCls = 'bg-white border border-[#D6DBE5] rounded-none px-3.5 py-3 text-[15px] text-[#0B1220] font-sans w-full outline-none transition-[border-color,box-shadow] duration-[140ms] focus:border-[#0B1220] focus:ring-2 focus:ring-[#FF4D1C]/15';
  const labelCls = 'text-[11px] font-bold tracking-[0.16em] text-[#0B1220]/45 uppercase mb-1.5';

  return (
    <div className="p-7 pb-6">
      <Overline>Onaylama</Overline>
      <h2 className="font-display text-[42px] leading-[0.95] tracking-normal uppercase text-[#0B1220] mt-3">
        Randevuyu Onayla
      </h2>
      <div className="text-sm font-medium text-[#0B1220]/55 mt-2 leading-relaxed">
        {summary}
      </div>

      <div className="flex flex-col gap-3.5 mt-5">
        <div className="flex flex-col">
          <label htmlFor="booking-name" className={labelCls}>Ad Soyad</label>
          <input
            id="booking-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="örn. Ahmet Yılmaz"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="booking-phone" className={labelCls}>Telefon</label>
          <input
            id="booking-phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            placeholder="0(5xx) xxx xx xx"
            className={inputCls}
          />
          {phoneTouched && phone.length > 0 && !isValidPhone(phone) && (
            <div className="text-xs text-coral-600 mt-1">Geçerli bir telefon numarası gir (10-11 rakam)</div>
          )}
          {!phoneTouched && phone.length === 0 && name.trim().length >= 2 && (
            <div className="text-xs text-slate-400 mt-1">Randevu onayı için telefon numarası gerekli</div>
          )}
        </div>

        <div className="flex flex-col">
          <label htmlFor="booking-note" className={labelCls}>Not — opsiyonel</label>
          <textarea
            id="booking-note"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Saç uzunluğu, özel istek..."
            className={`${inputCls} resize-y`}
          />
        </div>
      </div>

      <div className="flex gap-2.5 mt-5">
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-none border border-[#D6DBE5] bg-transparent text-[#0B1220]/70 font-sans font-bold text-sm cursor-pointer hover:border-[#0B1220] transition-colors duration-150"
        >
          Vazgeç
        </button>
        <button
          onClick={() => ok && onConfirm(name, phone, note)}
          aria-disabled={!ok}
          className={[
            'flex-[1.5] h-12 rounded-none border-0 font-sans font-bold text-sm transition-colors duration-[140ms]',
            ok
              ? 'bg-[#FF4D1C] text-white cursor-pointer hover:bg-[#D83E14]'
              : 'bg-[#EEF1F5] text-[#8590A4] cursor-not-allowed',
          ].join(' ')}
        >
          Onayla
        </button>
      </div>
    </div>
  );
}

function ModalLoading() {
  return (
    <div className="px-7 py-16 text-center">
      <div className="w-9 h-9 mx-auto border-[3px] border-[#D6DBE5] border-t-[#FF4D1C] rounded-full animate-spin" />
      <div className="mt-4 text-sm text-slate-500">Randevu oluşturuluyor…</div>
    </div>
  );
}

function ModalSuccess({
  summary, startsAt, onClose, staffPhone, shopSlug,
}: {
  summary: string; startsAt: string; onClose: () => void; staffPhone?: string | null; shopSlug?: string;
}) {
  // Build display text from startsAt directly — independent of parent state timing
  const displaySummary = (() => {
    if (!startsAt) return summary;
    const timeLabel = new Date(startsAt).toLocaleTimeString('tr-TR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
    });
    if (!timeLabel || summary.trimEnd().endsWith(timeLabel)) return summary;
    return `${summary.trimEnd()} ${timeLabel}`;
  })();

  return (
    <div className="p-7 pb-6">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-mint-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          ✓
        </div>
        <Overline className="text-mint-700">Onaylandı</Overline>
      </div>
      <h2 className="font-display text-[42px] leading-[0.95] tracking-normal uppercase text-[#0B1220] mt-3.5">
        Randevunuz alındı
      </h2>
      <div className="text-sm font-medium text-[#0B1220]/55 mt-2 leading-relaxed">
        {displaySummary}
      </div>

      <div className="flex gap-2.5 mt-4">
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-none border border-[#D6DBE5] bg-transparent text-[#0B1220]/70 font-sans font-bold text-sm cursor-pointer hover:border-[#0B1220] transition-colors duration-150"
        >
          Yeni Randevu
        </button>
        <button
          onClick={onClose}
          className="flex-[1.5] h-12 rounded-none border-0 bg-[#FF4D1C] text-white font-sans font-bold text-sm cursor-pointer hover:bg-[#D83E14] transition-colors duration-150 flex items-center justify-center"
        >
          Tamam
        </button>
      </div>

      {staffPhone && (
        <button
          onClick={() => {
            const phone = staffPhone.replace(/\D/g, '').replace(/^0/, '');
            const msg = encodeURIComponent(`Merhaba, ${displaySummary} randevusu aldım. Bilginize :)`);
            window.open(`https://wa.me/90${phone}?text=${msg}`, '_blank');
          }}
          className="w-full px-5 py-3 mt-2 bg-[#25D366] text-white border-none rounded-none text-sm font-bold cursor-pointer font-sans"
        >
          💬 Berberi WhatsApp ile Bilgilendir
        </button>
      )}

      {shopSlug && (
        <a
          href={`/iptal?dukkan=${shopSlug}`}
          className="block text-center text-xs text-[#0B1220]/35 hover:text-[#A0303F] transition-colors duration-150 mt-3"
        >
          Randevuyu iptal etmek istiyorum
        </a>
      )}
    </div>
  );
}

function ModalError({ errorType, errorMessage, onClose }: { errorType: ErrorType; errorMessage?: string | null; onClose: () => void }) {
  const isConflict  = errorType === 'conflict';
  const isRateLimit = errorType === 'rate_limit';

  const title    = isConflict  ? 'Bu saat az önce doldu'
                 : isRateLimit ? 'Çok fazla deneme'
                 :               'Randevu oluşturulamadı';

  const subtitle = isConflict  ? 'Başka bir saat seçin ve tekrar deneyin.'
                 : isRateLimit ? 'Çok fazla istek gönderildi. 10 dakika sonra tekrar deneyin.'
                 :               (errorMessage ?? 'Bir hata oluştu. Lütfen tekrar deneyin.');

  return (
    <div className="p-7 pb-6">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-coral-600 text-white flex items-center justify-center font-bold text-[15px] flex-shrink-0">
          !
        </div>
        <Overline className="text-coral-700">{isConflict ? 'Çakışma' : isRateLimit ? 'Limit' : 'Hata'}</Overline>
      </div>
      <h2 className="font-display text-[42px] leading-[0.95] tracking-normal uppercase text-[#0B1220] mt-3.5">
        {title}
      </h2>
      <div className="text-sm font-medium text-[#0B1220]/60 mt-2 leading-relaxed">
        {subtitle}
      </div>
      <button
        onClick={onClose}
        className="mt-5 w-full h-12 rounded-none border-0 bg-[#0B1220] text-white font-sans font-bold text-sm cursor-pointer hover:bg-[#15192A] transition-colors duration-150"
      >
        {isConflict ? 'Saat Seç' : 'Kapat'}
      </button>
    </div>
  );
}

export function BookingModal({
  open, onClose, summary,
  shopId, shopSlug, staffId, staffPhone, serviceIds, startsAt, onSuccess,
}: BookingModalProps) {
  const [state,          setState]         = useState<ModalState>('form');
  const [errorType,      setErrorType]     = useState<ErrorType>('conflict');
  const [errorMessage,   setErrorMessage]  = useState<string | null>(null);
  const submittingRef    = useRef(false);
  const confirmedSummary = useRef(summary);

  if (!open) return null;
  void shopId;

  async function handleConfirm(name: string, phone: string, note: string) {
    if (submittingRef.current) return;
    confirmedSummary.current = summary; // capture BEFORE any state change or async op
    submittingRef.current = true;
    setState('loading');
    try {
      const res = await fetch(`${FN_BASE}/widget-book-appointment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_slug:      shopSlug,
          service_ids:    serviceIds,
          staff_id:       staffId,
          starts_at:      startsAt,
          customer_name:  name.trim(),
          customer_phone: phone.trim(),
          customer_notes: note.trim()  || undefined,
        }),
      });
      if (res.status === 409) { setErrorType('conflict'); setState('error'); return; }
      if (res.status === 429) { setErrorType('rate_limit'); setState('error'); return; }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        setErrorMessage(typeof body?.error === 'string' ? body.error : null);
        setErrorType('generic');
        setState('error');
        return;
      }
      setState('success');
      onSuccess();
    } catch {
      setErrorType('generic');
      setState('error');
    } finally {
      submittingRef.current = false;
    }
  }

  function handleClose() {
    setState('form');
    setErrorType('conflict');
    setErrorMessage(null);
    onClose();
  }

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[1000]"
      style={{ animation: 'fadeIn 180ms ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#F9F9F6] rounded-none w-full max-w-[456px] shadow-lg border border-[#0B1220] overflow-hidden font-sans"
        style={{ animation: 'slideUp 280ms cubic-bezier(.32,.72,.0,1)' }}
      >
        {state === 'form'    && <ModalForm    summary={summary} onClose={handleClose} onConfirm={handleConfirm} />}
        {state === 'loading' && <ModalLoading />}
        {state === 'success' && <ModalSuccess summary={confirmedSummary.current} startsAt={startsAt} onClose={handleClose} staffPhone={staffPhone} shopSlug={shopSlug} />}
        {state === 'error'   && <ModalError   errorType={errorType} errorMessage={errorMessage} onClose={handleClose} />}
      </div>
    </div>
  );
}
