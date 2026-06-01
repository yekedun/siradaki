export type OwnerTabRoute = 'index' | 'agenda' | 'kazanc' | 'team' | 'settings';

export interface OwnerTabDefinition {
  route: OwnerTabRoute;
  label: string;
  icon: 'bar-chart-3' | 'calendar-days' | 'wallet' | 'users' | 'settings';
}

export const OWNER_TAB_ORDER: OwnerTabDefinition[] = [
  { route: 'index', label: 'Özet', icon: 'bar-chart-3' },
  { route: 'agenda', label: 'Ajanda', icon: 'calendar-days' },
  { route: 'kazanc', label: 'Kazanç', icon: 'wallet' },
  { route: 'team', label: 'Ekip', icon: 'users' },
  { route: 'settings', label: 'Ayarlar', icon: 'settings' },
];

export const HIDDEN_OWNER_ROUTES = ['earnings', 'onboarding', 'services', 'availability'] as const;
