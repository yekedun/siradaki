// apps/mobile/lib/__tests__/staff-schedule.test.ts
// Bu test dosyası DEFAULT_STAFF_SCHEDULE fallback davranışına ve
// DB verisi gelince hardcoded değerlerin override edilmesine odaklanır.
// (apps/mobile/__tests__/staff-schedule.test.ts dönüşüm mantığını kapsar;
//  bu dosya yalnızca default değer / override senaryolarını hedef alır.)

import {
  DEFAULT_STAFF_SCHEDULE,
  rowsToStaffSchedule,
  staffScheduleToRows,
  type StaffScheduleRow,
} from "../staff-schedule";

// ===========================================================================
// DEFAULT_STAFF_SCHEDULE fallback — DB verisi yok
// ===========================================================================

describe("DEFAULT_STAFF_SCHEDULE — DB verisi olmadığında fallback", () => {
  it("rowsToStaffSchedule([]) tüm günleri DEFAULT değerlerle döndürür", () => {
    const schedule = rowsToStaffSchedule([]);
    expect(schedule).toEqual(DEFAULT_STAFF_SCHEDULE);
  });

  it("Pazartesi–Cumartesi default start: '09:00'", () => {
    const schedule = rowsToStaffSchedule([]);
    // İndeks 1–6: Pzt, Sal, Car, Per, Cum, Cmt
    for (let i = 1; i <= 6; i++) {
      expect(schedule[i].start).toBe("09:00");
    }
  });

  it("Pazartesi–Cumartesi default end: '19:00'", () => {
    const schedule = rowsToStaffSchedule([]);
    for (let i = 1; i <= 6; i++) {
      expect(schedule[i].end).toBe("19:00");
    }
  });

  it("Pazar (index 0) default open: false", () => {
    const schedule = rowsToStaffSchedule([]);
    expect(schedule[0].open).toBe(false);
  });

  it("Pazar (index 0) default start/end değerleri '09:00'/'19:00'", () => {
    const schedule = rowsToStaffSchedule([]);
    expect(schedule[0].start).toBe("09:00");
    expect(schedule[0].end).toBe("19:00");
  });

  it("tüm günlerde default breakStart/breakEnd boş string", () => {
    const schedule = rowsToStaffSchedule([]);
    for (const day of schedule) {
      expect(day.breakStart).toBe("");
      expect(day.breakEnd).toBe("");
    }
  });
});

// ===========================================================================
// DB verisi gelince fallback KULLANILMAZ
// ===========================================================================

describe("rowsToStaffSchedule — DB verisi hardcoded fallback'i override eder", () => {
  it("tek bir gün DB'den gelirse o gün default değerlerin üzerine yazar", () => {
    const rows: StaffScheduleRow[] = [
      {
        day_of_week: 1, // Pzt
        is_working: true,
        work_start: "08:00", // farklı saatten açılıyor
        work_end: "18:00",
        break_start: null,
        break_end: null,
      },
    ];
    const schedule = rowsToStaffSchedule(rows);
    // Pzt (index 1) DB değerini kullanmalı
    expect(schedule[1].start).toBe("08:00"); // hardcoded '09:00' kullanılmamalı
    expect(schedule[1].end).toBe("18:00");   // hardcoded '19:00' kullanılmamalı
  });

  it("DB'de is_working: false gelen gün open: false olur (default true bile olsa)", () => {
    const rows: StaffScheduleRow[] = [
      {
        day_of_week: 2, // Sal — default olarak open: true
        is_working: false,
        work_start: "09:00",
        work_end: "19:00",
        break_start: null,
        break_end: null,
      },
    ];
    const schedule = rowsToStaffSchedule(rows);
    expect(schedule[2].open).toBe(false); // DB değeri kazanır
  });

  it("DB'de is_working: true gelen Pazar open: true olur (default false'i override eder)", () => {
    const rows: StaffScheduleRow[] = [
      {
        day_of_week: 0, // Paz — default olarak open: false
        is_working: true,
        work_start: "10:00",
        work_end: "14:00",
        break_start: null,
        break_end: null,
      },
    ];
    const schedule = rowsToStaffSchedule(rows);
    expect(schedule[0].open).toBe(true); // DB override
    expect(schedule[0].start).toBe("10:00");
    expect(schedule[0].end).toBe("14:00");
  });

  it("7 günün tümü DB'den gelirse hiçbir günde '09:00'-'19:00' default kullanılmaz", () => {
    const rows: StaffScheduleRow[] = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      is_working: i !== 0,
      work_start: "08:30",
      work_end: "17:30",
      break_start: null,
      break_end: null,
    }));
    const schedule = rowsToStaffSchedule(rows);
    for (const day of schedule) {
      expect(day.start).toBe("08:30"); // hiçbiri '09:00' olmamalı
      expect(day.end).toBe("17:30");   // hiçbiri '19:00' olmamalı
    }
  });

  it("DB verisi olan günler override edilir, olmayan günler default kalır", () => {
    // Yalnızca Pzt (1) ve Çar (3) DB'den geliyor
    const rows: StaffScheduleRow[] = [
      { day_of_week: 1, is_working: true, work_start: "07:00", work_end: "16:00", break_start: null, break_end: null },
      { day_of_week: 3, is_working: true, work_start: "11:00", work_end: "20:00", break_start: null, break_end: null },
    ];
    const schedule = rowsToStaffSchedule(rows);

    // DB verisi olan günler
    expect(schedule[1].start).toBe("07:00");
    expect(schedule[3].start).toBe("11:00");

    // DB verisi olmayan günler → default '09:00'
    expect(schedule[2].start).toBe("09:00"); // Sal
    expect(schedule[4].start).toBe("09:00"); // Per
    expect(schedule[5].start).toBe("09:00"); // Cum
  });
});

// ===========================================================================
// staffScheduleToRows için fallback değerler
// ===========================================================================

describe("staffScheduleToRows — boş start/end → '09:00'/'19:00' fallback", () => {
  it("start boş string ise work_start '09:00' olur", () => {
    const rows = staffScheduleToRows("staff-1", [
      { day: "Pzt", open: true, start: "", end: "19:00", breakStart: "", breakEnd: "" },
    ]);
    expect(rows[0].work_start).toBe("09:00");
  });

  it("end boş string ise work_end '19:00' olur", () => {
    const rows = staffScheduleToRows("staff-1", [
      { day: "Pzt", open: true, start: "09:00", end: "", breakStart: "", breakEnd: "" },
    ]);
    expect(rows[0].work_end).toBe("19:00");
  });
});
