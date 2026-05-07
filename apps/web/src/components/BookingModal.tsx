"use client";

import { useState } from "react";
import { formatSlotTime } from "@berber/shared/slot-utils";
import type { ServicePublic, Slot, BookAppointmentResponse } from "@berber/shared/types";

interface BookingModalProps {
  barberSlug: string;
  barberName: string;
  service: ServicePublic;
  slot: Slot;
  timezone: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "form" | "loading" | "success" | "error";

export function BookingModal({
  barberSlug,
  barberName,
  service,
  slot,
  timezone,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
            slug: barberSlug,
            service_id: service.id,
            starts_at: slot.startsAt.toISOString(),
            customer_name: name.trim(),
            customer_phone: phone.trim() || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
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
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {step === "form" && (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold">{barberName}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {service.name} · {dateLabel} · {timeLabel}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Adınız <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  required
                  minLength={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Telefon{" "}
                  <span className="text-xs text-gray-400">(isteğe bağlı)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0532 000 00 00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={name.trim().length < 2}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Randevuyu Onayla
                </button>
              </div>
            </form>
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Randevu oluşturuluyor…</p>
          </div>
        )}

        {step === "success" && confirmation && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-green-700">Randevu Alındı!</h3>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{confirmation.barber_display_name}</strong> —{" "}
              {confirmation.service_name}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(confirmation.starts_at).toLocaleDateString("tr-TR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: timezone,
              })}
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Kapat
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
              ✕
            </div>
            <h3 className="text-lg font-bold text-red-700">Hata</h3>
            <p className="mt-2 text-sm text-gray-600">{errorMsg}</p>
            <div className="mt-6 flex w-full gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium"
              >
                Kapat
              </button>
              <button
                onClick={() => setStep("form")}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white"
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
