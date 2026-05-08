import { formatSlotTime } from "@berber/shared/slot-utils";
import type { Slot } from "@berber/shared/types";

interface SlotGridProps {
  slots: Slot[];
  timezone: string;
  isLoading: boolean;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
}

export function SlotGrid({
  slots,
  timezone,
  isLoading,
  selected,
  onSelect,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-input bg-hair opacity-50"
          />
        ))}
      </div>
    );
  }

  const available = slots.filter((s) => s.available);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-mutedAlt">
        Bu gün için çalışma saati tanımlanmamış.
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-mutedAlt">
        Bu günde müsait saat kalmadı. Başka bir gün seçin.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {slots.map((slot) => {
        const timeLabel = formatSlotTime(slot.startsAt, timezone);
        const isSelected =
          selected?.startsAt.toISOString() === slot.startsAt.toISOString();
        const isUnavailable = !slot.available;

        if (isUnavailable) {
          return (
            <div
              key={slot.startsAt.toISOString()}
              className="flex h-11 items-center justify-center rounded-input bg-surfaceAlt text-[13px] font-semibold tabular-nums text-mutedAlt line-through"
              title="Dolu"
            >
              {timeLabel}
            </div>
          );
        }

        return (
          <button
            key={slot.startsAt.toISOString()}
            onClick={() => onSelect(slot)}
            className={`flex h-11 items-center justify-center rounded-input border text-[13px] tabular-nums transition-colors ${
              isSelected
                ? "border-navy bg-navy font-bold text-white"
                : "border-hair bg-surface font-semibold text-ink hover:border-navy/40"
            }`}
          >
            {timeLabel}
          </button>
        );
      })}
    </div>
  );
}
