/**
 * Gemini translation for the procedure form.
 *
 * Frontend-only: the key is a `NEXT_PUBLIC_` value, so it is inlined into the
 * browser bundle at build time. That is acceptable for the demo — for
 * production this call should sit behind a server-side proxy instead.
 *
 * Kept free of React so it can be exercised on its own.
 */

export type TranslationLang = "en" | "es";

/** Matches the backend default (`GEMINI_MODEL`) so both sides agree. */
const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-3.6-flash";

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** 'not-configured' → the caller stays silent (translation simply off). */
export type TranslationErrorCode =
  "not-configured" | "network" | "api" | "empty-response";

export class TranslationError extends Error {
  readonly code: TranslationErrorCode;

  constructor(code: TranslationErrorCode, message: string) {
    super(message);
    this.name = "TranslationError";
    this.code = code;
  }
}

export function hasGeminiConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
}

/**
 * Strict, reusable prompt: translate only, return only the translation.
 *
 * Language direction always comes from which field the user typed in — there
 * is no language-detection call.
 */
export function buildTranslationPrompt(
  text: string,
  from: TranslationLang,
  to: TranslationLang,
): string {
  const sourceLanguage = from === "en" ? "English" : "Spanish";
  const targetLanguage = to === "en" ? "English" : "Spanish";

  return [
    "You are translating content for a Mexican restaurant employee training LMS.",
    "",
    `Translate the provided content from ${sourceLanguage} to ${targetLanguage}.`,
    "",
    "Rules:",
    "- Return ONLY the translation.",
    "- Preserve the exact meaning.",
    "- Do not explain the translation.",
    "- Do not summarize.",
    "- Do not add information.",
    "- Preserve numbers, measurements, temperatures, times, ingredient quantities, and formatting.",
    "- Preserve restaurant and food-safety terminology.",
    "- Use natural, professional Spanish appropriate for restaurant employees.",
    "- Keep proper nouns unchanged unless they should naturally be translated.",
    "",
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    "",
    "Text:",
    text,
  ].join("\n");
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

/**
 * Translate `text` from `from` into `to`.
 *
 * Throws `TranslationError` — it never returns an empty/undefined string, so a
 * caller can safely write the result into the opposite field. Callers must
 * catch and leave both fields untouched on failure.
 */
export async function translateText(
  text: string,
  from: TranslationLang,
  to: TranslationLang,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new TranslationError(
      "not-configured",
      "Translation is not configured",
    );
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header rather than query string so the key stays out of URLs/logs.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: buildTranslationPrompt(text, from, to) }] },
        ],
        generationConfig: { temperature: 0.1 },
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new TranslationError(
      "network",
      err instanceof Error ? err.message : "Network request failed",
    );
  }

  if (!response.ok) {
    throw new TranslationError(
      "api",
      `Gemini responded with ${response.status}`,
    );
  }

  let data: GeminiResponse;
  try {
    data = (await response.json()) as GeminiResponse;
  } catch {
    throw new TranslationError(
      "empty-response",
      "Gemini returned an unreadable response",
    );
  }

  if (data.error?.message) {
    throw new TranslationError("api", data.error.message);
  }

  const translated = (data.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!translated) {
    throw new TranslationError(
      "empty-response",
      "Gemini returned no translation",
    );
  }

  return translated;
}
