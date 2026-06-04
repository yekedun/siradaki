import { describe, it, expect } from "vitest";
import {
  initialOtpState,
  isOtpVerifyDisabled,
  isOtpVerified,
  isOtpBusy,
  otpResendState,
  type OtpState,
} from "./booking-flow-state";

describe("initialOtpState", () => {
  it("starts in idle step with no error and an empty code", () => {
    const state = initialOtpState();
    expect(state).toEqual({ step: "idle", error: null, code: "" });
  });
});

describe("isOtpVerifyDisabled", () => {
  it("is disabled when the code is empty", () => {
    expect(isOtpVerifyDisabled({ step: "idle", error: null, code: "" })).toBe(true);
  });

  it("is disabled when the code has fewer than 6 digits", () => {
    expect(isOtpVerifyDisabled({ step: "idle", error: null, code: "12345" })).toBe(true);
  });

  it("is enabled once exactly 6 digits have been entered", () => {
    expect(isOtpVerifyDisabled({ step: "idle", error: null, code: "123456" })).toBe(false);
  });

  it("is enabled when the code is longer than 6 characters", () => {
    expect(isOtpVerifyDisabled({ step: "idle", error: null, code: "1234567" })).toBe(false);
  });
});

describe("isOtpVerified", () => {
  it("returns true only when step is 'verified'", () => {
    const verified: OtpState = { step: "verified", error: null, code: "123456" };
    expect(isOtpVerified(verified)).toBe(true);
  });

  it("returns false for every other step", () => {
    const steps = ["idle", "sending", "verifying", "error"] as const;
    for (const step of steps) {
      expect(isOtpVerified({ step, error: null, code: "123456" })).toBe(false);
    }
  });
});

describe("isOtpBusy", () => {
  it("is busy while the OTP is being sent", () => {
    expect(isOtpBusy({ step: "sending", error: null, code: "" })).toBe(true);
  });

  it("is busy while the code is being verified against the server", () => {
    expect(isOtpBusy({ step: "verifying", error: null, code: "123456" })).toBe(true);
  });

  it("is not busy in idle state", () => {
    expect(isOtpBusy({ step: "idle", error: null, code: "" })).toBe(false);
  });

  it("is not busy after verification succeeds", () => {
    expect(isOtpBusy({ step: "verified", error: null, code: "123456" })).toBe(false);
  });

  it("is not busy after an error — the customer can retry", () => {
    expect(isOtpBusy({ step: "error", error: "Kod hatalı", code: "999999" })).toBe(false);
  });
});

describe("otpResendState", () => {
  it("transitions from error back to sending so a new code can be requested", () => {
    const before: OtpState = { step: "error", error: "Kod süresi doldu", code: "000000" };
    const after = otpResendState(before);
    expect(after.step).toBe("sending");
  });

  it("clears the previous error message on resend", () => {
    const before: OtpState = { step: "error", error: "Geçersiz kod", code: "111111" };
    const after = otpResendState(before);
    expect(after.error).toBeNull();
  });

  it("clears the code on resend so a stale OTP cannot be submitted", () => {
    const before: OtpState = { step: "error", error: "Hata", code: "654321" };
    const after = otpResendState(before);
    expect(after.code).toBe("");
  });

  it("can also transition from idle to sending (initial send)", () => {
    const after = otpResendState(initialOtpState());
    expect(after.step).toBe("sending");
    expect(after.error).toBeNull();
  });
});
