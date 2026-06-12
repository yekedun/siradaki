// apps/mobile/lib/tour/__tests__/steps.test.ts
import {
  ownerTourSteps,
  staffTourSteps,
  TOUR_SEEN_OWNER_KEY,
  TOUR_SEEN_STAFF_KEY,
} from '../steps';

describe('tour step definitions', () => {
  it('storage keys are versioned and distinct', () => {
    expect(TOUR_SEEN_OWNER_KEY).toBe('tour_seen_owner_v1');
    expect(TOUR_SEEN_STAFF_KEY).toBe('tour_seen_staff_v1');
  });

  it.each([
    ['owner', ownerTourSteps],
    ['staff', staffTourSteps],
  ])('%s steps have unique ids and non-empty copy', (_role, steps) => {
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of steps) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['owner', ownerTourSteps, 'owner', 3],
    ['staff', staffTourSteps, 'staff', 2],
  ] as const)(
    '%s modal steps declare the add-modal host and surrounding steps close it',
    (_role, steps, prefix, expectedCount) => {
      const modalSteps = steps.filter((s) => s.host === 'add-modal');
      expect(modalSteps.length).toBe(expectedCount);
      // first modal step opens the modal
      expect(modalSteps[0].onEnter).toContain(`${prefix}-open-add-modal`);
      // the step right after the modal block closes it
      const lastModalIdx = steps.indexOf(modalSteps[modalSteps.length - 1]);
      expect(steps[lastModalIdx + 1].onEnter).toContain(`${prefix}-close-add-modal`);
      // the step right before the modal block closes it too (for back navigation)
      const firstModalIdx = steps.indexOf(modalSteps[0]);
      expect(steps[firstModalIdx - 1].onEnter).toContain(`${prefix}-close-add-modal`);
      // Finding 1: the LAST modal step must also reopen the modal on onEnter
      // so that back-navigation from the trailing step re-shows the modal.
      expect(modalSteps[modalSteps.length - 1].onEnter).toContain(`${prefix}-open-add-modal`);
    },
  );

  it.each([
    ['owner', ownerTourSteps, 'owner-close-add-modal'],
    ['staff', staffTourSteps, 'staff-close-add-modal'],
  ] as const)(
    '%s every add-modal step declares the role close action in onExitTour (Finding 2)',
    (_role, steps, closeAction) => {
      const modalSteps = steps.filter((s) => s.host === 'add-modal');
      for (const step of modalSteps) {
        expect(step.onExitTour).toContain(closeAction);
      }
    },
  );

  it('every onEnter / onExitTour action id is in the known set', () => {
    const knownActionIds = new Set([
      'owner-open-add-modal',
      'owner-close-add-modal',
      'staff-open-add-modal',
      'staff-close-add-modal',
    ]);
    for (const steps of [ownerTourSteps, staffTourSteps]) {
      for (const step of steps) {
        for (const actionId of step.onEnter ?? []) {
          expect(knownActionIds.has(actionId)).toBe(true);
        }
        for (const actionId of step.onExitTour ?? []) {
          expect(knownActionIds.has(actionId)).toBe(true);
        }
      }
    }
  });

  it('every defined route matches the expected pattern', () => {
    const routePattern = /^\/\((owner|app)\)(\/[a-z-]+)?$/;
    for (const steps of [ownerTourSteps, staffTourSteps]) {
      for (const step of steps) {
        if (step.route !== undefined) {
          expect(step.route).toMatch(routePattern);
        }
      }
    }
  });

  it('owner tour starts and ends with centered steps', () => {
    expect(ownerTourSteps[0].targetId).toBeUndefined();
    expect(ownerTourSteps[ownerTourSteps.length - 1].targetId).toBeUndefined();
  });

  it('owner tour points to the settings avatar in the tab bar', () => {
    const settingsStep = ownerTourSteps.find((step) => step.id === 'owner-settings-tab');

    expect(settingsStep?.targetId).toBe('owner-settings-tab');
  });
});
