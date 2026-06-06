import { supabase } from './supabase';

type DeleteAccountErrorBody = {
  error?: string;
  step?: string;
  detail?: string;
};

export async function deleteCurrentAccount(): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('Oturum bulunamadi. Lutfen cikis yapip tekrar giris yapin.');
  }

  const { error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!error) return;

  const context = 'context' in error ? error.context : null;
  if (context instanceof Response) {
    try {
      const body = (await context.json()) as DeleteAccountErrorBody;
      const parts = [
        body.error,
        body.step ? `Adim: ${body.step}` : null,
        body.detail ? `Detay: ${body.detail}` : null,
      ].filter(Boolean);
      throw new Error(parts.join('\n'));
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message) throw parseError;
    }
  }

  throw new Error(error.message || 'Hesap silinemedi');
}
