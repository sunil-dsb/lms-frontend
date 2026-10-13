'use client';

import * as React from 'react';

import {
  TranslationError,
  type TranslationLang,
} from '@/lib/gemini-translate';
import { translateViaServer } from '@/lib/translate-api';

export type { TranslationLang };

/** Keystrokes stop → one server translate call after 800ms. No caching — every
 *  debounced edit fires a fresh request, even for previously seen text. */
export const TRANSLATE_DEBOUNCE_MS = 800;

/** How long a failed-translation hint stays on screen before it fades out. */
const ERROR_HINT_MS = 6000;

/** Save gives pending translations this long before it proceeds anyway. */
const DEFAULT_WAIT_TIMEOUT_MS = 8000;

export type TranslationStatus = 'idle' | 'waiting' | 'translating' | 'error';

type FieldOwner = 'user' | 'generated' | 'initial' | 'empty';

function otherSide(side: TranslationLang): TranslationLang {
  return side === 'en' ? 'es' : 'en';
}

let slotSeq = 0;
const activeSlots = new Set<number>();
const slotListeners = new Set<() => void>();

function emitSlots(): void {
  slotListeners.forEach((listener) => listener());
}

function acquireSlot(): number {
  const id = ++slotSeq;
  activeSlots.add(id);
  emitSlots();
  return id;
}

/** Idempotent: releasing an already-released slot is a no-op. */
function releaseSlot(id: number): void {
  if (activeSlots.delete(id)) emitSlots();
}

function subscribeSlots(listener: () => void): () => void {
  slotListeners.add(listener);
  return () => {
    slotListeners.delete(listener);
  };
}

/** Subscribe to pending-translation changes — for `useSyncExternalStore`. */
export function subscribeTranslations(listener: () => void): () => void {
  return subscribeSlots(listener);
}

export function isTranslating(): boolean {
  return activeSlots.size > 0;
}

/**
 * Resolves once every pending translation on the page has settled, or after
 * `timeoutMs` so a hung request can never wedge the form.
 */
export async function waitForTranslations(timeoutMs = DEFAULT_WAIT_TIMEOUT_MS): Promise<void> {
  if (activeSlots.size === 0) return;

  await new Promise<void>((resolve) => {
    let unsubscribe: () => void = () => {};
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      resolve();
    };

    unsubscribe = subscribeSlots(() => {
      if (activeSlots.size === 0) finish();
    });
    timer = setTimeout(finish, timeoutMs);

    if (activeSlots.size === 0) finish();
  });
}

/* ---------------------------------------------------------------- hook -- */

export interface UseBilingualTranslationParams {
  englishValue: string;
  spanishValue: string;
  onEnglishChange: (value: string) => void;
  onSpanishChange: (value: string) => void;
  /** Default 800ms. */
  debounceMs?: number;
  /** Applied to translated OUTPUT only — the source text is never clipped. */
  maxLength?: number;
  /** Override the translator. Defaults to the server `/api/backend/translate`
   *  route. Receives an `AbortSignal` so in-flight requests can be cancelled
   *  when a newer edit arrives. */
  translate?: (
    text: string,
    from: TranslationLang,
    to: TranslationLang,
    signal?: AbortSignal,
  ) => string | Promise<string>;
  /** Default true — the server route needs no client-side key. Set false to
   *  disable auto-translation for a field. */
  enabled?: boolean;
}

export interface BilingualTranslationApi {
  /**
   * Must only ever be called from a real input `onChange`. Programmatic
   * writes go through `onEnglishChange`/`onSpanishChange` and never reach it,
   * which is what breaks the EN → ES → EN loop (spec edge case #1) without
   * relying on value comparison.
   */
  markUserEdit: (side: TranslationLang, text: string) => void;
  status: TranslationStatus;
  /** The side currently being translated into, if any. */
  activeTarget: TranslationLang | null;
  /** Cancel pending work and forget ownership — for form reset (edge #12). */
  reset: () => void;
}

