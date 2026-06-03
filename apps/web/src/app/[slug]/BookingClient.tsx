'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Clock, Lock, MapPin, Phone, Scissors, Share2 } from 'lucide-react';
import type { Service } from '../../components/ServiceSelector';
import { BookingModal } from '../../components/BookingModal';
import { nextBookingSuccessState } from './booking-flow-state';
import { toTimeLabel } from './booking-time';
import { trackWebEvent } from '../../lib/analytics';

interface StaffMember { id: string; name: string; phone: string | null; }
interface Shop { id: string; name: string; address: string | null; slug: string; timezone: string; phone?: string | null; }
interface Props { shop: Shop; services: Service[]; staff: StaffMember[]; preselectedStaffId?: string | null; }
interface RawSlot { starts_at: string; available: boolean; }
type BookingStep = 'service' | 'time';

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_MON = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const FN_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1';

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDays(n: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

export default function BookingClient({ shop, services, staff, preselectedStaffId }: Props) {
  const days = buildDays(14);
  const abortRef = useRef<AbortController | null>(null);

  const [step, setStep] = useState<BookingStep>('service');
  const [selService, setSelService] = useState<string | null>(services[0]?.id ?? null);
  const [selStaff, setSelStaff] = useState<string | null>(preselectedStaffId ?? null);
  const [selDate, setSelDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [rawSlots, setRawSlots] = useState<RawSlot[]>([]);
  const [slotsLoad, setSlotsLoad] = useState(false);
  const [slotsErr, setSlotsErr] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  function handleBookingStart() {
    trackWebEvent('web_booking_started', {
      shop_slug: shop.slug,
      ...(selService ? { service_id: selService } : {}),
      ...(selStaff ? { staff_id: selStaff } : {}),
    });
    setModalOpen(true);
  }

  const fetchSlots = useCallback(async () => {
    if (!selService) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSlotsLoad(true);
    setSlotsErr(null);
    setSelSlot(null);
    setIsClosed(false);
    setRawSlots([]);
    try {
      const qs = new URLSearchParams({
        shop_slug: shop.slug,
        date: toDateStr(selDate),
        service_id: selService,
        staff_id: selStaff ?? 'any',
      });
      const res = await fetch(`${FN_BASE}/widget-get-availability?${qs}`, { signal: controller.signal });
      if (!res.ok) {
        setSlotsErr('Müsaitlik bilgisi alınamadı.');
        return;
      }
      const data = await res.json();
      if (data.closed) setIsClosed(true);
      else setRawSlots(data.slots ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSlotsErr('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setSlotsLoad(false);
    }
  }, [selService, selDate, selStaff, shop.slug]);

  useEffect(() => {
    if (step === 'time') fetchSlots();
  }, [fetchSlots, step]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && step === 'time') fetchSlots();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      abortRef.current?.abort();
    };
  }, [fetchSlots, step]);

  const slotItems = rawSlots.map(s => ({ time: toTimeLabel(s.starts_at, shop.timezone), available: s.available }));
  const isAllFull = !isClosed && !slotsLoad && rawSlots.length > 0 && rawSlots.every(s => !s.available);
  const selRaw = rawSlots.find(s => toTimeLabel(s.starts_at, shop.timezone) === selSlot);
  const selISO = selRaw?.starts_at ?? '';
  const svc = services.find(s => s.id === selService);
  const selectedStaff = staff.find(s => s.id === selStaff) ?? null;
  const staffName = selectedStaff?.name;
  const summary = svc
    ? `${svc.name} · ${svc.duration_min} dk · ${toDateStr(selDate).split('-').reverse().join('.')} ${selSlot ?? ''}${staffName ? ' · ' + staffName : ''}`
    : '';
  const hasStaffStep = staff.length > 1 && !preselectedStaffId;
  const selectedDateLabel = `${selDate.getDate()} ${TR_MON[selDate.getMonth()]} ${selDate.getFullYear()}, ${TR_DAYS[selDate.getDay()]}`;
  const preselectedName = preselectedStaffId ? staff.find(s => s.id === preselectedStaffId)?.name : null;
  const showBarberBadge = preselectedName !== null && preselectedName !== undefined && selStaff === preselectedStaffId;
  const ctaDisabled = step === 'service' ? !selService : step === 'time' ? !selSlot : false;
  const ctaLabel = step === 'time'
    ? (selSlot ? `Randevu Al · ${selSlot}` : 'Saat Seç')
    : step === 'service'
      ? (selService && svc ? `Devam · ${svc.name}` : 'Hizmet Seç')
      : 'Devam';

  function continueFlow() {
    if (step === 'service') {
      if (!selService) return;
      setStep('time');
      return;
    }
    if (step === 'time' && selSlot) handleBookingStart();
  }

  function goBackStep() {
    if (step === 'time') {
      setStep('service');
      setSelSlot(null);
    }
  }

  return (
    <div className="booking-web">
      <style dangerouslySetInnerHTML={{ __html: BOOKING_CSS }} />

      <div className="booking-mobile-chrome" aria-hidden="true">
        <button className="browser-icon"><ChevronLeft size={16} /></button>
        <div className="browser-address"><Lock size={9} /> siradaki.app/{shop.slug}</div>
        <button className="browser-icon"><Share2 size={15} /></button>
      </div>

      <header className="booking-topbar">
        {step === 'service' ? (
          <>
            <div className="booking-brand">
              <span className="brand-mark" />
              <strong>Sıradaki</strong>
              <span className="brand-divider" />
              <span>{shop.name}</span>
            </div>
            <a href="/giris" className="topbar-owner-cta">Sıradaki&apos;de bir dükkan mı var? <strong>Giriş Yap →</strong></a>
          </>
        ) : (
          <>
            <div className="booking-brand">
              <button className="topbar-back-btn" onClick={() => setStep('service')}>{shop.name}</button>
              <ChevronLeft size={13} className="topbar-crumb-sep" />
              <span className="topbar-crumb-root">Sıradaki</span>
            </div>
            <div className="topbar-steps-wrap">
              <BookingSteps step={step} />
            </div>
            <button className="topbar-close" onClick={() => setStep('service')}>✕</button>
          </>
        )}
      </header>

      <div className="booking-hero">
        <span>Dükkan görseli buraya gelecek</span>
      </div>

      <main className="booking-main">
        <section className="booking-content">
          {step !== 'service' && (
            <div className="content-steps-wrap">
              <BookingSteps step={step} />
            </div>
          )}

          {step === 'service' && (
            <>
              <ShopIntro
                address={shop.address}
                name={shop.name}
                openLabel={null}
                preselectedName={preselectedName ?? undefined}
                showBarberBadge={showBarberBadge}
              />
              <div className="section-label">Hizmetler</div>
              <div className="service-grid">
                {services.length === 0 ? (
                  <p className="empty-copy">Henüz hizmet tanımlanmamış.</p>
                ) : services.map(service => (
                  <button
                    key={service.id}
                    className={`service-card ${selService === service.id ? 'selected' : ''}`}
                    onClick={() => { setSelService(service.id); setSelSlot(null); }}
                  >
                    <div className="sc-top">
                      <span className="sc-icon"><Scissors size={15} /></span>
                      {selService === service.id && <span className="sc-check">✓</span>}
                    </div>
                    <div className="sc-body">
                      <strong>{service.name}</strong>
                      <span>{service.duration_min} dk</span>
                    </div>
                    <div className="sc-price">₺{service.price}</div>
                  </button>
                ))}
              </div>
              {hasStaffStep && (
                <>
                  <div className="section-label">Berber <span className="section-label-opt">(isteğe bağlı)</span></div>
                  <div className="staff-grid">
                    <StaffTile label="?" name="Fark Etmez" selected={selStaff === null} onClick={() => { setSelStaff(null); setSelSlot(null); }} />
                    {staff.map(member => (
                      <StaffTile
                        key={member.id}
                        label={initials(member.name)}
                        name={firstName(member.name)}
                        selected={selStaff === member.id}
                        onClick={() => { setSelStaff(member.id); setSelSlot(null); }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {step === 'time' && (
            <section className="flow-panel">
              <button className="flow-back" onClick={goBackStep}><ChevronLeft size={16} /> Dükkan</button>
              <h1>Ne <em>zaman?</em></h1>
              <div className="date-row">
                {days.slice(0, 7).map(day => {
                  const str = toDateStr(day);
                  const selected = str === toDateStr(selDate);
                  return (
                    <button
                      key={str}
                      className={`date-card ${selected ? 'selected' : ''}`}
                      onClick={() => { setSelDate(day); setSelSlot(null); }}
                    >
                      <span>{TR_DAYS[day.getDay()]}</span>
                      <strong>{day.getDate()}</strong>
                      <small>{TR_MON[day.getMonth()]}</small>
                    </button>
                  );
                })}
              </div>
              <div className="slot-head">
                <span>{selectedDateLabel} - müsait saatler</span>
              </div>
              <BookingSlots
                error={slotsErr}
                isAllFull={isAllFull}
                isClosed={isClosed}
                loading={slotsLoad}
                onRetry={fetchSlots}
                onSelect={setSelSlot}
                selected={selSlot}
                slots={slotItems}
              />
            </section>
          )}
        </section>

        <aside className="booking-sidebar">
          <div className="sidebar-card">
            {step === 'service' ? (
              <>
                <div><Clock size={13} /> <strong>–:– – –:–</strong> · Bugün açık</div>
                {shop.address && <div><MapPin size={13} /> {shop.address}</div>}
                {shop.phone && <div><Phone size={13} /> {shop.phone}</div>}
                <button onClick={continueFlow} disabled={ctaDisabled}>Randevu Al</button>
                <button
                  className="sidebar-share-btn"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: shop.name, url: location.href }).catch(() => {});
                    } else {
                      navigator.clipboard?.writeText(location.href).catch(() => {});
                    }
                  }}
                >
                  <Share2 size={13} /> Paylaş
                </button>
              </>
            ) : (
              <>
                <div className="section-label">Seçimleriniz</div>
                <SummaryCard service={svc} staffName={staffName} date={selectedDateLabel} slot={selSlot} />
                <button onClick={continueFlow} disabled={ctaDisabled}>Devam Et</button>
              </>
            )}
          </div>
        </aside>
      </main>

      <div className="mobile-booking-bar">
        <button onClick={continueFlow} disabled={ctaDisabled}>{ctaLabel}</button>
      </div>

      <BookingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelSlot(null); }}
        summary={summary}
        shopId={shop.id}
        shopSlug={shop.slug}
        staffId={selStaff}
        staffPhone={selectedStaff?.phone ?? null}
        serviceId={selService ?? ''}
        startsAt={selISO}
        onSuccess={() => {
          trackWebEvent('web_booking_completed', {
            shop_slug: shop.slug,
            ...(selService ? { service_id: selService } : {}),
            ...(selStaff ? { staff_id: selStaff } : {}),
          });
          const next = nextBookingSuccessState({ modalOpen, selectedSlot: selSlot });
          setModalOpen(next.modalOpen);
          setSelSlot(next.selectedSlot);
          fetchSlots();
        }}
      />
    </div>
  );
}

function ShopIntro({
  address,
  name,
  openLabel,
  preselectedName,
  showBarberBadge,
}: {
  address: string | null;
  name: string;
  openLabel?: string | null;
  preselectedName?: string;
  showBarberBadge: boolean;
}) {
  return (
    <div className="shop-intro">
      <h1>{name}</h1>
      <div className="open-row">
        <span className="open-pill">• Açık · {openLabel ?? '–:– – –:–'}</span>
      </div>
      {address && <p><MapPin size={12} /> {address}</p>}
      {showBarberBadge && preselectedName && (
        <div className="barber-badge">{preselectedName}&apos;in linkindesin</div>
      )}
    </div>
  );
}

function BookingSteps({ step }: { step: BookingStep }) {
  const steps = [['service', 'Hizmet'], ['time', 'Tarih & Saat'], ['contact', 'Bilgiler']];
  const activeIndex = steps.findIndex(([key]) => key === step);
  return (
    <div className="booking-steps">
      {steps.map(([key, label], index) => (
        <div className={`booking-step ${index <= activeIndex ? 'active' : ''}`} key={key}>
          <span>{index < activeIndex ? <Check size={13} /> : index + 1}</span>
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  );
}

function StaffTile({ label, name, selected, onClick }: { label: string; name: string; selected: boolean; onClick: () => void }) {
  return (
    <button className={`staff-tile ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{name}</strong>
    </button>
  );
}

function BookingSlots({
  error,
  isAllFull,
  isClosed,
  loading,
  onRetry,
  onSelect,
  selected,
  slots,
}: {
  error?: string | null;
  isAllFull?: boolean;
  isClosed?: boolean;
  loading?: boolean;
  onRetry?: () => void;
  onSelect: (time: string) => void;
  selected: string | null;
  slots: { time: string; available: boolean }[];
}) {
  if (loading) return <div className="slot-grid">{Array.from({ length: 8 }).map((_, i) => <div className="slot-skeleton" key={i} />)}</div>;
  if (error) return <div className="flow-empty">Müsaitlik bilgisi alınamadı. <button onClick={onRetry}>Tekrar dene</button></div>;
  if (isClosed) return <div className="flow-empty">Bu gün için çalışma saati tanımlanmamış.</div>;
  if (isAllFull || slots.length === 0) return <div className="flow-empty">Bu günde müsait saat kalmadı. Başka bir gün seçin.</div>;
  return (
    <div className="slot-grid">
      {slots.map(slot => (
        <button
          className={`slot-button ${selected === slot.time ? 'selected' : ''}`}
          disabled={!slot.available}
          key={slot.time}
          onClick={() => onSelect(slot.time)}
        >
          <strong>{slot.time}</strong>
          <span>{slot.available ? 'müsait' : 'dolu'}</span>
        </button>
      ))}
    </div>
  );
}

function SummaryCard({ service, staffName, date, slot }: { service?: Service; staffName?: string; date: string; slot: string | null }) {
  return (
    <div className="summary-card">
      <strong>{service?.name ?? 'Hizmet seçilmedi'}</strong>
      {service && <span>{service.duration_min} dakika</span>}
      {staffName && <span>{staffName} seçildi</span>}
      {slot && <span>{date}, {slot}</span>}
      {service && <div><b>Toplam</b><strong>₺{service.price}</strong></div>}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('tr-TR')).join('') || '?';
}

function firstName(name: string) {
  return name.split(/\s+/).filter(Boolean)[0] ?? name;
}

const BOOKING_CSS = `
  .booking-web {
    --paper: #FBF8F1;
    --paper-2: #F2ECDF;
    --card: #FFFFFF;
    --ink: #1B1813;
    --ink-2: #5A534A;
    --ink-3: #938A7C;
    --line: #E5DECF;
    --line-2: #D8CFBC;
    --spruce: #184A3A;
    --spruce-soft: #E4ECE7;
    --brass: #9A7220;
    --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
    --grot: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, 'Courier New', monospace;
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--grot);
    padding-bottom: 88px;
  }
  .booking-mobile-chrome { display: none; }
  .booking-topbar {
    align-items: center;
    background: rgba(255,255,255,.9);
    border-bottom: 1px solid var(--line);
    display: flex;
    height: 52px;
    justify-content: space-between;
    padding: 0 32px;
    position: relative;
  }
  .topbar-steps-wrap { left: 50%; position: absolute; transform: translateX(-50%); }
  .topbar-steps-wrap .booking-steps { margin: 0; }
  .content-steps-wrap { display: none; }
  .booking-brand { align-items: center; display: flex; font-family: var(--serif); gap: 14px; font-size: 15px; }
  .brand-mark { background: var(--spruce); border-radius: 7px; height: 28px; width: 28px; }
  .brand-divider { background: var(--line-2); height: 18px; width: 1px; }
  .sidebar-card button, .mobile-booking-bar button {
    background: var(--spruce);
    border: 0;
    border-radius: 10px;
    color: var(--paper);
    cursor: pointer;
    font-family: var(--grot);
    font-size: 14px;
    font-weight: 700;
  }
  button:disabled { cursor: not-allowed; opacity: .48; }
  .topbar-owner-cta { color: var(--ink-2); font-size: 13px; text-decoration: none; white-space: nowrap; }
  .topbar-owner-cta strong { color: var(--spruce); }
  .topbar-back-btn { background: transparent; border: 0; color: var(--ink); cursor: pointer; font-family: var(--serif); font-size: 15px; font-weight: 700; padding: 0; }
  .topbar-crumb-sep { color: var(--ink-3); margin: 0 2px; }
  .topbar-crumb-root { color: var(--ink-3); font-family: var(--grot); font-size: 13px; }
  .topbar-close { background: transparent; border: 0; color: var(--ink-3); cursor: pointer; font-size: 16px; padding: 4px 8px; }
  .booking-hero {
    align-items: center;
    background: repeating-linear-gradient(135deg, rgba(216,207,188,.3), rgba(216,207,188,.3) 9px, transparent 9px, transparent 21px), var(--paper-2);
    display: flex;
    height: 180px;
    justify-content: center;
  }
  .booking-hero span {
    background: rgba(255,255,255,.72);
    border: 1px solid var(--line-2);
    border-radius: 7px;
    color: var(--ink-3);
    font-family: var(--mono);
    font-size: 11px;
    padding: 7px 18px;
  }
  .booking-main { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 26px; padding: 22px 32px 80px; }
  .booking-content { min-width: 0; }
  .shop-intro h1 { font-family: var(--serif); font-size: 30px; font-weight: 500; line-height: 1.1; margin: 0 0 8px; }
  .open-row { margin-bottom: 6px; }
  .open-pill { background: var(--spruce-soft); border-radius: 999px; color: var(--spruce); font-family: var(--grot); font-size: 12px; font-weight: 600; padding: 3px 10px; }
  .shop-intro p { align-items: center; color: var(--ink-3); display: flex; font-family: var(--mono); font-size: 11px; gap: 5px; margin: 6px 0 0; }
  .barber-badge { background: var(--spruce-soft); border-radius: 999px; color: var(--spruce); display: inline-flex; font-size: 12px; font-weight: 700; margin-top: 12px; padding: 5px 10px; }
  .section-label { color: var(--ink-2); font-family: var(--grot); font-size: 10.5px; font-weight: 700; letter-spacing: .16em; margin: 18px 0 9px; text-transform: uppercase; }
  .section-label-opt { color: var(--ink-3); font-size: 10px; font-weight: 400; letter-spacing: 0; text-transform: none; }
  .empty-copy { color: var(--ink-3); font-size: 14px; }
  .service-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 640px; }
  .service-card {
    background: var(--card);
    border: 1.5px solid var(--line);
    border-radius: 14px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font-family: var(--grot);
    gap: 10px;
    padding: 14px;
    text-align: left;
    transition: border-color .13s ease, box-shadow .13s ease;
  }
  .service-card:hover { border-color: var(--line-2); box-shadow: 0 4px 14px -6px rgba(27,24,19,.14); }
  .service-card.selected { border-color: var(--spruce); box-shadow: 0 0 0 3px rgba(24,74,58,.08); }
  .sc-top { align-items: flex-start; display: flex; justify-content: space-between; }
  .sc-icon { align-items: center; background: var(--spruce-soft); border-radius: 9px; color: var(--spruce); display: flex; height: 34px; justify-content: center; width: 34px; }
  .sc-check { align-items: center; background: var(--spruce); border-radius: 999px; color: #fff; display: flex; font-size: 11px; font-weight: 700; height: 20px; justify-content: center; width: 20px; }
  .sc-body { display: flex; flex-direction: column; gap: 3px; }
  .sc-body strong { color: var(--ink); font-size: 14px; font-weight: 700; line-height: 1.2; }
  .sc-body span { color: var(--ink-3); font-family: var(--mono); font-size: 11px; }
  .sc-price { color: var(--brass); font-family: var(--mono); font-size: 14px; font-weight: 700; }
  .booking-sidebar { border-left: 1px solid var(--line); padding-left: 22px; }
  .sidebar-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 6px 18px -10px rgba(27,24,19,.28); padding: 16px; position: sticky; top: 74px; }
  .sidebar-card > div:not(.section-label):not(.summary-card) { align-items: center; border-bottom: 1px solid var(--line); color: var(--ink-2); display: flex; font-family: var(--mono); font-size: 12px; gap: 7px; padding: 9px 0; }
  .sidebar-card > div:not(.section-label):not(.summary-card) svg { color: var(--ink-3); flex: 0 0 auto; }
  .sidebar-card button:not(.sidebar-share-btn) { height: 44px; margin-top: 16px; width: 100%; }
  .sidebar-share-btn { align-items: center; background: transparent !important; border: 1px solid var(--line-2) !important; border-radius: 10px; box-shadow: none !important; color: var(--ink-2) !important; cursor: pointer; display: flex; font-family: var(--grot); font-size: 13px; font-weight: 600; gap: 6px; height: 36px !important; justify-content: center; margin-top: 8px !important; width: 100% !important; }
  .sidebar-share-btn:hover { border-color: var(--line) !important; color: var(--ink) !important; }
  .booking-steps { align-items: center; display: flex; gap: 12px; margin: 2px 0 18px; }
  .booking-step { align-items: center; color: var(--ink-3); display: flex; gap: 7px; font-size: 12px; font-weight: 700; }
  .booking-step span { align-items: center; border: 1px solid var(--line-2); border-radius: 999px; display: flex; height: 22px; justify-content: center; width: 22px; }
  .booking-step.active { color: var(--spruce); }
  .booking-step.active span { background: var(--spruce); border-color: var(--spruce); color: var(--paper); }
  .flow-panel h1 { font-family: var(--serif); font-size: 25px; font-weight: 500; margin: 0 0 18px; }
  .flow-panel h1 em { color: var(--spruce); font-style: italic; }
  .flow-panel h1 span { color: var(--ink-3); font-size: 13px; }
  .flow-back { align-items: center; background: transparent; border: 0; color: var(--ink-2); cursor: pointer; display: inline-flex; font-family: var(--grot); font-size: 13px; gap: 4px; margin-bottom: 12px; padding: 0; }
  .flow-back:hover { color: var(--ink); }
  .staff-grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .staff-tile { background: transparent; border: 0; color: var(--ink-3); cursor: pointer; display: flex; flex-direction: column; font-family: var(--grot); gap: 6px; text-align: center; }
  .staff-tile span { align-items: center; background: var(--paper-2); border: 1px solid var(--line); border-radius: 11px; display: flex; height: 44px; justify-content: center; min-width: 44px; padding: 0 12px; }
  .staff-tile strong { font-size: 11px; }
  .staff-tile.selected { color: var(--spruce); }
  .staff-tile.selected span { background: var(--spruce); border-color: var(--spruce); color: var(--paper); }
  .date-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
  .date-card { background: var(--card); border: 1px solid var(--line-2); border-radius: 12px; color: var(--ink-2); flex: 0 0 72px; height: 74px; }
  .date-card span, .date-card small { display: block; font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .date-card strong { display: block; font-family: var(--mono); font-size: 25px; margin: 3px 0; }
  .date-card.selected { background: var(--spruce); border-color: var(--spruce); color: var(--paper); }
  .slot-head { color: var(--ink-3); font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: .1em; margin: 10px 0; text-transform: uppercase; }
  .slot-grid { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); max-width: 700px; }
  .slot-button, .slot-skeleton { border-radius: 9px; height: 46px; }
  .slot-button { background: var(--spruce-soft); border: 1px solid var(--spruce); color: var(--spruce); font-family: var(--mono); }
  .slot-button:disabled { background: var(--paper-2); border-color: var(--line); color: var(--ink-3); }
  .slot-button.selected { background: var(--spruce); color: var(--paper); }
  .slot-button strong, .slot-button span { display: block; }
  .slot-button span { font-size: 9px; font-weight: 700; }
  .slot-skeleton { background: var(--paper-2); }
  .flow-empty { color: var(--ink-3); font-size: 14px; padding: 18px 0; }
  .flow-empty button { background: transparent; border: 0; color: var(--spruce); cursor: pointer; font-weight: 700; }
  .summary-card { background: var(--card); border: 1px solid var(--line); border-radius: 13px; box-shadow: 0 6px 18px -10px rgba(27,24,19,.28); padding: 16px; }
  .summary-card > strong, .summary-card span { border-bottom: 1px solid var(--line); display: block; padding: 8px 0; }
  .summary-card span { color: var(--ink-2); font-size: 12px; }
  .summary-card div { align-items: center; display: flex; justify-content: space-between; padding-top: 14px; }
  .summary-card div strong { color: var(--brass); font-family: var(--mono); }
  .mobile-booking-bar { display: none; }
  @media (max-width: 760px) {
    .booking-web { padding-bottom: 82px; }
    .booking-topbar { height: 48px; padding: 0 16px; }
    .topbar-owner-cta { display: none; }
    .topbar-back-btn { font-size: 14px; }
    .topbar-crumb-root { display: none; }
    .topbar-crumb-sep { display: none; }
    .topbar-steps-wrap { display: none; }
    .content-steps-wrap { display: block; }
    .booking-mobile-chrome {
      align-items: center;
      background: var(--paper-2);
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 8px;
      height: 45px;
      justify-content: center;
      padding: 0 46px;
    }
    .browser-icon { display: none; }
    .browser-address {
      align-items: center;
      background: rgba(216,207,188,.58);
      border-radius: 7px;
      color: var(--ink-3);
      display: flex;
      font-family: var(--mono);
      font-size: 9px;
      gap: 4px;
      height: 28px;
      justify-content: center;
      max-width: 298px;
      width: 100%;
    }
    .booking-hero { height: 120px; }
    .booking-hero span { font-size: 10px; padding: 6px 15px; }
    .booking-main { display: block; padding: 15px 18px 94px; }
    .booking-sidebar { display: none; }
    .shop-intro h1 { font-size: 24px; }
    .section-label { margin-top: 20px; }
    .service-grid { grid-template-columns: 1fr; max-width: none; }
    .flow-back { display: inline-flex; }
    .booking-steps { overflow-x: auto; padding-bottom: 4px; }
    .date-card { flex-basis: 58px; height: 68px; }
    .slot-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .mobile-booking-bar {
      background: rgba(251,248,241,.92);
      border-top: 1px solid var(--line);
      bottom: 0;
      display: block;
      left: 0;
      padding: 13px 18px 20px;
      position: fixed;
      right: 0;
      z-index: 20;
    }
    .mobile-booking-bar button {
      border-radius: 12px;
      box-shadow: 0 12px 26px -12px rgba(24,74,58,.8);
      height: 50px;
      width: 100%;
    }
  }
`;
