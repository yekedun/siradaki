import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('profile editor keyboard avoider does not collapse the content-sized sheet', () => {
  const source = readFileSync(
    resolve(__dirname, '../app/(owner)/settings.tsx'),
    'utf8',
  );
  const profileEditor = source.slice(
    source.indexOf('function ProfileEditorSheet'),
    source.indexOf('interface ScheduleDay'),
  );

  const keyboardAvoiderTag = profileEditor.match(/<KeyboardAvoidingView[\s\S]*?>/)?.[0];

  expect(keyboardAvoiderTag).toBeDefined();
  expect(keyboardAvoiderTag).not.toMatch(/flex:\s*1/);
});
