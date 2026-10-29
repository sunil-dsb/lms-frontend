"use client";

import * as React from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { Popover } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface MultiSelectDropdownOption {
  value: string;
  label: string;
  description?: string;
}

export interface MultiSelectDropdownProps {
  id: string;
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  blockedReason?: string;
}

export function MultiSelectDropdown({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  blockedReason,
}: MultiSelectDropdownProps): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);

  const labelsById = React.useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options],
  );

  const selectedLabels = value
    .map((v) => labelsById.get(v))
    .filter((l): l is string => Boolean(l));

  const isBlocked = Boolean(blockedReason);
  const isDisabled = disabled || isBlocked;

  function toggle(optionValue: string): void {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  const triggerWidth = triggerRef.current?.getBoundingClientRect().width;

  return (
    <div
      className="grid min-w-0 w-full gap-2"
      data-slot="multi-select-dropdown"
    >
      <Label
        id={`${id}-label`}
        htmlFor={id}
        className="text-sm font-semibold text-[var(--color-ink)]"
      >
        {label}
      </Label>

      <button
        ref={triggerRef}
        id={id}
        aria-labelledby={`${id}-label`}
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((prev) => !prev)}
        title={
          selectedLabels.length > 0 ? selectedLabels.join(", ") : undefined
        }
        className={cn(
          "flex min-h-10 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-field)] px-4 py-2 text-sm text-[var(--color-ink)] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:border-[var(--color-brand)]",
          open &&
            "border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]",
          isDisabled && "cursor-not-allowed opacity-60 bg-[var(--color-panel)]",
          "hover:border-[var(--color-line-2)]",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          {selectedLabels.length === 0 ? (
            <span className="block truncate text-[var(--color-ink-3)]">
              {isBlocked ? blockedReason : placeholder}
            </span>
          ) : (
            <span className="block truncate font-medium text-[var(--color-ink)]">
              {selectedLabels.join(", ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedLabels.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[11px] font-semibold text-[var(--color-ink-2)]">
              {selectedLabels.length}
            </span>
          )}
          <LuChevronDown
            className={cn(
              "size-4 text-[var(--color-ink-3)] transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align="start"
      >
        <div className="p-2 flex flex-col gap-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--color-ink-3)]">
              No options available.
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:bg-[var(--color-panel)]"
                >
                  <div className="flex items-center min-w-0">
                    <span
                      className={cn(
                        "mr-3 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"
                          : "border-[var(--color-line-2)] bg-[var(--color-surface)]",
                      )}
                    >
                      {isSelected && (
                        <LuCheck
                          className="size-3 stroke-[3]"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        "truncate",
                        isSelected
                          ? "font-medium text-[var(--color-ink)]"
                          : "text-[var(--color-ink-2)]",
                      )}
                    >
                      {opt.label}
                    </span>
                  </div>
                  {opt.description ? (
                    <span className="ml-3 text-xs text-[var(--color-ink-3)] shrink-0">
                      {opt.description}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </Popover>
    </div>
  );
}
