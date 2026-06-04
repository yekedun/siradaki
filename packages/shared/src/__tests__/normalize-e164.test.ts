import { describe, it, expect } from "vitest";
import { normalizeToE164 } from "../phone-utils.ts";

describe("normalizeToE164", () => {
  // --- canonical Turkish formats ---
  it("05551234567 → +905551234567 (leading zero stripped)", () => {
    expect(normalizeToE164("05551234567")).toBe("+905551234567");
  });

  it("5551234567 → +905551234567 (bare 10-digit)", () => {
    expect(normalizeToE164("5551234567")).toBe("+905551234567");
  });

  it("+905551234567 → +905551234567 (already E.164, unchanged)", () => {
    expect(normalizeToE164("+905551234567")).toBe("+905551234567");
  });

  it("905551234567 → +905551234567 (+ prefix missing, added)", () => {
    expect(normalizeToE164("905551234567")).toBe("+905551234567");
  });

  // --- whitespace / punctuation stripped ---
  it("+90 555 123 45 67 → +905551234567 (spaces removed)", () => {
    expect(normalizeToE164("+90 555 123 45 67")).toBe("+905551234567");
  });

  it("+90-555-123-4567 → +905551234567 (dashes removed)", () => {
    expect(normalizeToE164("+90-555-123-4567")).toBe("+905551234567");
  });

  it("(0555) 123 45 67 → +905551234567 (parentheses + spaces removed)", () => {
    expect(normalizeToE164("(0555) 123 45 67")).toBe("+905551234567");
  });

  it("05 55 123 45 67 → +905551234567 (spaces in leading-zero format)", () => {
    expect(normalizeToE164("05 55 123 45 67")).toBe("+905551234567");
  });

  // --- invalid / fallback ---
  it("returns null for too-short number", () => {
    expect(normalizeToE164("12345")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeToE164("")).toBeNull();
  });

  it("returns null for number with letters", () => {
    expect(normalizeToE164("+90abc1234567")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeToE164("   ")).toBeNull();
  });

  it("returns null for non-mobile Turkish number (landline prefix 2)", () => {
    // 02121234567 — starts with 2, not 5
    expect(normalizeToE164("02121234567")).toBeNull();
  });
});
