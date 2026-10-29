"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LuX } from "react-icons/lu";

/**
 * Drawer — DESIGN.md §3.6 overlay.
 *
 * Slides in from the right (desktop) or bottom (mobile). Same a11y
 * shape as a modal dialog: ESC closes, backdrop click closes, body
 * scroll is locked while open, focus moves into the drawer on open
 * and returns to the trigger on close. `role="dialog"` +
 * `aria-modal="true"` for assistive tech.
 *
 * Animation uses `--dur` / `--ease` from §2.4. The keyframes are
 * defined once in app/lms.css under `.drawer-in` / `.drawer-in-bottom`.
 *
 * The body of the drawer uses the same Card shape as everywhere
 * else so the visual language stays consistent.
 */

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional close-button label (used for aria-label only). */
  closeLabel?: string;
  children: React.ReactNode;
  /** Footer slot — typically [Cancel] + [Primary]. */
  footer?: React.ReactNode;
  /** sm = 24rem, md = 32rem (default), lg = 40rem. */
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<DrawerProps["size"]>, string> = {
  sm: "w-drawer-sm max-w-sheet",
  md: "w-drawer-md max-w-sheet",
  lg: "w-drawer-lg max-w-sheet",
};

export function Drawer({
  open,
  onClose,
  title,
  closeLabel = "Close",
  children,
  footer,
  size = "md",
}: DrawerProps): React.ReactElement | null {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  // Remember which element opened the drawer so we can return focus
  // to it when the drawer closes.
  React.useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  // Escape closes; lock body scroll while open; return focus on close.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the panel.
    const t = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === "function") {
        trigger.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-scrim"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 flex flex-col outline-none",
          "border-l border-[var(--color-line)] bg-[var(--color-surface)]",
          "shadow-[var(--e-3)]",
          sizeClasses[size],
          "animate-[drawer-in_var(--dur)_var(--ease)]",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-tight text-[var(--color-ink)]">
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className={cn(
              "inline-flex h-tap-admin w-tap-admin items-center justify-center rounded-[var(--radius-md)]",
              "text-[var(--color-ink)] transition-colors duration-[var(--dur)] ease-[var(--ease)]",
              "hover:bg-[var(--color-panel)] active:translate-y-px",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
            )}
          >
            <LuX aria-hidden="true" className="text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-wash)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
