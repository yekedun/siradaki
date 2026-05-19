import type { ServicePublic } from "@berber/shared/types";
import { ServiceRow } from "@/components/ds";

interface ServiceSelectorProps {
  services: ServicePublic[];
  selected: ServicePublic | null;
  onSelect: (service: ServicePublic) => void;
}

export function ServiceSelector({ services, selected, onSelect }: ServiceSelectorProps) {
  if (services.length === 0) {
    return <p className="text-sm text-slate-400">Henüz hizmet tanımlanmamış.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {services.map((service) => (
        <ServiceRow
          key={service.id}
          name={service.name}
          duration={service.duration_min}
          price={Math.round((service.price_cents ?? 0) / 100)}
          selected={selected?.id === service.id}
          onClick={() => onSelect(service)}
        />
      ))}
    </div>
  );
}
