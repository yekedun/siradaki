'use client';

import { useEffect, useState } from 'react';

// SlotGrid — from index.html slot section
// 5-col grid on ≥400px, 4-col on <400px (useColumns drives this dynamically)

function useColumns(): number {
  const [cols, setCols] = useState(5);
  useEffect(() => {
    function update() {
      setCols(window.innerWidth < 400 ? 4 : 5);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return cols;
}

export interface Slot {
  time: string;
  available: boolean;
  hot?: boolean;
}

interface SlotGridProps {
  slots: Slot[];
  selected: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isClosed?: boolean;
  isAllFull?: boolean;
}

export function SlotGrid({
  slots, selected, onSelect,
  loading, error, onRetry,
  isClosed, isAllFull,
}: SlotGridProps) {
  const cols = useColumns();
  const gridStyle = { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 } as const;

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[50px] rounded-none bg-[#EEF1F5] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-semibold text-ink-900">Müsaitlik bilgisi alınamadı.</p>
        <p className="text-xs text-slate-400 mt-1">Bağlantıyı kontrol edip tekrar deneyin.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-sm font-semibold text-brand-600 bg-transparent border-0 cursor-pointer underline underline-offset-2 font-sans"
          >
            Tekrar Dene
          </button>
        )}
      </div>
    );
  }

  if (isClosed) {
    return <p className="text-sm text-slate-400 py-4">Bu gün için çalışma saati tanımlanmamış.</p>;
  }

  if (isAllFull || (slots.length > 0 && slots.every(s => !s.available))) {
    return <p className="text-sm text-slate-400 py-4">Bu günde müsait saat kalmadı. Başka bir gün seçin.</p>;
  }

  return (
    <div style={gridStyle}>
      {slots.map(s => {
        const isSel = selected === s.time;
        return (
          <button
            key={s.time}
            disabled={!s.available}
            onClick={() => onSelect(s.time)}
            className={[
              'h-[50px] rounded-none flex flex-col items-center justify-center gap-0.5',
              'font-sans text-sm tabular-nums transition-all duration-150',
              isSel
                ? 'bg-[#FF4D1C] border border-[#FF4D1C] text-white font-bold motion-safe:scale-[1.02]'
                : s.available
                  ? s.hot
                    ? 'bg-[#ECE6DC] border border-[#6F4A14] text-[#503410] font-bold cursor-pointer motion-safe:active:scale-[0.97]'
                    : 'bg-white border border-[#D6DBE5] text-[#0B1220] font-bold hover:border-[#0B1220] cursor-pointer motion-safe:active:scale-[0.97]'
                  : 'bg-[#EEF1F5] border border-transparent text-[#8590A4] cursor-not-allowed',
            ].join(' ')}
          >
            <span>{s.time}</span>
            {s.hot && !isSel && s.available && (
              <span className="text-[9px] font-semibold text-umber-600 tracking-wide leading-none">az yer</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
