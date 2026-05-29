jest.mock('posthog-react-native', () => {
  return jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  }));
});

const MockPostHog = require('posthog-react-native') as jest.Mock;

function loadAnalytics() {
  let mod: typeof import('../analytics') | undefined;
  jest.isolateModules(() => {
    mod = require('../analytics');
  });
  if (!mod) throw new Error('Failed to load analytics module');
  return mod;
}

describe('analytics utility', () => {
  beforeEach(() => {
    MockPostHog.mockClear();
  });

  it('does not initialize when API key is missing', () => {
    const { initAnalytics, trackEvent } = loadAnalytics();
    initAnalytics(undefined);
    trackEvent('test_event');
    expect(MockPostHog).not.toHaveBeenCalled();
  });

  it('initializes once when API key is provided', () => {
    const { initAnalytics } = loadAnalytics();
    initAnalytics('phc_testkey123', 'https://eu.posthog.com');
    initAnalytics('phc_testkey123', 'https://eu.posthog.com');
    expect(MockPostHog).toHaveBeenCalledTimes(1);
    expect(MockPostHog).toHaveBeenCalledWith('phc_testkey123', {
      host: 'https://eu.posthog.com',
    });
  });

  it('calls capture with event name and properties', () => {
    const { initAnalytics, trackEvent } = loadAnalytics();
    initAnalytics('phc_testkey123');
    trackEvent('login_success', { method: 'email' });
    const instance = MockPostHog.mock.results[0].value;
    expect(instance.capture).toHaveBeenCalledWith('login_success', { method: 'email' });
  });

  it('calls identify with user UUID', () => {
    const { initAnalytics, identifyUser } = loadAnalytics();
    initAnalytics('phc_testkey123');
    identifyUser('user-uuid-123');
    const instance = MockPostHog.mock.results[0].value;
    expect(instance.identify).toHaveBeenCalledWith('user-uuid-123');
  });

  it('calls reset on logout', () => {
    const { initAnalytics, resetAnalytics } = loadAnalytics();
    initAnalytics('phc_testkey123');
    resetAnalytics();
    const instance = MockPostHog.mock.results[0].value;
    expect(instance.reset).toHaveBeenCalled();
  });

  it('silently no-ops when not initialized', () => {
    const { trackEvent, identifyUser, resetAnalytics } = loadAnalytics();
    expect(() => {
      trackEvent('app_open');
      identifyUser('user-uuid-123');
      resetAnalytics();
    }).not.toThrow();
  });
});
