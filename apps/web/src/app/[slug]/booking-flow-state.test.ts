import { describe, it, expect } from "vitest";
import { nextBookingSuccessState, slotBroadcastAffectsSelection } from "./booking-flow-state";

describe("nextBookingSuccessState", () => {
  it("keeps modal open so success state can be shown", () => {
    const result = nextBookingSuccessState({ modalOpen: true, selectedSlot: "09:30" });
    expect(result.modalOpen).toBe(true);
  });

  it("clears selectedSlot so the stale CTA does not reappear after success", () => {
    const result = nextBookingSuccessState({ modalOpen: false, selectedSlot: "14:45" });
    expect(result.selectedSlot).toBeNull();
  });

  it("works regardless of the input selectedSlot value", () => {
    expect(nextBookingSuccessState({ modalOpen: true, selectedSlot: null }).selectedSlot).toBeNull();
    expect(nextBookingSuccessState({ modalOpen: false, selectedSlot: "11:00" }).selectedSlot).toBeNull();
  });
});

describe("slotBroadcastAffectsSelection", () => {
  const payload = { staff_id: "staff-1", dates: ["2026-06-12"], table: "appointments", op: "INSERT" };

  it("aynı gün + aynı personel → refetch", () => {
    expect(slotBroadcastAffectsSelection(payload, "2026-06-12", "staff-1")).toBe(true);
  });

  it("'Herhangi' (staff=null) seçiliyken her personel eventi ilgilidir", () => {
    expect(slotBroadcastAffectsSelection(payload, "2026-06-12", null)).toBe(true);
  });

  it("farklı personel seçiliyken event yok sayılır", () => {
    expect(slotBroadcastAffectsSelection(payload, "2026-06-12", "staff-2")).toBe(false);
  });

  it("farklı gün eventi yok sayılır", () => {
    expect(slotBroadcastAffectsSelection(payload, "2026-06-13", "staff-1")).toBe(false);
  });

  it("UPDATE'te eski+yeni gün dizisinden biri eşleşirse refetch", () => {
    const moved = { staff_id: "staff-1", dates: ["2026-06-12", "2026-06-13"], op: "UPDATE" };
    expect(slotBroadcastAffectsSelection(moved, "2026-06-13", null)).toBe(true);
  });

  it("bozuk/eksik payload güvenli tarafta kalır → refetch", () => {
    expect(slotBroadcastAffectsSelection(null, "2026-06-12", "staff-1")).toBe(true);
    expect(slotBroadcastAffectsSelection({}, "2026-06-12", "staff-1")).toBe(true);
    expect(slotBroadcastAffectsSelection({ staff_id: 7, dates: "yarın" }, "2026-06-12", "staff-1")).toBe(true);
  });
});