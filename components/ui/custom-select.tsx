"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { LuCheck, LuChevronDown, LuLoader } from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";

export interface SelectOption {
  value: string;
  label: string;
  /** A component, or a name the icon registry resolves. */
  icon?: IconType | string;
  description?: string;
}

export interface CustomSelectProps {
  /** On the trigger, so a <label> can point at it. */
  id?: string;
  /** The id of the element naming this control, where a form supplies one. */
  ariaLabelledBy?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  leadingIcon?: IconType;
  disabled?: boolean;
  isLoading?: boolean;
  size?: "default" | "sm";
  className?: string;
}

export function CustomSelect({
  id,
  ariaLabelledBy,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  leadingIcon,
  disabled = false,
  isLoading = false,
  size = "default",
  className,
}: CustomSelectProps): React.ReactElement {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    width: number;
    origin: string;
  } | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const recompute = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.max(rect.width, size === "sm" ? 120 : 160);
    const left = Math.max(12, Math.min(rect.left, vw - width - 12));

    const panelHeight = Math.min(options.length * 44 + 16, 280);
    let top = rect.bottom + gap;
    let flipped = false;

    if (top + panelHeight > vh - 12) {
      if (rect.top - panelHeight - gap > 12) {
        top = rect.top - panelHeight - gap;
        flipped = true;
      } else {
        top = Math.max(12, vh - panelHeight - 12);
      }
    }

    // Which edge it is attached to, so it can grow from there rather than from
    // its own top-left corner.
    setPos({
      top,
      left,
      width,
      origin: flipped ? "bottom center" : "top center",
    });
  }, [options.length, size]);

  React.useEffect(() => {
    if (!open) {
      setPos(null);
      setHighlightedIndex(-1);
      return;
    }
    recompute();

    const selectedIdx = options.findIndex((opt) => opt.value === value);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);

    const onResize = (): void => recompute();
    const onScroll = (): void => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + options.length) % options.length,
        );
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setHighlightedIndex((currentIdx) => {
          if (currentIdx >= 0 && currentIdx < options.length) {
            onChange(options[currentIdx].value);
            setOpen(false);
          }
          return currentIdx;
        });
      }
    };
    document.addEventListener("keydown", onKey);

    const onPointer = (e: PointerEvent): void => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, recompute, options, value, onChange]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        aria-labelledby={ariaLabelledBy}
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-field)] text-[var(--color-ink)] transition-all duration-[var(--dur)]",
          size === "sm"
            ? "min-h-8 px-3 py-1 text-sm"
            : "min-h-10 px-4 py-2 text-sm",
          open && "border-[var(--color-brand)]",
          "hover:border-[var(--color-line-3)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading ? (
            <LuLoader
              className="size-4 animate-spin text-[var(--color-brand-600)] shrink-0"
              aria-hidden="true"
            />
          ) : selectedOption?.icon || leadingIcon ? (
            <Icon
              icon={(selectedOption?.icon ?? leadingIcon)!}
              className={cn(
                size === "sm" ? "text-sm" : "text-base",
                "text-[var(--color-ink-2)] shrink-0",
              )}
            />
          ) : null}
          <span
            className={cn(
              "truncate font-medium",
              isLoading && "text-[var(--color-ink-3)]",
            )}
          >
            {isLoading
              ? "Loading..."
              : selectedOption
                ? selectedOption.label
                : placeholder}
          </span>
        </div>
        {isLoading ? null : (
          <LuChevronDown
            aria-hidden="true"
            className={cn(
              "shrink-0 transition-transform duration-[var(--dur)]",
              size === "sm" ? "text-sm" : "text-base",
              "text-[var(--color-ink-3)]",
              open && "rotate-180 text-[var(--color-brand-700)]",
            )}
          />
        )}
      </button>

      {open &&
        mounted &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: 280,
              zIndex: 9999,
              ["--pop-origin" as string]: pos.origin,
            }}
            // A transition on a thing that is mounted when it opens never runs;
            // the animation does.
            className="pop-in overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-2 shadow-[var(--e-3)]"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] text-left transition-colors",
                    size === "sm" ? "px-3 py-2 text-sm" : "px-3 py-2 text-sm",
                    isSelected
                      ? "bg-[var(--color-panel)] font-semibold text-[var(--color-ink)]"
                      : isHighlighted
                        ? "bg-[var(--color-wash)] text-[var(--color-ink)]"
                        : "text-[var(--color-ink)] hover:bg-[var(--color-wash)]",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {opt.icon && (
                      <Icon
                        icon={opt.icon}
                        className={cn(
                          size === "sm" ? "text-sm" : "text-base",
                          "shrink-0",
                          isSelected
                            ? "text-[var(--color-ink)]"
                            : "text-[var(--color-ink-3)]",
                        )}
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-sm font-normal text-[var(--color-ink-2)] truncate">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <LuCheck
                      aria-hidden="true"
                      className={cn(
                        "shrink-0 text-[var(--color-ink)]",
                        size === "sm" ? "text-sm" : "text-base",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
