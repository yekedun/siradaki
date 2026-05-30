import { describe, expect, it } from "vitest";
import { toTimeLabel } from "./booking-time";

describe("toTimeLabel", () => {
  it("formats slots in the shop timezone", () => {
    expect(toTimeLabel("2026-06-01T13:00:00.000Z", "America/New_York")).toBe("09:00");
    expect(toTimeLabel("2026-06-01T13:00:00.000Z", "Europe/Istanbul")).toBe("16:00");
  });
});
