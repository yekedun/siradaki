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