export function useBilingualTranslation({
  englishValue,
  spanishValue,
  onEnglishChange,
  onSpanishChange,
  debounceMs = TRANSLATE_DEBOUNCE_MS,
  maxLength,
  translate,
  enabled = true,
}: UseBilingualTranslationParams): BilingualTranslationApi {
  const translateFn = translate ?? translateViaServer;
  const [status, setStatus] = React.useState<TranslationStatus>('idle');
  const [activeTarget, setActiveTarget] = React.useState<TranslationLang | null>(null);

  const mountedRef = React.useRef(true);
  /** Bumped on every edit / reset / unmount. An in-flight response whose
   *  sequence no longer matches is stale and is discarded (edge #2). */
  const seqRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotRef = React.useRef<number | null>(null);
  /** Cancels the in-flight fetch when a newer edit arrives or on unmount. */
  const abortRef = React.useRef<AbortController | null>(null);

  const ownerRef = React.useRef<Record<TranslationLang, FieldOwner>>({
    en: englishValue.trim() ? 'initial' : 'empty',
    es: spanishValue.trim() ? 'initial' : 'empty',
  });
  const valuesRef = React.useRef({ en: englishValue, es: spanishValue });
  const settersRef = React.useRef({ onEnglishChange, onSpanishChange });

  const invalidate = React.useCallback((): void => {
    seqRef.current += 1;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (errorTimerRef.current !== null) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (abortRef.current !== null) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (slotRef.current !== null) {
      releaseSlot(slotRef.current);
      slotRef.current = null;
    }
  }, []);

  const write = React.useCallback((side: TranslationLang, text: string): void => {
    if (side === 'en') settersRef.current.onEnglishChange(text);
    else settersRef.current.onSpanishChange(text);
  }, []);

  /** Read-through, so narrowing from an earlier check can't carry across an `await`. */
  const ownerOf = React.useCallback(
    (side: TranslationLang): FieldOwner => ownerRef.current[side],
    [],
  );

  /** Drop the indicator without disturbing a newer request's state. */
  const settle = React.useCallback((): void => {
    setStatus('idle');
    setActiveTarget(null);
  }, []);

  const flashError = React.useCallback(
    (target: TranslationLang): void => {
      setStatus('error');
      setActiveTarget(target);
      if (errorTimerRef.current !== null) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        errorTimerRef.current = null;
        if (!mountedRef.current) return;
        setStatus('idle');
        setActiveTarget(null);
      }, ERROR_HINT_MS);
    },
    [],
  );

  const run = React.useCallback(
    async (
      mySeq: number,
      source: TranslationLang,
      target: TranslationLang,
      text: string,
      slot: number,
    ): Promise<void> => {
      try {
        // Re-check right before firing: a newer edit may have arrived.
        if (mySeq !== seqRef.current) return;
        if (ownerOf(target) === 'user') {
          settle();
          return;
        }

        setStatus('translating');
        setActiveTarget(target);

        const controller = new AbortController();
        abortRef.current = controller;
        const translated = await Promise.resolve(
          translateFn(text, source, target, controller.signal),
        );
        if (abortRef.current === controller) abortRef.current = null;
        if (!translated || !translated.trim()) {
          throw new TranslationError('empty-response', 'Translator returned no text');
        }

        if (!mountedRef.current) return;
        if (mySeq !== seqRef.current) return; // stale response (edge #2)
        // Bailed out with this still the newest request, so nobody else is
        // going to reset the indicator for us.
        if (ownerOf(target) === 'user') return settle(); // hand-edited (edge #3)
        if (valuesRef.current[source] !== text) return settle(); // source moved on

        write(target, maxLength ? translated.slice(0, maxLength) : translated);
        ownerRef.current[target] = 'generated';
        settle();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        if (mySeq !== seqRef.current) return;
        // Keep both sides exactly as they are — no clearing, no retry (edge #9).
        flashError(target);
      } finally {
        releaseSlot(slot);
        if (slotRef.current === slot) slotRef.current = null;
      }
    },
    [flashError, maxLength, ownerOf, settle, translateFn, write],
  );

  const markUserEdit = React.useCallback(
    (side: TranslationLang, text: string): void => {
      const target = otherSide(side);
      const trimmed = text.trim();

      ownerRef.current[side] = trimmed === '' ? 'empty' : 'user';

      // Cancels the debounce timer, bumps the sequence (so any in-flight
      // response is discarded) and releases the outstanding slot.
      invalidate();

      if (!enabled) {
        settle();
        return;
      }

      // Never overwrite a side the user typed into by hand (edge #3).
      if (ownerRef.current[target] === 'user') {
        settle();
        return;
      }

      // Empty / whitespace-only source: no request (edge #4, #5). Clearing a
      // generated target is handled after commit, in an effect below, so we
      // never write twice inside one event handler.
      if (trimmed === '') {
        settle();
        return;
      }

      // One character is never worth a call (edge #6). "Soup"/"Oil"/"Rice" are.
      if (trimmed.length < 2) {
        settle();
        return;
      }

      const slot = acquireSlot();
      slotRef.current = slot;
      const mySeq = ++seqRef.current;

      setStatus('waiting');
      setActiveTarget(target);

      // Every new keystroke replaced the previous timer (edge #7).
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void run(mySeq, side, target, text, slot);
      }, debounceMs);
    },
    [debounceMs, enabled, invalidate, run, settle],
  );

  const reset = React.useCallback((): void => {
    invalidate();
    ownerRef.current = {
      en: valuesRef.current.en.trim() ? 'initial' : 'empty',
      es: valuesRef.current.es.trim() ? 'initial' : 'empty',
    };
    settle();
  }, [invalidate, settle]);

  /* --- keep refs in step with props; declared in the order they must run -- */

  React.useEffect(() => {
    valuesRef.current = { en: englishValue, es: spanishValue };
  });

  React.useEffect(() => {
    settersRef.current = { onEnglishChange, onSpanishChange };
  });

  /**
   * Clearing an emptied source (edge #4).
   *
   * Deliberately an effect rather than part of `markUserEdit`: the parent has
   * committed the source edit by now, so the write is built from fresh props
   * instead of a closure captured mid-event. It also self-limits — once the
   * owner flips to `empty` the condition can no longer hold, so there is no
   * cascade and no loop.
   */
  React.useEffect(() => {
    if (valuesRef.current.en.trim() === '' && ownerRef.current.es === 'generated') {
      write('es', '');
      ownerRef.current.es = 'empty';
    }
    if (valuesRef.current.es.trim() === '' && ownerRef.current.en === 'generated') {
      write('en', '');
      ownerRef.current.en = 'empty';
    }
  });

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidate();
    };
  }, [invalidate]);

  return { markUserEdit, status, activeTarget, reset };
}
