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
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-lg bg-gray-200"
          />
        ))}
      </div>
    );
  }

  const available = slots.filter((s) => s.available);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Bu gün için çalışma saati tanımlanmamış.
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Bu günde müsait saat kalmadı. Başka bir gün seçin.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {slots.map((slot) => {
        const timeLabel = formatSlotTime(slot.startsAt, timezone);
        const isSelected =
          selected?.startsAt.toISOString() === slot.startsAt.toISOString();
        const isUnavailable = !slot.available;

        if (isUnavailable) {
          return (
            <div
              key={slot.startsAt.toISOString()}
              className="flex h-10 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 line-through"
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
            className={`flex h-10 items-center justify-center rounded-lg text-xs font-medium transition-all ${
              isSelected
                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                : "bg-white border border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            {timeLabel}
          </button>
        );
      })}
    </div>
  );
}
