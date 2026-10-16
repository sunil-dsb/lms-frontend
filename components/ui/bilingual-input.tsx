"use client";

import * as React from "react";
import { useId, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useBilingualTranslation } from "@/lib/use-bilingual-translation";

export interface BilingualValue {
  en: string;
  es: string;
}

export interface BilingualInputProps {
  label?: string;
  value: BilingualValue;
  onChange: (value: BilingualValue) => void;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: { en?: string; es?: string };
  /**
   * Optional override for the translator. Left unset, the field auto-translates
   * via the server route (see `lib/translate-api.ts`) after the user stops typing.
   */
  translate?: (
    text: string,
    from: "en" | "es",
    to: "en" | "es",
  ) => string | Promise<string>;
  defaultLang?: "en" | "es";
  name?: string;
  className?: string;
  inputClassName?: string;
  size?: "default" | "compact";
  onInputKeyDown?: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    lang: "en" | "es",
  ) => void;
}

const LANGS: Array<"en" | "es"> = ["en", "es"];
const LANG_NAME: Record<"en" | "es", string> = { en: "English", es: "Spanish" };
const DEFAULT_PLACEHOLDER: Record<"en" | "es", string> = {
  en: "Write in English...",
  es: "Escribe en español...",
};

/** Kept exported for backwards compatibility; no longer the default. */
export const dummyTranslate = (
  text: string,
  _from: "en" | "es",
  _to: "en" | "es",
): string => text;

// Self-contained strings rather than new i18n keys — the label language follows
// the field being written, which is the only thing that can change here.
const STATUS_TEXT: Record<"en" | "es", { translating: string; error: string }> =
  {
    en: { translating: "Translating…", error: "Translation failed" },
    es: { translating: "Traduciendo…", error: "Error al traducir" },
  };

export function BilingualInput({
  label,
  value,
  onChange,
  required,
  multiline,
  maxLength,
  placeholder,
  translate,
  defaultLang = "en",
  name,
  className,
  inputClassName,
  size = "default",
  onInputKeyDown,
}: BilingualInputProps): React.ReactElement {
  const baseId = useId();
  const [active, setActive] = useState<"en" | "es">(defaultLang);
  const controls = useRef<{
    en: HTMLInputElement | HTMLTextAreaElement | null;
    es: HTMLInputElement | HTMLTextAreaElement | null;
  }>({
    en: null,
    es: null,
  });

  const valueRef = useRef(value);
  valueRef.current = value;

  const commit = (next: BilingualValue): void => {
    valueRef.current = next;
    onChange(next);
  };

  const { markUserEdit, status, activeTarget } = useBilingualTranslation({
    englishValue: value?.en ?? "",
    spanishValue: value?.es ?? "",
    // `valueRef` is written before `onChange`, so a write that lands in the
    // same tick as an edit still composes from the freshest value.
    onEnglishChange: (text) =>
      commit({ ...(valueRef.current ?? value), en: text }),
    onSpanishChange: (text) =>
      commit({ ...(valueRef.current ?? value), es: text }),
    maxLength,
    translate,
  });

  const handleChange = (lang: "en" | "es", text: string): void => {
    const next: BilingualValue = {
      en: valueRef.current?.en ?? "",
      es: valueRef.current?.es ?? "",
      [lang]: text,
    };
    commit(next);
    // Real DOM edits only — this is what distinguishes user input from a
    // programmatic write, so translation can never trigger translation.
    markUserEdit(lang, text);
  };

  const groupId = label ? `${baseId}-label` : undefined;
  const showStatus =
    activeTarget !== null && (status === "translating" || status === "error");

  return (
    <div
      className={cn("bli", size === "compact" && "bli--compact", className)}
      role="group"
      aria-labelledby={groupId}
    >
      {label && (
        <div id={groupId} className="bli__label">
          {label}
          {required && (
            <span className="bli__required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </div>
      )}

      <div className="bli__fields">
        {LANGS.map((lang) => {
          const isActive = active === lang;
          const shared = {
            id: `${baseId}-${lang}`,
            name: name ? `${name}.${lang}` : undefined,
            value: value?.[lang] ?? "",
            maxLength,
            lang,
            placeholder: placeholder?.[lang] ?? DEFAULT_PLACEHOLDER[lang],
            "aria-label": label
              ? `${label} (${LANG_NAME[lang]})`
              : (placeholder?.[lang] ?? LANG_NAME[lang]),
            "aria-required": required || undefined,
            className: cn("bli__control", inputClassName),
            onFocus: () => setActive(lang),
            onKeyDown: (
              e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              onInputKeyDown?.(e, lang);
            },
            onChange: (
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => handleChange(lang, e.target.value),
          };
          const setRef = (
            el: HTMLInputElement | HTMLTextAreaElement | null,
          ): void => {
            controls.current[lang] = el;
          };

          return (
            <div
              key={lang}
              className={[
                "bli__field",
                isActive ? "is-active" : "is-inactive",
                multiline ? "is-multiline" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => controls.current[lang]?.focus()}
            >
              {multiline ? (
                <textarea {...shared} ref={setRef} />
              ) : (
                <input {...shared} type="text" ref={setRef} />
              )}
              {maxLength !== undefined && (
                <span
                  className={cn(
                    "bli__count",
                    (value?.[lang] ?? "").length >= maxLength &&
                      "text-[var(--color-bad)] font-semibold",
                  )}
                  aria-hidden="true"
                >
                  {(value?.[lang] ?? "").length} / {maxLength}
                </span>
              )}
              <span
                className="bli__tag notranslate"
                translate="no"
                aria-hidden="true"
              >
                {lang.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {activeTarget !== null && showStatus && (
        <span
          className={cn("bli__status", status === "error" && "is-error")}
          role="status"
          aria-live="polite"
        >
          {status === "error" && (
            <Icon
              icon="ri-error-warning-line"
              className="text-xs shrink-0 mr-1"
            />
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
