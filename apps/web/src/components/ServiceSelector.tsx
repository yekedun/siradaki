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
    return (
      <p className="text-sm text-gray-400">Henüz hizmet tanımlanmamış.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const isSelected = selected?.id === service.id;
        return (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              isSelected
                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
            }`}
          >
            <div>
              <p className={`font-medium ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                {service.name}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                {service.duration_min} dakika
              </p>
            </div>
            {service.price_cents != null && (
              <span className={`ml-4 text-sm font-semibold ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                ₺{(service.price_cents / 100).toFixed(0)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
