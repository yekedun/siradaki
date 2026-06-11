// apps/mobile/lib/tour/steps.ts
/**
 * Tour step definitions for the owner and staff apps.
 * Copy tone: as simple as possible ("a baby could follow it"), Turkish.
 * Spec: docs/superpowers/specs/2026-06-10-app-tour-design.md §3-4
 */
import type { TourStep } from './TourContext';

export const TOUR_SEEN_OWNER_KEY = 'tour_seen_owner_v1';
export const TOUR_SEEN_STAFF_KEY = 'tour_seen_staff_v1';

export const ownerTourSteps: TourStep[] = [
  {
    id: 'owner-welcome',
    route: '/(owner)',
    title: 'Hoş geldin! 👋',
    body: 'Sana dükkanını 1 dakikada gezdirelim. İstediğin an "Atla" diyebilirsin.',
  },
  {
    id: 'ozet-kpi',
    route: '/(owner)',
    targetId: 'ozet-kpi',
    title: 'Günün özeti',
    body: 'Bugün kaç randevun var, kaçı bitti, ne kazanacaksın — hepsi bu üç kartta.',
  },
  {
    id: 'ozet-chips',
    targetId: 'ozet-chips',
    title: 'Usta usta bak',
    body: 'Bir ustanın adına dokun, sadece onun randevularını gör.',
  },
  {
    id: 'ajanda-daypicker',
    route: '/(owner)/agenda',
    targetId: 'ajanda-daypicker',
    title: 'Gün seç',
    body: 'Buradan başka bir güne geç. Yarına, haftaya — hepsi burada.',
  },
  {
    id: 'ajanda-timeline',
    targetId: 'ajanda-timeline',
    title: 'Günün programı',
    body: 'Her usta bir sütun. Randevular saat sırasıyla dizilir; birine dokunup detayını açabilirsin.',
  },
  {
    id: 'ajanda-fab',
    targetId: 'ajanda-fab',
    onEnter: ['owner-close-add-modal'],
    title: 'Randevu eklemek bu kadar kolay',
    body: 'Müşterin telefonla mı aradı? Bu butona bas, randevuyu sen ekle. Şimdi birlikte bakalım →',
  },
  {
    id: 'add-customer',
    host: 'add-modal',
    targetId: 'add-customer',
    onEnter: ['owner-open-add-modal'],
    onExitTour: ['owner-close-add-modal'],
    title: 'Müşteri kim?',
    body: 'Adını yaz. Telefonunu da yazarsan kaydı tam olur. Rehberden de seçebilirsin.',
  },
  {
    id: 'add-services',
    host: 'add-modal',
    targetId: 'add-services',
    onExitTour: ['owner-close-add-modal'],
    title: 'Ne yapılacak?',
    body: 'Saç, sakal… Birden fazla da seçebilirsin — süre ve fiyat kendiliğinden toplanır.',
  },
  {
    id: 'add-time',
    host: 'add-modal',
    targetId: 'add-time',
    onEnter: ['owner-open-add-modal'],
    onExitTour: ['owner-close-add-modal'],
    title: 'Saat seç, kaydet, bitti!',
    body: 'Boş bir saate dokun, sağ üstteki "Kaydet"e bas — randevu hazır. (Şimdi kaydetmiyoruz, sadece gösteriyoruz.)',
  },
  {
    id: 'avail-hours',
    route: '/(owner)/availability',
    targetId: 'avail-hours',
    onEnter: ['owner-close-add-modal'],
    title: 'Ne zaman açıksın?',
    body: 'Çalışma günlerini ve saatlerini burada ayarla. Müşteriler sadece bu saatlerden randevu alabilir.',
  },
  {
    id: 'earnings-summary',
    route: '/(owner)/earnings',
    targetId: 'earnings-summary',
    title: 'Cüzdanın burası',
    body: 'Ay sonunda cebe ne girecek? Kazancını ve usta paylarını buradan takip et.',
  },
  {
    id: 'team-list',
    route: '/(owner)/team',
    targetId: 'team-list',
    title: 'Ekibin',
    body: 'Yanında çalışan ustalar burada. Birine dokunup saatlerini düzenleyebilirsin.',
  },
  {
    id: 'team-invite',
    targetId: 'team-invite',
    title: 'Usta davet et',
    body: 'Yeni usta mı geldi? Buradan bir davet linki gönder, kendi telefonundan randevularını görsün.',
  },
  {
    id: 'ozet-avatar',
    route: '/(owner)',
    targetId: 'ozet-avatar',
    title: 'Ayarların kapısı',
    body: 'Bu yuvarlağa dokununca Ayarlar açılır. Şimdi birlikte gidelim →',
  },
  {
    id: 'settings-link',
    route: '/(owner)/settings',
    targetId: 'settings-link',
    title: 'En önemli link bu! ⭐',
    body: 'Bu link senin dükkanının kapısı. Müşterine WhatsApp\'tan at — kendi randevusunu kendisi alsın, telefonun susmasın.',
  },
  {
    id: 'settings-services',
    targetId: 'settings-services',
    title: 'Hizmetler ve fiyatlar',
    body: 'Saç kaç para, sakal kaç dakika? Buradan ekle, düzenle — müşteri randevu alırken bunları görür.',
  },
  {
    id: 'owner-done',
    title: 'Hepsi bu! 🎉',
    body: 'Artık hazırsın. Takıldığın yerde Ayarlar → "Uygulama Turu" ile bu turu tekrar izleyebilirsin.',
  },
];

