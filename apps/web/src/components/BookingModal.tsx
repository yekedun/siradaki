"use client";

import { useState } from "react";
import { formatSlotTime } from "@berber/shared/slot-utils";
import type {
  ServicePublic,
  Slot,
  BookAppointmentResponse,
} from "@berber/shared/types";

interface BookingModalProps {
  shopSlug: string;
  shopName: string;
  staffId: string | null;
  staffName: string;
  service: ServicePublic;
  slot: Slot;
  timezone: string;
  onClose: () => void;
  onSuccess: () => void;
  onConflict: () => void;
}

type Step = "form" | "loading" | "success" | "error";

export function BookingModal({
  shopSlug,
  shopName,
  staffId,
  staffName,
  service,
  slot,
  timezone,
  onClose,
  onSuccess,
  onConflict,
}: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmation, setConfirmation] = useState<BookAppointmentResponse | null>(null);

  const timeLabel = formatSlotTime(slot.startsAt, timezone);
  const dateLabel = slot.startsAt.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  });

  const staffLabel = staffId === null ? "Uygun Personel" : staffName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setStep("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/book-appointment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            shop_slug: shopSlug,
            service_id: service.id,
            staff_id: staffId,
            starts_at: slot.startsAt.toISOString(),
            customer_name: name.trim(),
            customer_phone: phone.trim() || undefined,
            customer_notes: note.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data?.should_refetch_availability) {
          onConflict();
        }
        setErrorMsg(data.error ?? "Randevu oluşturulamadı.");
        setStep("error");
        return;
      }
      setConfirmation(data as BookAppointmentResponse);
      setStep("success");
      onSuccess();
    } catch {
      setErrorMsg("Bağlantı hatası. Lütfen tekrar deneyin.");
      setStep("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[440px] rounded-sheet bg-surface shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
        {step === "form" && (
          <>
            <div className="border-b border-hair px-[22px] pb-2 pt-5">
              <h2 className="m-0 text-[20px] font-bold text-ink">Randevuyu Onayla</h2>
              <p className="mt-1.5 text-[13px] text-muted">
                {staffLabel} · {service.name} · {dateLabel}, {timeLabel}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 p-[22px]">
              <Field label="Ad Soyad">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="örn. Ahmet Yılmaz"
                  required
                  minLength={2}
                  className={inputCls}
                />
              </Field>
              <Field label="Telefon">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0(5xx) xxx xx xx"
                  className={inputCls}
                />
              </Field>
              <Field label="Not (opsiyonel)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Saç uzunluğu, tercih, vs."
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-cta bg-surfaceAlt py-3.5 text-[14px] font-semibold text-ink"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={name.trim().length < 2}
                  className="flex-[2] rounded-cta bg-navy py-3.5 text-[14px] font-semibold text-white shadow-cta disabled:opacity-40"
                >
                  Randevuyu Onayla
                </button>
              </div>
            </form>
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy border-t-transparent" />
            <p className="mt-4 text-sm text-muted">Randevu oluşturuluyor…</p>
          </div>
        )}

        {step === "success" && confirmation && (
          <div className="flex flex-col items-center px-7 py-9 text-center">
            <span className="mb-3 inline-block rounded-full bg-blue-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[1.2px] text-navy">
              Onaylandı
            </span>
            <h3 className="m-0 text-[24px] font-bold text-ink">Randevunuz alındı</h3>
            <p className="mt-2 text-[14px] leading-6 text-muted">
              {confirmation.staff_name} · {confirmation.service_name}
              <br />
              {new Date(confirmation.starts_at).toLocaleDateString("tr-TR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: timezone,
              })}
              <br />
              <span className="text-mutedAlt">onay SMS'i yolda.</span>
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-cta bg-surfaceAlt py-3.5 text-[14px] font-semibold text-ink"
            >
              Yeni randevu
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center px-7 py-9 text-center">
            <span className="mb-3 inline-block rounded-full bg-red-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[1.2px] text-red">
              Hata
            </span>
            <p className="mt-1 text-[14px] text-muted">{errorMsg}</p>
            <div className="mt-6 flex w-full gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-cta bg-surfaceAlt py-3.5 text-[14px] font-semibold text-ink"
              >
                Kapat
              </button>
              <button
                onClick={() => setStep("form")}
                className="flex-1 rounded-cta bg-navy py-3.5 text-[14px] font-semibold text-white"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-input border-[1.5px] border-hair bg-bg px-3.5 py-3 text-[14px] text-ink outline-none focus:border-navy";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
