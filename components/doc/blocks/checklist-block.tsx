"use client";

import * as React from "react";
import { LuCheck } from "react-icons/lu";
import type { Localised } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Interactive checklist rendered on the procedure detail page.
 *  Employees tap to tick items off as they work; the box fills with ok-green
 *  and the label strikes through. State is per-block so two checklists on
 *  the same page don't bleed into each other. */
export function ChecklistBlock({
  blockId,
  title,
  items,
  locale,
}: {
  blockId: string;
  title: string | undefined;
  items: { id: string; text: Localised }[];
  locale: "en" | "es";
}): React.ReactElement {
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});

  const toggle = (itemId: string): void => {
    setPicked((p) => ({ ...p, [itemId]: !p[itemId] }));
  };

  const done = items.reduce((n, it) => (picked[it.id] ? n + 1 : n), 0);
  const displayTitle =
    title?.trim() || (locale === "es" ? "Lista de verificación" : "Checklist");

  return (
    <div className="checklist-block space-y-3 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-e1">
      <div className="flex items-center justify-between">
        <h3 className="checklist-title text-base font-bold text-[var(--color-ink)]">
          {displayTitle}
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-wash)] text-[var(--color-ink-2)]">
          {done}/{items.length}
        </span>
      </div>
      <ul className="checklist space-y-2" role="list">
        {items.map((it, i) => {
          const checked = !!picked[it.id];
          const label = it.text[locale] || it.text.en || it.text.es;
          return (
            <li key={it.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(it.id)}
                className={cn(
                  "checklist-row group flex w-full items-start gap-3 sm:gap-3 text-left transition-colors rounded-xl px-3 sm:px-4 py-3 sm:py-3 cursor-pointer",
                  checked
                    ? "checklist-row--done bg-[var(--color-ok-tint)]"
                    : "hover:bg-[var(--color-wash)]",
                )}
              >
                <span
                  className={cn(
                    "checklist-box flex size-5 shrink-0 items-center justify-center rounded border transition-colors mt-0.5",
                    checked
                      ? "checklist-box--on border-[var(--color-ok-fill)] bg-[var(--color-ok-fill)] text-white"
                      : "checklist-box--off border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent group-hover:border-[var(--color-ink-3)]",
                  )}
                  aria-hidden="true"
                >
                  <LuCheck className="size-4 stroke-[3]" />
                </span>
                <span
                  className="checklist-num text-xs font-mono text-[var(--color-ink-3)] shrink-0 mt-0.5 min-w-[18px]"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "checklist-text flex-1 text-sm font-medium leading-relaxed transition-colors min-w-0 break-words",
                    checked
                      ? "text-[var(--color-ink-3)] line-through"
                      : "text-[var(--color-ink)]",
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="checklist-progress text-xs text-[var(--color-ink-3)] font-medium pt-1">
        {locale === "es"
          ? "Marca cada elemento al completarlo."
          : "Check each item as you complete it."}
      </p>
    </div>
  );
}
