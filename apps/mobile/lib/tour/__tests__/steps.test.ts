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

  it('modal steps declare the add-modal host and surrounding steps close it', () => {
    const modalSteps = ownerTourSteps.filter((s) => s.host === 'add-modal');
    expect(modalSteps.length).toBe(3);
    // first modal step opens the modal
    expect(modalSteps[0].onEnter).toContain('owner-open-add-modal');
    // the step right after the modal block closes it
    const lastModalIdx = ownerTourSteps.indexOf(modalSteps[modalSteps.length - 1]);
    expect(ownerTourSteps[lastModalIdx + 1].onEnter).toContain('owner-close-add-modal');
    // the step right before the modal block closes it too (for back navigation)
    const firstModalIdx = ownerTourSteps.indexOf(modalSteps[0]);
    expect(ownerTourSteps[firstModalIdx - 1].onEnter).toContain('owner-close-add-modal');
  });

  it('owner tour starts and ends with centered steps', () => {
    expect(ownerTourSteps[0].targetId).toBeUndefined();
    expect(ownerTourSteps[ownerTourSteps.length - 1].targetId).toBeUndefined();
  });
});
