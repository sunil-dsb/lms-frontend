"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CapsuleTab {
  value: string;
  label: string;
  /** The tally after the label — "Pending · 3". Omit to show the label alone. */
  count?: number;
}

interface CapsuleTabsProps {
  /** The question, for a screen reader: "Training filter", "Progress view". */
  ariaLabel: string;
  tabs: CapsuleTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * The capsule tray the training surfaces tab with: a bone pill tray holding
 * one terracotta seat (the answer to "which am I on") and quiet transparent
 * ones. Two or three fixed views — a segmented choice, not a filter bar.
 *
 * The active seat draws the brand, unlike `.segbar`'s ink fill: on the
 * training surfaces the terracotta pill is how "you are here" reads.
 */
export function CapsuleTabs({
  ariaLabel,
  tabs,
  value,
  onChange,
  className,
}: CapsuleTabsProps): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex select-none items-center self-start rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)]",
        className,
      )}
      style={{ padding: "4px", gap: "4px" }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-full font-semibold",
              "transition-all duration-[var(--dur)] ease-[var(--ease)]",
              "text-xs sm:text-sm",
              active
                ? "bg-[var(--color-brand-600)] text-white shadow-xs"
                : "bg-transparent text-[var(--color-ink)] hover:text-[var(--color-brand-600)]",
            )}
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "6px",
              paddingBottom: "6px",
              minHeight: "32px",
              gap: "6px",
            }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <>
                <span aria-hidden="true" className="opacity-80">
                  ·
                </span>
                <span className={active ? "text-white" : ""}>{tab.count}</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
