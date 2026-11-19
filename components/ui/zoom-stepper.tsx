"use client";

import * as React from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The − value + stepper for scaling a document.
 *
 * The value sits in an aria-live region, so a screen reader hears "1×",
 * "2×", "3×" as the reader moves. Both ends are 40px touch targets —
 * this product is used on tablets in a kitchen, not at a desk — and the
 * disabled state comes from Button, so it is the system's opacity-50
 * with pointer events off.
 */
export interface ZoomStepperProps {
  /** The scale as the reader sees it: "1×", "2×", "3×". */
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  /** The names for the two ends: "Zoom out" / "Zoom in". */
  decreaseLabel: string;
  increaseLabel: string;
  /** The group's name for a screen reader: "Zoom". */
  label: string;
  className?: string;
}

export function ZoomStepper({
  value,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  decreaseLabel,
  increaseLabel,
  label,
  className,
}: ZoomStepperProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-lg border border-line bg-wash px-1 py-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={decreaseLabel}
        className="min-h-10 min-w-10"
      >
        <LuMinus aria-hidden="true" />
      </Button>
      <span
        aria-live="polite"
        className="min-w-10 text-center text-xs font-semibold tabular-nums text-ink-2"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onIncrease}
        disabled={increaseDisabled}
        aria-label={increaseLabel}
        className="min-h-10 min-w-10"
      >
        <LuPlus aria-hidden="true" />
      </Button>
    </div>
  );
}
