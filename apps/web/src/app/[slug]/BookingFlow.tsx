"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type {
  BarberPublic,
  ServicePublic,
  OccupiedRange,
  Slot,
} from "@berber/shared/types";
import { ServiceSelector } from "@/components/ServiceSelector";
import { SlotGrid } from "@/components/SlotGrid";
import { BookingModal } from "@/components/BookingModal";

interface BookingFlowProps {
  barber: BarberPublic;
  services: ServicePublic[];
}

interface AvailabilityResponse {
  occupied: OccupiedRange[];
  slots: { starts_at: string; ends_at: string; available: boolean }[];
}

export function BookingFlow({ barber, services }: BookingFlowProps) {
  const [selectedService, setSelectedService] = useState<ServicePublic | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [occupied, setOccupied] = useState<OccupiedRange[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // F-08: client'ı render'lar arası tek instance olarak tut
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Initial fetch — occupied ranges'i API'dan direkt al
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    let cancelled = false;
    setIsLoadingSlots(true);

    fetch(
      `/api/availability?slug=${encodeURIComponent(barber.slug)}&date=${encodeURIComponent(selectedDate)}&service_id=${encodeURIComponent(selectedService.id)}`
    )
      .then((r) => r.json())
      .then((data: AvailabilityResponse) => {
        if (cancelled) return;
        setOccupied(data.occupied ?? []);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedService, selectedDate, barber.slug]);

  // Slotları client-side hesapla — occupied her güncellendiğinde tekrar çalışır
  useEffect(() => {
    if (!selectedService) {
      setSlots([]);
      return;
    }
    const computed = computeAvailableSlots({
      date: new Date(selectedDate),
      durationMin: selectedService.duration_min,
      workingHours: barber.working_hours,
      occupied,
      timezone: barber.timezone,
    });
    setSlots(computed);
    // F-12: tüm `barber` yerine etkilenen iki alanı dinle
  }, [occupied, selectedService, selectedDate, barber.timezone, barber.working_hours]);

  // Realtime: blocks (* event) + appointment_slots (INSERT)
  useEffect(() => {
    const channel = supabase
      .channel(`availability:${barber.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocks",
          filter: `barber_id=eq.${barber.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { starts_at: string; ends_at: string };
            setOccupied((prev) => [
              ...prev,
              { starts_at: row.starts_at, ends_at: row.ends_at },
            ]);
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { starts_at: string; ends_at: string };
            setOccupied((prev) =>
              prev.filter(
                (o) =>
                  !(o.starts_at === old.starts_at && o.ends_at === old.ends_at)
              )
            );
          } else if (payload.eventType === "UPDATE") {
            const oldRow = payload.old as { starts_at: string; ends_at: string };
            const newRow = payload.new as { starts_at: string; ends_at: string };
            setOccupied((prev) =>
              prev
                .filter(
                  (o) =>
                    !(
                      o.starts_at === oldRow.starts_at &&
                      o.ends_at === oldRow.ends_at
                    )
                )
                .concat({ starts_at: newRow.starts_at, ends_at: newRow.ends_at })
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointment_slots",
          filter: `barber_id=eq.${barber.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { starts_at: string; ends_at: string };
            setOccupied((prev) => [
              ...prev,
              { starts_at: row.starts_at, ends_at: row.ends_at },
            ]);
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { starts_at: string; ends_at: string };
            setOccupied((prev) =>
              prev.filter(
                (o) =>
                  !(o.starts_at === old.starts_at && o.ends_at === old.ends_at)
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barber.id, supabase]);

  const handleBookingSuccess = useCallback(() => {
    setSelectedSlot(null);
    // Realtime INSERT eventi occupied'ı zaten günceller; ekstra fetch gerekmez
  }, []);

  // F-09: 14 günlük tarih dilimi mount'ta bir kez hesaplanır
  const dateOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0]!;
      }),
    []
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">1. Hizmet Seçin</h2>
        <ServiceSelector
          services={services}
          selected={selectedService}
          onSelect={(s) => {
            setSelectedService(s);
            setSelectedSlot(null);
          }}
        />
      </section>

      {selectedService && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">2. Tarih Seçin</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dateOptions.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                className={`min-w-[72px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selectedDate === d
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                {new Date(d).toLocaleDateString("tr-TR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedService && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">3. Saat Seçin</h2>
          <SlotGrid
            slots={slots}
            timezone={barber.timezone}
            isLoading={isLoadingSlots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
        </section>
      )}

      {selectedSlot && selectedService && (
        <BookingModal
          barberSlug={barber.slug}
          barberName={barber.display_name}
          service={selectedService}
          slot={selectedSlot}
          timezone={barber.timezone}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
