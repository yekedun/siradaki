export interface BookingFlowState {
  modalOpen: boolean;
  selectedSlot: string | null;
}

export function nextBookingSuccessState(_state: BookingFlowState): BookingFlowState {
  return {
    modalOpen: true,
    selectedSlot: null,
  };
}

// ---------------------------------------------------------------------------
// OTP State
// ---------------------------------------------------------------------------

export type OtpStep = "idle" | "sending" | "verifying" | "verified" | "error";

export interface OtpState {
  step: OtpStep;
  error: string | null;
  code: string;
}

/** Returns the blank OTP state that every booking flow starts in. */
export function initialOtpState(): OtpState {
  return { step: "idle", error: null, code: "" };
}

/**
 * Returns true when the "Doğrula" button should be disabled.
 * Disabled until the customer types a full 6-digit code.
 */
export function isOtpVerifyDisabled(state: OtpState): boolean {
  return state.code.length < 6;
}

/**
 * Returns true when the booking form can be submitted.
 * Only allowed once the phone has been verified.
 */
export function isOtpVerified(state: OtpState): boolean {
  return state.step === "verified";
}

/**
 * Returns true when an async OTP operation is in flight.
 * Both buttons (send & verify) should be disabled in this window.
 */
export function isOtpBusy(state: OtpState): boolean {
  return state.step === "sending" || state.step === "verifying";
}

/**
 * Transitions from any state back to "sending" so the customer can
 * request a new code (e.g. after an error).
 */
export function otpResendState(state: OtpState): OtpState {
  return { ...state, step: "sending", error: null, code: "" };
}

// ---------------------------------------------------------------------------

export interface PersonalLinkBadgeState {
  isPersonalLink: boolean;
  preselectedStaffId?: string | null;
  selectedStaffId: string | null;
  preselectedName?: string | null;
}

export function shouldShowPersonalLinkBadge(state: PersonalLinkBadgeState): boolean {
  return (
    state.isPersonalLink &&
    Boolean(state.preselectedName) &&
    state.preselectedStaffId != null &&
    state.selectedStaffId === state.preselectedStaffId
  );
}
