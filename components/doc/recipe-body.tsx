"use client";

import * as React from "react";
import {
  IngredientsTable,
  MethodSteps,
  Scaler,
  Section,
  Yield,
  type Ingredient,
  type MethodStep,
} from "./index";

/**
 * A recipe, in the two sections /sop-recipe-format.html gives it: Yield — the
 * batch control, what that batch makes, and the ingredients at that batch — and
 * Method. One "Recipe" heading over all of it would be a heading that says what
 * the title already said.
 *
 * The scaling has to be real: a control that visibly does nothing when a cook
 * presses it is worse than no control — they press it twice, then stop trusting
 * the numbers on the rest of the page.
 *
 * Ingredient amounts come from the API already computed per factor, so the table
 * only has to pick a column. The yield is arithmetic: the 1× value multiplied,
 * rounded to two decimals, with trailing zeros dropped, because "3 kg" is the
 * truth and "3.00 kg" is false precision.
 *
 * When the caller passes `cookMode`, a primary "Start cooking" / "Continue at
 * step N" CTA mounts inside the Yield section. The same block holds the Scaler,
 * so the cook sees the trigger and the batch control in the same screen. The
 * caller (the page wrapper) owns the modal itself; this component only renders
 * the trigger and computes the next open step.
 */
export type RecipeCookModeTrigger = {
  /** Called with the index of the first step the cook hasn't ticked (1-based),
   *  or 1 when none are ticked yet. The page mounts <CookMode> and uses this
   *  as its `start` prop. */
  onOpen: (start: number) => void;
  /** Per-locale CTA copy. */
  labels: { start: string; continueAt: (n: number) => string };
  /** Persisted "done" array — same slot CookMode reads and writes. Used only
   *  to compute "Continue at step N" vs "Start cooking". */
  done: boolean[];
  /** Toggles completion of a step on the page. */
  onToggleStep?: (n: number, isDone: boolean) => void;
  /** Resets all steps to uncompleted. */
  onReset?: () => void;
};

export function RecipeBody({
  factors,
  yieldItems,
  ingredients,
  steps,
  batchLabel,
  yieldTitle,
  methodTitle,
  stepsCount,
  cookMode,
}: {
  factors: number[];
  yieldItems: {
    label: string;
    value: string;
    unit?: string;
    scales?: boolean;
  }[];
  ingredients: Ingredient[];
  steps: MethodStep[];
  batchLabel: string;
  yieldTitle: string;
  methodTitle: string;
  stepsCount: string;
  cookMode?: RecipeCookModeTrigger;
}): React.ReactElement {
  const [factor, setFactor] = React.useState(factors[0] ?? 1);
  const base = factors[0] ?? 1;

  const scaled = React.useMemo(
    () =>
      yieldItems
        .filter((y) => (y.value ?? "").trim() !== "")
        .map((y) => {
          if (!y.scales) return y;
          const n = parseFloat(y.value.replace(",", "."));
          if (!Number.isFinite(n)) return y;
          const value = String(Math.round(((n * factor) / base) * 100) / 100);
          return { ...y, value };
        }),
    [yieldItems, factor, base],
  );

  // The ingredient table needs the factors to pick a column, so ingredients
  // without factors are not a yield section — they would title an empty box.
  const showTable = ingredients.length > 0 && factors.length > 0;
  const hasYield = scaled.length > 0 || factors.length > 0 || showTable;

  const stepsWithThumbs = React.useMemo<MethodStep[]>(() => {
    if (!cookMode) return steps;
    return steps.map((s, i) => {
      if (s.mediaThumb) {
        return {
          ...s,
          shots: undefined,
          thumbLabel: s.thumbLabel ?? `Step ${i + 1}: open in cook mode`,
          onThumbOpen: () => cookMode.onOpen(i + 1),
        };
      }
      const first = s.shots?.[0];
      if (!first) return s;
      const second = s.shots?.[1];
      const isCompare = first.compare === "ok" && second?.compare === "no";
      return {
        ...s,
        shots: undefined,
        mediaThumb: {
          src: first.src,
          alt: first.alt,
          compare: isCompare ? "ok" : undefined,
          pairSrc: isCompare ? second.src : undefined,
          images: s.shots?.map((sh) => ({ src: sh.src, alt: sh.alt })),
        },
        thumbLabel: `Step ${i + 1}: open in cook mode`,
        onThumbOpen: () => cookMode.onOpen(i + 1),
      };
    });
  }, [steps, cookMode]);

  const doneCount = cookMode?.done?.filter(Boolean).length ?? 0;
  const allDone = doneCount === steps.length && steps.length > 0;
  const displayCount = allDone
    ? "all done"
    : doneCount > 0
      ? `${doneCount} of ${steps.length} done`
      : stepsCount;

  return (
    <>
      {hasYield ? (
        <Section title={yieldTitle}>
          {factors.length > 0 ? (
            <Scaler
              factors={factors}
              selected={factor}
              onSelect={setFactor}
              label={batchLabel}
            />
          ) : null}
          {scaled.length > 0 ? (
            <Yield
              items={scaled.map((y) => ({
                label: y.label,
                value: y.unit ? `${y.value} ${y.unit}` : y.value,
              }))}
            />
          ) : null}
          {showTable ? (
            <IngredientsTable
              ingredients={ingredients}
              factors={factors}
              selectedFactor={factor}
            />
          ) : null}
        </Section>
      ) : null}
      {steps.length > 0 ? (
        <Section title={methodTitle} count={displayCount}>
          {doneCount > 0 && cookMode?.onReset ? (
            <p className="method-progress" role="status">
              <span>
                {doneCount} of {steps.length} done
              </span>
              <button
                type="button"
                className="method-reset"
                onClick={cookMode.onReset}
              >
                Start a new batch
              </button>
            </p>
          ) : null}
          <MethodSteps
            steps={stepsWithThumbs}
            done={cookMode?.done}
            onToggleStep={
              cookMode?.onToggleStep
                ? (i) => cookMode.onToggleStep?.(i + 1, !cookMode.done[i])
                : undefined
            }
          />
        </Section>
      ) : null}
    </>
  );
}
