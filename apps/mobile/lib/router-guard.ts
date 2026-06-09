import type { UserRole } from './supabase';
import type { Href } from 'expo-router';

export type RootSegment = string | undefined;

export function isPublicAuthRoute(segment: RootSegment): boolean {
  return segment === '(auth)' || segment === 'invite';
}

export function pendingPathForRole(role: 'pending' | 'rejected'): Href {
  return `/(auth)/pending?status=${role}` as Href;
}

export function routeForRole(role: UserRole): Href {
  if (role === 'owner') return '/(owner)' as Href;
  if (role === 'staff') return '/(app)' as Href;
  if (role === 'pending' || role === 'rejected') return pendingPathForRole(role);
  if (role === 'unknown') return '/(auth)/pending?status=unknown' as Href;
  return '/(auth)/social-onboarding' as Href;
}

export function inviteAcceptedRoute(): Href {
  return routeForRole('staff');
}

function segmentForRole(role: UserRole): RootSegment {
  if (role === 'owner') return '(owner)';
  if (role === 'staff') return '(app)';
  return '(auth)';
}

export function shouldSkipRoleRouting(segment: RootSegment, role?: UserRole): boolean {
  if (segment === 'invite') return true;
  if (!role) return segment === '(owner)' || segment === '(app)';
  if (segment === '(owner)' || segment === '(app)') return segment === segmentForRole(role);
  return false;
}
