

import { TranslationError, type TranslationLang } from '@/lib/gemini-translate';

export type { TranslationLang };

/** Mirrors the server route's `text.length > 10000` guard — fail fast here. */
export const TRANSLATE_MAX_CHARS = 10000;

const ENDPOINT = '/api/backend/translate';

export async function translateViaServer(
  text: string,
  from: TranslationLang,
  to: TranslationLang,
  signal?: AbortSignal,
): Promise<string> {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new TranslationError('api', 'Nothing to translate');
  }
  if (from === to) {
    throw new TranslationError('api', 'Source and target languages match');
  }
  if ((from !== 'en' && from !== 'es') || (to !== 'en' && to !== 'es')) {
    throw new TranslationError('api', 'Languages must be en or es');
  }
  if (text.length > TRANSLATE_MAX_CHARS) {
    throw new TranslationError(
      'api',
      `Text exceeds the ${TRANSLATE_MAX_CHARS}-character limit`,
    );
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLanguage: from,
        targetLanguage: to,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new TranslationError(
      'network',
      err instanceof Error ? err.message : 'Network request failed',
    );
  }

  if (!response.ok) {
    throw new TranslationError('api', `Translation API responded with ${response.status}`);
  }

  let data: { translation?: unknown; error?: unknown };
  try {
    data = (await response.json()) as { translation?: unknown; error?: unknown };
  } catch {
    throw new TranslationError('empty-response', 'Translation API returned an unreadable response');
  }

  if (typeof data.error === 'string' && data.error) {
    throw new TranslationError('api', data.error);
  }

  const translated = typeof data.translation === 'string' ? data.translation.trim() : '';
  if (!translated) {
    throw new TranslationError('empty-response', 'Translation API returned no translation');
  }

  return translated;
}
