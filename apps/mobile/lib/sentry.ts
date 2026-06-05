import type { Session } from '@supabase/supabase-js';
import { Fragment, createElement, type ReactNode } from 'react';

export function initSentry(_dsn = process.env.EXPO_PUBLIC_SENTRY_DSN) {
  return;
}

export function setSentryUserFromSession(_session: Session | null) {
  return;
}

export function captureSentryVerificationError() {
  return;
}

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  return createElement(Fragment, null, children);
}
