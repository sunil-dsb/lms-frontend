"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterChip {
  value: string;
  label: string;
  /** Rendered after the label when the set is countable. Omit for uncounted sets. */
  count?: number;
  /** Where the answer lives in the URL. With it the pill is a link, not a button. */
  href?: string;
}

interface FilterChipsProps {
  /** The question the row answers, for a screen reader: "Category", "Status". */
  label: string;
  chips: FilterChip[];
  value: string;
  /** Required unless every pill carries an `href`. */
  onChange?: (value: string) => void;
  className?: string;
}

/**
 * A row of filter pills: one question, one chosen answer, an open-ended set.
 *
 * Deliberately not the segmented control (`.segbar`), which is a fixed, small
 * set of views sharing one tray — two languages, three batch sizes. Here each
 * pill stands on its own, white like every other control on the page ground,
 * and the chosen one is terracotta.
 */
export function FilterChips({
  label,
  chips,
  value,
  onChange,
  className,
}: FilterChipsProps): React.ReactElement {
  return (
    <div className={cn("chipbar", className)} role="group" aria-label={label}>
      {chips.map((chip) => {
        const current = chip.value === value ? "true" : undefined;
        const body = (
          <>
            <span>{chip.label}</span>
            {typeof chip.count === "number" ? (
              <span className="n">{chip.count}</span>
            ) : null}
          </>
        );
        return chip.href ? (
          <Link key={chip.value} href={chip.href} aria-current={current}>
            {body}
          </Link>
        ) : (
          <button
            key={chip.value}
            type="button"
            aria-current={current}
            onClick={() => onChange?.(chip.value)}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
