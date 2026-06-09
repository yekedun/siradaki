import { describe, it, expect } from "vitest";
import { DEFAULT_WORKING_HOURS } from "../index";

describe("DEFAULT_WORKING_HOURS canonical values", () => {
  it("Cumartesi 10:00–17:00 açık", () => {
    expect(DEFAULT_WORKING_HOURS.sat.open).toBe("10:00");
    expect(DEFAULT_WORKING_HOURS.sat.close).toBe("17:00");
    expect(DEFAULT_WORKING_HOURS.sat.enabled).toBe(true);
  });

  it("Pazar kapalı, open/close null", () => {
    expect(DEFAULT_WORKING_HOURS.sun.enabled).toBe(false);
    expect(DEFAULT_WORKING_HOURS.sun.open).toBeNull();
    expect(DEFAULT_WORKING_HOURS.sun.close).toBeNull();
  });

  const weekdays = ["mon", "tue", "wed", "thu", "fri"] as const;
  it.each(weekdays)("%s: 09:00–19:00, enabled", (day) => {
    expect(DEFAULT_WORKING_HOURS[day]).toEqual({ open: "09:00", close: "19:00", enabled: true });
  });
});
