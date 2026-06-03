export function missingWorkingHoursMessage(): string {
  return 'Çalışma saatleri henüz ayarlanmamış. Lütfen önce çalışma saatlerini girin.';
}

export function shopSaveErrorMessage(message?: string): string {
  return message ? `Ayarlar kaydedilemedi: ${message}` : 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.';
}
