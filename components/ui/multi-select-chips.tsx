"use client";

import * as React from "react";
import { LuPlus, LuX, LuLoader } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverItem } from "@/components/ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional helper text, surfaced in the picker for ambiguity. */
  description?: string;
}

interface MultiSelectChipsProps {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  addLabel: string;
  emptyText: string;
  blockedReason?: string;
  id?: string;
  /** Cap on selected values. When reached, the Add trigger disables and
   *  picking replaces the selection instead of appending. Unset = unlimited. */
  maxSelected?: number;
  visibleChipLimit?: number;
  labelTrailing?: React.ReactNode;
  tone?: "brand" | "neutral";
  shape?: "pill" | "badge";
  className?: string;
}

export function MultiSelectChips({
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
  isLoading = false,
  loadingText,
  addLabel,
  emptyText,
  blockedReason,
  id,
  maxSelected,
  visibleChipLimit = 6,
  labelTrailing,
  tone = "neutral",
  shape = "badge",
  className,
}: MultiSelectChipsProps): React.ReactElement {
  const isNeutral = tone === "neutral";
  const isPill = shape === "pill";
  const labelsById = React.useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options],
  );

  const selectedOptions = value
    .map((v) => ({ value: v, label: labelsById.get(v) ?? v }))
    .filter((o) => labelsById.has(o.value));

  // Available options = everything minus what's already picked.
  const pickableOptions = React.useMemo(
    () => options.filter((o) => !value.includes(o.value)),
    [options, value],
  );

  const handleAdd = (picked: string): void => {
    if (!picked || value.includes(picked)) return;
    // Single-select mode: picking replaces the current value.
    if (maxSelected != null && maxSelected <= 1) {
      onChange([picked]);
      return;
    }
    if (maxSelected != null && value.length >= maxSelected) return;
    onChange([...value, picked]);
  };

  const handleRemove = (id: string): void => {
    onChange(value.filter((v) => v !== id));
  };

  const overflow = Math.max(0, selectedOptions.length - visibleChipLimit);
  const visibleChips = selectedOptions.slice(0, visibleChipLimit);
  const isBlocked = Boolean(blockedReason);
  const atLimit = maxSelected != null && value.length >= maxSelected;
  const triggerDisabled =
    disabled ||
    isLoading ||
    isBlocked ||
    atLimit ||
    pickableOptions.length === 0;

  return (
    <div
      className={cn("flex flex-col gap-2 h-full", className)}
      data-slot="multi-select-chips"
    >
      <div className="flex flex-col gap-0.5 min-h-[44px]">
        <span className="text-sm font-semibold text-[var(--color-ink)]">
          {label}
          {labelTrailing}
        </span>
        {hint ? (
          <span className="text-xs text-[var(--color-ink-2)] leading-relaxed">
            {hint}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-h-12 flex-1 flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-2 shadow-2xs transition-colors",
          isBlocked && "bg-[var(--color-panel)]",
          isLoading && "bg-[var(--color-wash)]/40",
        )}
        id={id}
        role="group"
        aria-label={label}
      >
        {visibleChips.map((opt) => (
          <span
            key={opt.value}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 px-3 py-1 text-xs font-medium transition-colors",
              isPill ? "rounded-full" : "rounded-[var(--radius-md)]",
              isNeutral
                ? "border border-[var(--color-line-2)] bg-[var(--color-panel)] text-[var(--color-ink)]"
                : "bg-[var(--color-brand-tint)] font-semibold text-[var(--color-brand-700)] shadow-[inset_0_0_0_1px_var(--color-brand-600)]",
            )}
          >
            <span className="truncate">{opt.label}</span>
            <button
              type="button"
              aria-label={`Remove ${opt.label}`}
              onClick={() => handleRemove(opt.value)}
              disabled={disabled || isLoading}
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:opacity-50",
                isNeutral
                  ? "text-[var(--color-ink-3)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-ink)]"
                  : "text-[var(--color-brand-700)] hover:bg-[var(--color-panel)]",
              )}
            >
              <LuX className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        {overflow > 0 ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)] bg-[var(--color-panel)]",
              isPill ? "rounded-full" : "rounded-[var(--radius-md)]",
            )}
          >
            +{overflow}
          </span>
        ) : null}

        {isLoading ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-ink-3)]">
            <LuLoader
              className="size-3.5 animate-spin text-[var(--color-brand-600)]"
              aria-hidden="true"
            />
            <span>{loadingText || "Loading options..."}</span>
          </span>
        ) : isBlocked ? (
          <span className="text-xs italic text-[var(--color-ink-3)]">
            {blockedReason}
          </span>
        ) : (
          <PickerTrigger
            disabled={triggerDisabled}
            disabledReason={isBlocked ? blockedReason : undefined}
            options={pickableOptions}
            addLabel={addLabel}
            onPick={handleAdd}
          />
        )}
      </div>
    </div>
  );
}

function PickerTrigger({
  disabled,
  disabledReason,
  options,
  addLabel,
  onPick,
}: {
  disabled: boolean;
  disabledReason?: string;
  options: MultiSelectOption[];
  addLabel: string;
  onPick: (value: string) => void;
  triggerVariant?: "neutral" | "secondary";
  isPill?: boolean;
}): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);

  const actionClasses = cn(
    "group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1",
    disabled
      ? "cursor-not-allowed opacity-50 text-[var(--color-ink-3)]"
      : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-panel)] active:bg-[var(--color-panel-2)]",
  );

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        className={actionClasses}
      >
        <LuPlus
          className="size-4 shrink-0 text-[var(--color-ink-3)]"
          aria-hidden="true"
        />
        <span>{addLabel}</span>
      </button>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={actionClasses}
      >
        <LuPlus
          className="size-4 shrink-0 text-[var(--color-brand-600)] transition-transform group-hover:scale-110"
          aria-hidden="true"
        />
        <span>{addLabel}</span>
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
      >
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-[var(--color-ink-3)]">
            No more options.
          </div>
        ) : (
          options.map((opt) => (
            <PopoverItem
              key={opt.value}
              label={opt.label}
              description={opt.description}
              onClick={() => {
                onPick(opt.value);
                setOpen(false);
              }}
            />
          ))
        )}
      </Popover>
    </>
  );
}
