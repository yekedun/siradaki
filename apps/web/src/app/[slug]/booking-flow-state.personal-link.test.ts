import { describe, expect, it } from "vitest";
import { shouldShowPersonalLinkBadge } from "./booking-flow-state";

describe("shouldShowPersonalLinkBadge", () => {
  it("shows the badge only when the route is a personal barber link and the preselected staff is still selected", () => {
    expect(
      shouldShowPersonalLinkBadge({
        isPersonalLink: true,
        preselectedStaffId: "staff-1",
        selectedStaffId: "staff-1",
        preselectedName: "Ahmet",
      }),
    ).toBe(true);
  });

  it("hides the badge on the shop-level booking page even if a staff member is selected", () => {
    expect(
      shouldShowPersonalLinkBadge({
        isPersonalLink: false,
        preselectedStaffId: "staff-1",
        selectedStaffId: "staff-1",
        preselectedName: "Ahmet",
      }),
    ).toBe(false);
  });

  it("hides the badge when the customer switches away from the preselected barber", () => {
    expect(
      shouldShowPersonalLinkBadge({
        isPersonalLink: true,
        preselectedStaffId: "staff-1",
        selectedStaffId: null,
        preselectedName: "Ahmet",
      }),
    ).toBe(false);
  });
});
