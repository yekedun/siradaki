'use client';

// ServiceSelector — service row layout (index.html / screen-22)

export interface Service {
  id: string;
  name: string;
  duration_min: number;
  price: number;
}

interface ServiceSelectorProps {
  services: Service[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ServiceSelector({ services, selected, onSelect }: ServiceSelectorProps) {
  if (services.length === 0) {
    return <p className="text-sm text-slate-400 py-4">Henüz hizmet tanımlanmamış.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {services.map(s => {
        const isSel = selected === s.id;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={[
              'px-4 py-4 rounded-none cursor-pointer',
              'transition-all duration-200 motion-safe:active:scale-[0.99]',
              isSel
                ? 'border-2 border-[#0B1220] bg-white'
                : 'border border-[#D6DBE5] bg-white hover:border-[#0B1220]',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={`text-[15px] font-bold ${isSel ? 'text-[#0B1220]' : 'text-[#0B1220]'}`}>
                  {s.name}
                </div>
                <div className={[
                  'inline-flex items-center mt-2 rounded-none px-2 py-0.5 border',
                  'text-[11px] font-bold tracking-[0.08em] uppercase',
                  isSel
                    ? 'text-[#FF4D1C] bg-[#FF4D1C]/10 border-[#FF4D1C]/20'
                    : 'text-[#0B1220]/45 bg-[#F7F8FA] border-[#D6DBE5]',
                ].join(' ')}>
                  {s.duration_min} dk
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[22px] font-bold tabular-nums ${isSel ? 'text-[#FF4D1C]' : 'text-[#0B1220]'}`}>
                  {s.price}₺
                </span>
                {isSel && (
                  <div className="w-5 h-5 rounded-none bg-[#0B1220] flex items-center justify-center flex-shrink-0">
                    <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
