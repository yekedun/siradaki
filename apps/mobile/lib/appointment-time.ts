function toMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) return NaN;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return NaN;
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

function fromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const WORKING_HOUR_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type WorkingHourKey = typeof WORKING_HOUR_KEYS[number];

export type AppointmentWorkingHours = Partial<Record<WorkingHourKey, {
  open?: string;
  close?: string;
  enabled?: boolean;
}>>;

export function formatLocalAppointmentDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateAppointmentTimes({
  open,
  close,
  stepMinutes = 30,
  durationMinutes = 30,
}: {
  open: string;
  close: string;
  stepMinutes?: number;
  durationMinutes?: number;
}): string[] {
  const start = toMinutes(open);
  const closeMin = toMinutes(close);
  if (isNaN(start) || isNaN(closeMin)) {
    console.warn('[appointment-time] Invalid time string:', { open, close });
    return [];
  }
  const latestStart = closeMin - durationMinutes;
  if (latestStart < start || stepMinutes <= 0) return [];

  const slots: string[] = [];
  for (let minute = start; minute <= latestStart; minute += stepMinutes) {
    slots.push(fromMinutes(minute));
  }
  return slots;
}

// Istanbul timezone'unda bir Date'in HH:MM değerini dakika cinsinden döndürür.
// Cihaz timezone ayarından bağımsızdır.
function getMinutesInIstanbul(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24;
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

// İki Date'in Istanbul takviminde aynı gün olup olmadığını kontrol eder.
function isSameDayIstanbul(a: Date, b: Date): boolean {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // "YYYY-MM-DD"
  return fmt(a) === fmt(b);
}

export function generateAppointmentTimesForDate(
  date: Date,
  workingHours: AppointmentWorkingHours | null | undefined,
  durationMinutes = 30,
  /** Sunucu zamanı (ms). Verilirse cihaz saati yerine bu kullanılır. */
  nowMs?: number,
): string[] {
  if (isNaN(date.getTime())) {
    console.warn('[appointment-time] Invalid date passed to generateAppointmentTimesForDate');
    return [];
  }
  const key = WORKING_HOUR_KEYS[date.getDay()];
  const day = workingHours?.[key];
  if (day?.enabled === false) return [];

  const slots = generateAppointmentTimes({
    open: day?.open ?? '09:00',
    close: day?.close ?? '23:59',
    stepMinutes: 30,
    durationMinutes,
  });

  // Bugün için geçmiş saatleri filtrele.
  // nowMs sunucudan geliyorsa cihaz saati manipülasyonuna karşı koruma sağlar.
  const now = new Date(nowMs ?? Date.now());
  if (!isSameDayIstanbul(date, now)) return slots;

  const nowMinutes = getMinutesInIstanbul(now);
  return slots.filter(t => toMinutes(t) > nowMinutes);
}

export function buildLocalAppointmentTimestamp(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offsetHour = String(Math.floor(abs / 60)).padStart(2, '0');
  const offsetMinute = String(abs % 60).padStart(2, '0');

  return `${date}T${time}:00${sign}${offsetHour}:${offsetMinute}`;
}
