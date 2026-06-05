function loadSentry() {
  let sentryModule: typeof import('../sentry') | undefined;
  jest.isolateModules(() => {
    sentryModule = require('../sentry');
  });
  if (!sentryModule) throw new Error('Failed to load Sentry module');
  return sentryModule;
}

describe('sentry utility', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('does not expose test-only reset helpers from production code', () => {
    expect(loadSentry()).not.toHaveProperty('__resetSentryForTest');
  });

  it('keeps init as a no-op while native Sentry is disabled', () => {
    const { initSentry } = loadSentry();

    expect(() => initSentry()).not.toThrow();
    expect(() => initSentry('https://public@example.ingest.sentry.io/123')).not.toThrow();
  });

  it('keeps user updates as a no-op while native Sentry is disabled', () => {
    const { setSentryUserFromSession } = loadSentry();

    expect(() => setSentryUserFromSession(null)).not.toThrow();
    expect(() =>
      setSentryUserFromSession({
        user: {
          id: 'user-123',
          email: 'owner@example.com',
        },
      } as any),
    ).not.toThrow();
  });

  it('keeps manual verification capture as a no-op while native Sentry is disabled', () => {
    const { captureSentryVerificationError } = loadSentry();

    expect(() => captureSentryVerificationError()).not.toThrow();
  });

  it('renders children through the fallback error boundary', () => {
    const { SentryErrorBoundary } = loadSentry();
    const child = 'child';

    expect(SentryErrorBoundary({ children: child })).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({ children: child }),
      }),
    );
  });
});
