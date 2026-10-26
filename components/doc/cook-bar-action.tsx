'use client';

import * as React from 'react';
import { LuPlay } from 'react-icons/lu';
import { readCookProgress } from './procedure-timers';

/**
 * The header-bar entry point into cook mode. Renders the "Start cooking" /
 * "Continue at step N" CTA shaped for `<DocBar action={...}>` — sitting at
 * the right edge of the doc-bar, the way demo3 puts it. Tapping it dispatches
 * a `cook-mode:open` CustomEvent the page listens for, so this component
 * does not need to know which modal owns the recipe — it just asks "is there
 * progress?" and asks the page to open the modal at the next step.
 *
 * Why a CustomEvent and not a callback prop: the doc-bar lives in the page
 * chrome and the cook-modal state lives inside `<CookModeLauncher>` deeper
 * in the tree. Threading a callback through every layer is more wiring than
 * the single click is worth; a named event lets both sides live where they
 * already do.
 */

const LABELS_EN = {
  start: 'Start cooking',
  continueAt: (n: number) => `Continue at step ${n}`,
};
const LABELS_ES = {
  start: 'Empezar a cocinar',
  continueAt: (n: number) => `Continuar en el paso ${n}`,
};

export function CookBarAction({
  procedureId,
  recipeBlockId,
  locale,
}: {
  procedureId: string;
  recipeBlockId: string;
  locale: 'en' | 'es';
}): React.ReactElement | null {
  const labels = locale === 'es' ? LABELS_ES : LABELS_EN;
  // Hydrate from localStorage on mount so the CTA label flips from
  // "Start cooking" to "Continue at step N" once anything has been ticked.
  const [done, setDone] = React.useState<boolean[]>(() => {
    if (typeof window === 'undefined') return [];
    return readCookProgress(procedureId, recipeBlockId)?.done ?? [];
  });
  React.useEffect(() => {
    const onUpdate = (e: Event): void => {
      const detail = (e as CustomEvent<{ procedureId: string; recipeBlockId: string }>).detail;
      if (detail?.procedureId !== procedureId || detail?.recipeBlockId !== recipeBlockId) return;
      setDone(readCookProgress(procedureId, recipeBlockId)?.done ?? []);
    };
    window.addEventListener('cook-mode:progress', onUpdate);
    return () => {
      window.removeEventListener('cook-mode:progress', onUpdate);
    };
  }, [procedureId, recipeBlockId]);

  const doneCount = done.filter(Boolean).length;
  const allDone = done.length > 0 && doneCount === done.length;
  const firstOpen = done.findIndex((d) => !d);
  const ctaLabel = allDone
    ? (locale === 'es' ? 'Empezar un nuevo lote' : 'Start a new batch')
    : firstOpen >= 0
      ? labels.continueAt(firstOpen + 1)
      : labels.start;

  const onClick = (): void => {
    if (allDone) {
      window.dispatchEvent(
        new CustomEvent('cook-mode:reset', { detail: { procedureId, recipeBlockId } }),
      );
      window.dispatchEvent(
        new CustomEvent('cook-mode:open', { detail: { procedureId, recipeBlockId, at: 1 } }),
      );
      return;
    }
    const at = firstOpen >= 0 ? firstOpen + 1 : 1;
    window.dispatchEvent(
      new CustomEvent('cook-mode:open', { detail: { procedureId, recipeBlockId, at } }),
    );
  };

  return (
    <button
      type="button"
      className={`btn ${allDone ? 'btn-secondary' : 'btn-primary'} cook-bar-btn max-w-full text-xs sm:text-sm py-1 sm:py-2 px-2.5 sm:px-4 shrink-0`}
      onClick={onClick}
      aria-label={ctaLabel}
    >
      {allDone ? null : <LuPlay aria-hidden="true" className="i shrink-0" />}
      <span className="truncate">{ctaLabel}</span>
    </button>
  );
}