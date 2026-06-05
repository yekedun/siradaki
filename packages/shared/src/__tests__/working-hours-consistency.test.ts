import { describe, it, expect } from "vitest";

// İki ayrı DEFAULT_WORKING_HOURS tanımı — tutarsızlıkları belgeler
import { DEFAULT_WORKING_HOURS as DWH_CONSTANTS } from "../constants";
import { DEFAULT_WORKING_HOURS as DWH_WORKING_HOURS } from "../working-hours";
// packages/shared ana export'u (index.ts → working-hours.ts):
import { DEFAULT_WORKING_HOURS as DWH_INDEX } from "../index";

// ===========================================================================
// Canonical export tespiti
// ===========================================================================

describe("@berber/shared canonical DEFAULT_WORKING_HOURS", () => {
  it("index.ts working-hours.ts versiyonunu export eder", () => {
    // index.ts: export { DEFAULT_WORKING_HOURS } from './working-hours'
    // → DWH_INDEX ve DWH_WORKING_HOURS aynı nesne referansı
    expect(DWH_INDEX.sat.open).toBe(DWH_WORKING_HOURS.sat.open);
  });

  it("index.ts constants.ts versiyonunu export ETMEZ", () => {
    // constants.ts versiyonu yalnızca @berber/shared/constants path'i üzerinden erişilebilir
    // index.ts bunu re-export etmez → dead-code riski
    expect(DWH_INDEX.sat.open).not.toBe(DWH_CONSTANTS.sat.open);
  });
});

// ===========================================================================
// Cumartesi (sat) tutarsızlığı
// ===========================================================================

describe("Cumartesi sabah saati tutarsızlığı", () => {
  it("constants.ts sat.open = '09:00'", () => {
    expect(DWH_CONSTANTS.sat.open).toBe("09:00");
  });

  it("working-hours.ts sat.open = '10:00'", () => {
    expect(DWH_WORKING_HOURS.sat.open).toBe("10:00");
  });

  it("TUTARSIZLIK: constants.ts ve working-hours.ts Cumartesi saatleri farklı", () => {
    // Bu test kasıtlı olarak tutarsızlığı belgeler.
    // Biri düzeltilmeden önce hangisinin doğru olduğu ürün kararı gerektirir.
    expect(DWH_CONSTANTS.sat.open).not.toBe(DWH_WORKING_HOURS.sat.open);
  });

  it("canonical (index.ts) Cumartesi 10:00 ile açılır", () => {
    // Mobil uygulama @berber/shared → working-hours.ts → '10:00' kullanır
    expect(DWH_INDEX.sat.open).toBe("10:00");
  });

  it("Cumartesi kapanış saati her iki dosyada tutarlı: 17:00", () => {
    expect(DWH_CONSTANTS.sat.close).toBe("17:00");
    expect(DWH_WORKING_HOURS.sat.close).toBe("17:00");
  });
});

// ===========================================================================
// Pazar (sun) tutarsızlığı
// ===========================================================================

describe("Pazar günü open/close değeri tutarsızlığı", () => {
  it("constants.ts sun.open = null (kapalı gün, değer yok)", () => {
    // TypeScript: sun.open null tipinde tanımlanmış
    expect(DWH_CONSTANTS.sun.open).toBeNull();
    expect(DWH_CONSTANTS.sun.close).toBeNull();
  });

  it("working-hours.ts sun.open = '09:00' (kapalı ama değer var)", () => {
    // enabled: false olduğu için pratikte kullanılmaz,
    // ancak yapısal fark bir sonraki tutarsızlık kaynağı olabilir
    expect(DWH_WORKING_HOURS.sun.open).toBe("09:00");
  });

  it("her iki dosyada da Pazar enabled: false — kapalı gün", () => {
    expect(DWH_CONSTANTS.sun.enabled).toBe(false);
    expect(DWH_WORKING_HOURS.sun.enabled).toBe(false);
  });
});

// ===========================================================================
// Tutarlı değerler (Pazartesi–Cuma)
// ===========================================================================

describe("Pazartesi–Cuma değerleri her iki dosyada tutarlı", () => {
  const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;

  it.each(weekdays)("%s: constants.ts ve working-hours.ts 09:00–19:00 aynı", (day) => {
    expect(DWH_CONSTANTS[day].open).toBe("09:00");
    expect(DWH_CONSTANTS[day].close).toBe("19:00");
    expect(DWH_WORKING_HOURS[day].open).toBe("09:00");
    expect(DWH_WORKING_HOURS[day].close).toBe("19:00");
  });

  it.each(weekdays)("%s: enabled: true her iki dosyada da", (day) => {
    expect(DWH_CONSTANTS[day].enabled).toBe(true);
    expect(DWH_WORKING_HOURS[day].enabled).toBe(true);
  });
});

// ===========================================================================
// Mobil uygulama hangi versiyonu kullanıyor?
// ===========================================================================

describe("Mobil uygulama canonical export kullanımı", () => {
  it("@berber/shared default export Cumartesi 10:00 (apps/mobile bu değeri alır)", () => {
    // apps/mobile/lib/onboarding-utils.ts:
    //   export { DEFAULT_WORKING_HOURS } from '@berber/shared';
    // apps/mobile/lib/staff-schedule.ts:
    //   import { DEFAULT_WORKING_HOURS } from './onboarding-utils';
    // → mobil uygulama working-hours.ts versiyonunu (10:00) kullanır
    expect(DWH_INDEX.sat.open).toBe("10:00");
  });

  it("@berber/shared/constants ile direkt erişilen constants.ts'deki değer 09:00 — farklı", () => {
    // Eğer bir yer @berber/shared/constants import ederse farklı bir Cumartesi saati alır
    expect(DWH_CONSTANTS.sat.open).toBe("09:00");
    expect(DWH_CONSTANTS.sat.open).not.toBe(DWH_INDEX.sat.open);
  });
});
