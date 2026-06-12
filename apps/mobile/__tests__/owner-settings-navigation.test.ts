import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readMobileSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

test('replaces the team tab with the avatar settings tab', () => {
  const layout = readMobileSource('app/(owner)/_layout.tsx');

  expect(layout).toContain('name="team"');
  expect(layout).toMatch(/name="team"[\s\S]*?href:\s*null/);
  expect(layout).toMatch(/name="settings"[\s\S]*?title:\s*'Ayarlar'/);
  expect(layout).toMatch(/name="settings"[\s\S]*?OwnerTabAvatar/);
  expect(layout).toContain('id="owner-settings-tab"');
});

test('shows team management in settings like the services row', () => {
  const settings = readMobileSource('app/(owner)/settings.tsx');

  expect(settings).toContain("router.push('/(owner)/team')");
  expect(settings).toContain('Ekip Yönetimi');
  expect(settings).toContain('Personeli, çalışma saatlerini ve komisyonları yönet');
  expect(settings).toContain('accessibilityLabel="Ekip yönetimini aç"');
  expect(settings).toContain('accessibilityLabel="Hizmetleri aç"');
});

test('team management has the same explicit back affordance as services', () => {
  const team = readMobileSource('app/(owner)/team.tsx');

  expect(team).toContain("import { useRouter } from 'expo-router'");
  expect(team).not.toContain('router.canGoBack()');
  expect(team).toContain("router.replace('/(owner)/settings')");
  expect(team).toContain('accessibilityLabel="Ayarlara geri dön"');
  expect(team).toContain('<ChevronLeft');

  const services = readMobileSource('app/(owner)/services.tsx');
  expect(services).not.toContain('router.canGoBack()');
  expect(services).toContain("router.replace('/(owner)/settings')");
  expect(services).toContain('<ChevronLeft');
});

test('removes the settings avatar from owner screen headers', () => {
  const screens = [
    'app/(owner)/index.tsx',
    'app/(owner)/agenda.tsx',
    'app/(owner)/availability.tsx',
    'app/(owner)/earnings.tsx',
    'app/(owner)/team.tsx',
    'components/availability/AvailabilityScreen.tsx',
  ];

  for (const screen of screens) {
    expect(readMobileSource(screen)).not.toContain('OwnerSettingsAvatar');
  }
});
