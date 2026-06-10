/**
 * Shared error parsing for the `app-book-appointment` edge function.
 * Extracts the HTTP status + Turkish server message from a
 * FunctionsHttpError and maps it to a user-facing message.
 */

interface FunctionErrorLike {
  message?: string;
  context?: {
    status?: number;
    body?: unknown;
    json?: () => Promise<unknown>;
    clone?: () => { json: () => Promise<unknown>; text: () => Promise<string> };
  };
}

export async function parseBookingFunctionError(fnErr: unknown): Promise<string> {
  const err = fnErr as FunctionErrorLike;
  const ctx = err?.context;
  let status = ctx?.status ?? 0;
  let ctxBody: unknown = ctx?.body;
  // FunctionsHttpError.context is the Response; body needs to be read
  if (ctx && typeof ctx.json === 'function' && typeof ctx.clone === 'function') {
    try { ctxBody = await ctx.clone().json(); } catch { try { ctxBody = await ctx.clone().text(); } catch {} }
    if (!status) status = ctx.status ?? 0;
  }
  if (__DEV__) console.warn('[booking] app-book-appointment error status=', status, 'body=', ctxBody, 'message=', err?.message);
  // Backend "error" alanı her zaman gerçek Türkçe mesajı içerir — onu önceliklendiriyoruz
  const serverMsg = (ctxBody && typeof ctxBody === 'object' && typeof (ctxBody as { error?: unknown }).error === 'string')
    ? (ctxBody as { error: string }).error
    : (typeof ctxBody === 'string' ? ctxBody : '');
  if (status === 409) return serverMsg || 'Bu saat dolu. Başka bir saat seçin.';
  if (status === 404) return serverMsg || 'Dükkan veya hizmet bulunamadı. Sayfayı yenileyin.';
  if (status === 429) return serverMsg || 'Çok fazla deneme. Birkaç dakika bekleyin.';
  if (status === 401) return 'Oturum gerekli. Tekrar giriş yapın.';
  if (status === 400) return serverMsg || 'Geçersiz bilgi.';
  return `Randevu eklenemedi (HTTP ${status || '?'}): ${serverMsg || err?.message || 'bilinmeyen hata'}`;
}
