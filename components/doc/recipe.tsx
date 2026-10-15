'use client';

import * as React from 'react';
import { ALLERGEN_LABELS, type AllergenKey } from '@/lib/allergens';
import { LuArrowLeft, LuArrowLeftRight, LuBadgeCheck, LuCheck, LuChevronDown, LuChevronRight, LuCircleAlert, LuDownload, LuFocus, LuImage, LuLightbulb, LuLock, LuPlay, LuTestTube, LuTriangleAlert, LuUtensils, LuWrench, LuX } from 'react-icons/lu';
import { Icon, iconByName } from '@/components/ui/icon';
import { classifyVideoUrl } from '@/lib/procedure-media';
import type { IconType } from 'react-icons';

/**
 * The vocabulary of an SOP / recipe / training chapter page.
 *
 * Every component in this file maps 1:1 to a CSS class in /lms.css and a
 * pattern in /design-system.html. The lms.css class names are used directly
 * (via `clsx`-style merging) so that a static HTML SOP and a React SOP render
 * to the same pixels.
 *
 * Authoritative reference: /DESIGN.md at the repo root.
 */

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');
export function Shot({
  src,
  alt,
  caption,
  width = 1200,
  height = 900,
  compare,
  aspectRatio,
  className,
}: {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  width?: number;
  height?: number;
  /** When set, paints a green (ok) or red (no) bottom border so the pair reads
   *  as a "right vs wrong" comparison. Mirrors demo3's cook-mode compare panel. */
  compare?: 'ok' | 'no';
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <figure className={cn('shot', className)} data-compare={compare}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className={cn(
          aspectRatio ? `${aspectRatio} w-full object-cover` : 'max-h-[var(--media-max-h)] w-full object-cover',
        )}
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function VideoCover({
  src,
  alt,
  duration,
  caption,
  label,
}: {
  src: string;
  alt: string;
  duration: string;
  caption?: React.ReactNode;
  label: string;
}) {
  return (
    <figure className="shot video">
      <div className="media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={1200} height={900} loading="lazy" />
        <button className="play" aria-label={label}>
          <LuPlay aria-hidden="true" className="i i-lg" />
        </button>
        <span className="dur">{duration}</span>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function Compare({
  correct,
  incorrect,
}: {
  correct: { src: string; alt: string };
  incorrect: { src: string; alt: string };
}) {
  return (
    <div className="compare">
      <figure className="ok">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={correct.src} alt={correct.alt} width={1200} height={900} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        <figcaption>
          <LuCheck aria-hidden="true" className="i i-sm" /> Correct
        </figcaption>
      </figure>
      <figure className="no">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={incorrect.src} alt={incorrect.alt} width={1200} height={900} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        <figcaption>
          <LuX aria-hidden="true" className="i i-sm" /> Over-mashed
        </figcaption>
      </figure>
    </div>
  );
}

/* ----------------------------------------------------------------
   Scaler + Ingredients (recipes only)
   ---------------------------------------------------------------- */

/**
 * Arrow keys move between the seats, which is what a radiogroup promises. With a
 * roving tabindex and no key handler, Tab landed on the selected factor and there
 * was no way to reach the others at all.
 */
export function Scaler({
  factors,
  selected,
  onSelect,
  label = 'Batch',
}: {
  factors: number[];
  selected: number;
  onSelect?: (factor: number) => void;
  label?: string;
}) {
  // A document can carry two recipes, and two "batch-lbl" ids would send both
  // groups' aria-labelledby to the first label.
  const labelId = React.useId();
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = factors.indexOf(selected);
    const at =
      e.key === 'Home' ? 0
      : e.key === 'End' ? factors.length - 1
      : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % factors.length
      : (i - 1 + factors.length) % factors.length;
    const next = factors[at];
    if (next === undefined) return;
    onSelect?.(next);
    const group = e.currentTarget;
    (group.children[at] as HTMLElement | undefined)?.focus();
  };

  return (
    <div className="scaler">
      <span className="lbl" id={labelId}>{label}</span>
      <div className="choices" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
        {factors.map((f) => {
          const checked = f === selected;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onSelect?.(f)}
            >
              {f}×
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type Ingredient = {
  name: React.ReactNode;
  /** Optional preparation spec shown under the name. e.g. "Small dice, 5 mm" */
  form?: string;
  /** Allergen flag. */
  allergen?: boolean;
  /** Pre-computed amounts for each factor in the scaler. e.g. ["200 g", "400 g"] */
  amounts: string[];
};

export function scaleAmount(baseAmount: string | undefined, factorMultiplier: number): string {
  if (!baseAmount || baseAmount.trim() === '') return '';
  const trimmed = baseAmount.trim();

  // If factor multiplier is 1, return base as-is
  if (factorMultiplier === 1) return trimmed;

  // Check for fraction like "1/2" or "1 1/2" with optional unit (e.g. "1/2 cup")
  const fractionMatch = trimmed.match(/^(\d+)?\s*(\d+)\/(\d+)\s*(.*)$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const num = parseFloat(fractionMatch[2]);
    const den = parseFloat(fractionMatch[3]);
    const unit = fractionMatch[4] ? ` ${fractionMatch[4].trim()}` : '';
    if (den !== 0) {
      const val = (whole + num / den) * factorMultiplier;
      const rounded = Number.isInteger(val) ? String(val) : String(parseFloat(val.toFixed(2)));
      return `${rounded}${unit}`;
    }
  }

  // Check for leading number with optional unit, e.g. "78", "2.5", "100 g", "2.5 kg"
  const numMatch = trimmed.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(',', '.'));
    if (!Number.isNaN(num)) {
      const scaledVal = num * factorMultiplier;
      const formattedNum = Number.isInteger(scaledVal)
        ? String(scaledVal)
        : String(parseFloat(scaledVal.toFixed(2)));
      const unit = numMatch[2] ? ` ${numMatch[2].trim()}` : '';
      return `${formattedNum}${unit}`;
    }
  }

  return trimmed;
}

export function IngredientsTable({
  ingredients,
  factors,
  selectedFactor,
}: {
  ingredients: Ingredient[];
  factors: number[];
  selectedFactor: number;
}) {
  // Two columns, as in the template: the base batch, and the one that was picked.
  // Every factor at once is a spreadsheet, and a cook reads one number.
  const baseIndex = 0;
  const selectedIndex = factors.indexOf(selectedFactor);
  const isBase = selectedIndex <= baseIndex;
  const columns = isBase ? [baseIndex] : [baseIndex, selectedIndex];

  return (
    <table className={cn('ing', isBase && 'is-base')}>
      <caption className="vh">Ingredients at the base batch and at the selected batch size</caption>
      <thead>
        <tr>
          <th scope="col">Ingredient</th>
          {columns.map((i) => (
            <th key={factors[i]} scope="col" className={cn('num', i === selectedIndex && !isBase && 'adj')}>
              {factors[i]}×
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ingredients.map((ing, i) => (
          <tr key={i}>
            <th scope="row">
              {ing.name}
              {ing.form && <span className="form">{ing.form}</span>}
              {ing.allergen && (
                <span className="flag">
                  <LuCircleAlert aria-hidden="true" className="i i-sm" /> Allergen
                </span>
              )}
            </th>
            {columns.map((j) => {
              const explicit = ing.amounts[j];
              const baseVal = ing.amounts[baseIndex] ?? '';
              const baseFactor = factors[baseIndex] || 1;
              const colFactor = factors[j] || 1;
              const multiplier = colFactor / baseFactor;

              const displayAmount =
                explicit && explicit.trim() !== ''
                  ? explicit
                  : scaleAmount(baseVal, multiplier);

              return (
                <td key={factors[j]} className={cn('num', j === selectedIndex && !isBase && 'adj')}>
                  {displayAmount}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------------------
   Chapters: attachments + related
   ---------------------------------------------------------------- */

