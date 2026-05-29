jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  ErrorBoundary: jest.fn(({ children }: { children: React.ReactNode }) => children),
}));

const mockSentry = require('@sentry/react-native');

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
    mockSentry.init.mockClear();
    mockSentry.setUser.mockClear();
    mockSentry.captureException.mockClear();
  });

  it('does not expose test-only reset helpers from production code', () => {
    expect(loadSentry()).not.toHaveProperty('__resetSentryForTest');
  });

  it('does not initialize Sentry when DSN is missing', () => {
    const { initSentry } = loadSentry();

    initSentry();
    initSentry();

    expect(mockSentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry once when DSN is configured', () => {
    const { initSentry } = loadSentry();

    initSentry('https://public@example.ingest.sentry.io/123');
    initSentry('https://public@example.ingest.sentry.io/123');

    expect(mockSentry.init).toHaveBeenCalledTimes(1);
    expect(mockSentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.ingest.sentry.io/123',
        enabled: true,
        enableAutoSessionTracking: true,
      }),
    );
  });

  it('sets a minimal Sentry user from a Supabase session', () => {
    const { setSentryUserFromSession } = loadSentry();

    setSentryUserFromSession({
      user: {
        id: 'user-123',
        email: 'owner@example.com',
      },
    } as any);

    expect(mockSentry.setUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'owner@example.com',
    });
  });

  it('clears the Sentry user when session is null', () => {
    const { setSentryUserFromSession } = loadSentry();

    setSentryUserFromSession(null);

    expect(mockSentry.setUser).toHaveBeenCalledWith(null);
  });

  it('captures manual verification errors', () => {
    const { captureSentryVerificationError } = loadSentry();

    captureSentryVerificationError();

    expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockSentry.captureException.mock.calls[0][0].message).toBe(
      'Sentry mobile verification error',
    );
  });
});