export const staffTourSteps: TourStep[] = [
  {
    id: 'staff-welcome',
    route: '/(app)',
    title: 'Hoş geldin! 👋',
    body: 'Sana uygulamayı 1 dakikada gezdirelim. İstediğin an "Atla" diyebilirsin.',
  },
  {
    id: 'staff-list',
    route: '/(app)',
    targetId: 'staff-list',
    title: 'Günün randevuları',
    body: 'Bugünkü randevuların saat sırasıyla burada. Yukarıdan başka bir gün de seçebilirsin.',
  },
  {
    id: 'staff-fab',
    targetId: 'staff-fab',
    onEnter: ['staff-close-add-modal'],
    title: 'Randevu ekle',
    body: 'Müşterin telefonla mı aradı? Bu butona bas, randevuyu sen ekle. Birlikte bakalım →',
  },
  {
    id: 'staff-add-customer',
    host: 'add-modal',
    targetId: 'add-customer',
    onEnter: ['staff-open-add-modal'],
    onExitTour: ['staff-close-add-modal'],
    title: 'Müşteri ve hizmet',
    body: 'Müşterinin adını yaz, yapılacak hizmetleri seç — süre ve fiyat kendiliğinden toplanır.',
  },
  {
    id: 'staff-add-time',
    host: 'add-modal',
    targetId: 'add-time',
    onEnter: ['staff-open-add-modal'],
    onExitTour: ['staff-close-add-modal'],
    title: 'Saat seç, kaydet, bitti!',
    body: 'Boş bir saate dokun, sağ üstteki "Kaydet"e bas. (Şimdi kaydetmiyoruz, sadece gösteriyoruz.)',
  },
  {
    id: 'staff-avail',
    route: '/(app)/availability',
    targetId: 'staff-avail',
    onEnter: ['staff-close-add-modal'],
    title: 'Ne zaman çalışıyorsun?',
    body: 'Çalışma günlerini ve saatlerini burada ayarla. Müşteriler sadece bu saatlerden randevu alabilir.',
  },
  {
    id: 'staff-block',
    route: '/(app)/block',
    targetId: 'staff-block',
    title: 'Mola mı, izin mi?',
    body: 'Takvimini buradan kapat — kapattığın saate kimse randevu alamaz.',
  },
  {
    id: 'staff-settings',
    route: '/(app)/settings',
    targetId: 'staff-settings',
    title: 'Hesabım',
    body: 'Randevu linkin, bildirim ayarların ve bu turun tekrarı — hepsi burada.',
  },
  {
    id: 'staff-done',
    title: 'Hepsi bu! 🎉',
    body: 'Artık hazırsın. Takıldığın yerde Hesabım → "Uygulama Turu" ile turu tekrar izleyebilirsin.',
  },
];
