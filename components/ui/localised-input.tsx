"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useBilingualTranslation } from "@/lib/use-bilingual-translation";
import type { Localised } from "@/lib/types";

export interface LocalisedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value"
> {
  /** Which side of `value` this input is showing. */
  lang: "en" | "es";
  /** Both sides — the other one is the translation target. */
  value: Localised;
  /** Write one side. The parent owns state; this component never stores text. */
  onText: (lang: "en" | "es", text: string) => void;
  /**
   * Render the small "Translating…" / "Translation failed" line after the
   * input. Off by default because several call sites sit in flex rows where an
   * extra sibling would change the layout.
   */
  showStatus?: boolean;
  /** Maximum number of characters allowed. */
  maxLength?: number;
  /** When true, renders a textarea rather than a single-line input. */
  multiline?: boolean;
  /** Number of visible text lines when multiline is true. */
  rows?: number;
  /** Whether to render character counter if maxLength is set. Default true when maxLength is provided. */
  showCount?: boolean;
  /** Optional class name for the outer container div */
  wrapperClassName?: string;
}

// Same self-contained strings as BilingualInput — the label follows the target
// language, so no new i18n keys are needed.
const STATUS_TEXT: Record<"en" | "es", { translating: string; error: string }> =
  {
    en: { translating: "Translating…", error: "Translation failed" },
    es: { translating: "Traduciendo…", error: "Error al traducir" },
  };

/**
 * Drop-in replacement for a raw `<input>` on a bilingual field that only shows
 * one language at a time (quiz prompts, checklist titles, table cells…).
 *
 * The direction is known — whichever side the user types in drives the other —
 * so there is no language detection call.
 */
export function LocalisedInput({
  lang,
  value,
  onText,
  showStatus = false,
  maxLength,
  multiline = false,
  rows = 2,
  showCount = true,
  className,
  wrapperClassName,
  onChange,
  type: _type,
  ...inputProps
}: LocalisedInputProps): React.ReactElement {
  const { markUserEdit, status, activeTarget } = useBilingualTranslation({
    englishValue: value?.en ?? "",
    spanishValue: value?.es ?? "",
    onEnglishChange: (text) => onText("en", text),
    onSpanishChange: (text) => onText("es", text),
  });

  const show =
    showStatus &&
    activeTarget !== null &&
    (status === "translating" || status === "error");

  const currentLength = (value?.[lang] ?? "").length;
  const isNearLimit = maxLength !== undefined && currentLength >= maxLength;

  return (
    <div
      className={cn(
        "relative w-full",
        multiline && "flex flex-col",
        wrapperClassName,
      )}
    >
      {multiline ? (
        <textarea
          {...(inputProps as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          lang={lang}
          rows={rows}
          maxLength={maxLength}
          className={cn("w-full", className)}
          value={value?.[lang] ?? ""}
          onChange={(e) => {
            onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
            onText(lang, e.target.value);
            markUserEdit(lang, e.target.value);
          }}
        />
      ) : (
        <input
          {...inputProps}
          type={_type ?? "text"}
          lang={lang}
          maxLength={maxLength}
          className={cn("w-full", className)}
          value={value?.[lang] ?? ""}
          onChange={(e) => {
            onChange?.(e);
            onText(lang, e.target.value);
            // Real DOM edits only — programmatic writes never reach this.
            markUserEdit(lang, e.target.value);
          }}
        />
      )}
      {maxLength !== undefined && showCount && (
        <div className="flex items-center justify-end px-1 pt-0.5 select-none pointer-events-none">
          <span
            className={cn(
              "font-mono text-[10px] tabular-nums transition-colors",
              isNearLimit
                ? "text-[var(--color-bad)] font-semibold"
                : "text-[var(--color-ink-3)]",
            )}
            aria-hidden="true"
          >
            {currentLength} / {maxLength}
          </span>
        </div>
      )}
      {activeTarget !== null && show && (
        <span
          className={cn("bli__status", status === "error" && "is-error")}
          role="status"
          aria-live="polite"
        >
          {status === "error" && (
            <Icon icon="ri-error-warning-line" className="text-xs shrink-0" />
          )}
          <span>
            {
              STATUS_TEXT[activeTarget][
                status === "error" ? "error" : "translating"
              ]
            }
          </span>
        </span>
      )}
    </div>
  );
}
