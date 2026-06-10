import { AGENDA_ACTIONS_BOTTOM_OFFSET } from '../lib/agenda-layout';

describe('agenda floating actions layout', () => {
  it('keeps the actions close to the tab bar without adding its height twice', () => {
    expect(AGENDA_ACTIONS_BOTTOM_OFFSET).toBe(16);
    expect(AGENDA_ACTIONS_BOTTOM_OFFSET).toBeLessThan(74);
  });
});
