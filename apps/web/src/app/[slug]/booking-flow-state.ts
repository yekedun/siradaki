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
// Slot broadcast (shop_slots:{shop_id} kanalından gelen slots_changed eventi)
// ---------------------------------------------------------------------------

/**
 * Broadcast payload'ı mevcut seçimi (tarih + personel) etkiliyorsa true döner.
 * Payload beklenmedik şekildeyse güvenli tarafta kalır ve true döner —
 * gereksiz bir refetch, kaçırılmış bir güncellemeden iyidir.
 */
export function slotBroadcastAffectsSelection(
  payload: unknown,
  selectedDateStr: string,
  selectedStaffId: string | null,
): boolean {
  if (typeof payload !== "object" || payload === null) return true;
  const p = payload as { staff_id?: unknown; dates?: unknown };

  if (
    selectedStaffId !== null &&
    typeof p.staff_id === "string" &&
    p.staff_id !== selectedStaffId
  ) {
    return false;
  }

  if (
    Array.isArray(p.dates) &&
    p.dates.length > 0 &&
    p.dates.every((d) => typeof d === "string") &&
    !p.dates.includes(selectedDateStr)
  ) {
    return false;
  }

  return true;
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
