import Link from 'next/link';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface SetupStep {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

interface Props {
  steps: SetupStep[];
  shopPending: boolean;
}

export function SetupBanner({ steps, shopPending }: Props) {
  const remaining = steps.filter(s => !s.done);

  if (remaining.length === 0 && !shopPending) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {remaining.length > 0
              ? `Dükkanın hazır değil — ${remaining.length} adım kaldı`
              : 'Onay bekleniyor'}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Müşterilerin randevu alabilmesi için aşağıdakileri tamamla.
          </p>

          <ul className="mt-3 space-y-2">
            {steps.map(step => (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                {step.done
                  ? <CheckCircle size={15} className="text-green-600 shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 shrink-0" />
                }
                {step.done
                  ? <span className="text-gray-400 line-through">{step.label}</span>
                  : <Link href={step.href} className="text-amber-900 font-medium hover:underline">{step.label} →</Link>
                }
              </li>
            ))}

            {shopPending && (
              <li className="flex items-center gap-2 text-sm">
                <Clock size={15} className="text-blue-500 shrink-0" />
                <span className="text-gray-600">Admin onayı bekleniyor — onaylandıktan sonra rezervasyon linkin aktif olur</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
