import type { ServicePublic } from "@berber/shared/types";

interface ServiceSelectorProps {
  services: ServicePublic[];
  selected: ServicePublic | null;
  onSelect: (service: ServicePublic) => void;
}

export function ServiceSelector({
  services,
  selected,
  onSelect,
}: ServiceSelectorProps) {
  if (services.length === 0) {
    return <p className="text-sm text-mutedAlt">Henüz hizmet tanımlanmamış.</p>;
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {services.map((service) => {
        const sel = selected?.id === service.id;
        return (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={`rounded-card border-[1.5px] p-4 text-left transition-colors ${
              sel
                ? "border-navy bg-blue-soft"
                : "border-hair bg-surface hover:border-blue/40"
            }`}
          >
            <div
              className={`text-[14px] font-semibold ${
                sel ? "text-navy" : "text-ink"
              }`}
            >
              {service.name}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{service.duration_min} dk</span>
              {service.price_cents != null && (
                <span className={`font-semibold ${sel ? "text-navy" : "text-ink"}`}>
                  ₺{(service.price_cents / 100).toFixed(0)}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
