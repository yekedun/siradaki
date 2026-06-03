export type OwnerTabRoute = 'index' | 'agenda' | 'kazanc' | 'availability' | 'team';

export interface OwnerTabDefinition {
  route: OwnerTabRoute;
  label: string;
  icon: 'bar-chart-3' | 'calendar-days' | 'wallet' | 'clock' | 'users';
}

export const OWNER_TAB_ORDER: OwnerTabDefinition[] = [
  { route: 'index', label: 'Özet', icon: 'bar-chart-3' },
  { route: 'agenda', label: 'Ajanda', icon: 'calendar-days' },
  { route: 'kazanc', label: 'Kazanç', icon: 'wallet' },
  { route: 'availability', label: 'Müsaitlik', icon: 'clock' },
  { route: 'team', label: 'Ekip', icon: 'users' },
];

export const HIDDEN_OWNER_ROUTES = ['earnings', 'onboarding', 'services', 'settings'] as const;
