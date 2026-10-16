"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LuCircleAlert,
  LuEllipsisVertical,
  LuTriangleAlert,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";

/**
 * RowActions — ⋯ kebab menu for table rows.
 *
 * Replaces the [Edit] [Archive] pattern where destructive actions sit
 * as peers of safe ones. The destructive action is buried behind the
 * ⋯ and asks for a confirmation before firing.
 *
 * Behaviour (DESIGN.md §3.6):
 *   - Clicking the trigger opens a small menu anchored to its right.
 *   - Clicking a non-destructive item fires `onSelect` immediately.
 *   - Clicking a destructive item replaces the menu with an inline
 *     confirm row (Yes, … / Cancel) — the destructive action is only
 *     fired when the user confirms.
 *   - ESC closes the menu (and the confirm row if it was open).
 *   - Click outside closes the menu.
 *   - Menu uses `role="menu"` / `role="menuitem"`.
 */

export interface RowActionItem {
  /** Visible label. */
  label: string;
  /** Called when a non-destructive item is selected. */
  onSelect: () => void;
  /** If true, the item is styled bad-tone and triggers an inline confirm. */
  destructive?: boolean;
  /** Overrides the confirm button's label, for a destructive item whose
   *  consequence is worth naming ("Delete block", "Delete section"). */
  confirmLabel?: string;
  /** Overrides the confirm dialog title ("Delete this section?"). */
  confirmTitle?: string;
  /** Overrides the confirm dialog description. */
  confirmDescription?: string;
  /** The icon, as a component (`LuPencil`) or as a name the registry resolves
   *  (`ri-pencil-line`). Names exist because a server component cannot hand a
   *  function to a client one, and because the screens merged in from
   *  feat/procedures were written against the old icon-class convention. */
  icon?: IconType | string;
}

interface RowActionsProps {
  items: RowActionItem[];
  /** aria-label on the trigger (e.g. "Open actions for {name}"). */
  triggerLabel?: string;
  /** Optional className on the trigger wrapper. */
  className?: string;
}

export function RowActions({
  items,
  triggerLabel,
  className,
}: RowActionsProps): React.ReactElement {
  const t = useTranslations("admin");
  const [open, setOpen] = React.useState(false);
  const [confirmIndex, setConfirmIndex] = React.useState<number | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{
    top: number;
    right: number;
    origin: string;
  } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // The menu is fixed to the viewport, so it has to be re-anchored whenever the
  // trigger moves: a scroll, a resize, a row opening above it.
  const anchor = React.useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const isConfirm = confirmIndex !== null;
    const height = menuRef.current?.offsetHeight ?? (isConfirm ? 180 : 160);
    const width = isConfirm ? 340 : (menuRef.current?.offsetWidth ?? 180);
    const below = window.innerHeight - r.bottom;
    const flipped = below < height + 16 && r.top > height + 16;
    const top = flipped ? r.top - height - 6 : r.bottom + 6;
    let right = window.innerWidth - r.right;
    if (r.right - width < 16) {
      right = Math.max(16, window.innerWidth - (r.left + width));
    }
    setPos({
      top: Math.max(12, Math.min(window.innerHeight - height - 12, top)),
      right: Math.max(12, right),
      origin: flipped ? "bottom right" : "top right",
    });
  }, [confirmIndex]);

  React.useLayoutEffect(() => {
    if (!open) return;
    anchor();
    window.addEventListener("scroll", anchor, true);
    window.addEventListener("resize", anchor);
    return () => {
      window.removeEventListener("scroll", anchor, true);
      window.removeEventListener("resize", anchor);
    };
  }, [open, confirmIndex, anchor]);

  // Close on outside click + Escape; reset confirm state when menu closes.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
        setConfirmIndex(null);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirmIndex(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function closeAll(): void {
    setOpen(false);
    setConfirmIndex(null);
  }

  function handleSelect(idx: number): void {
    const item = items[idx];
    if (!item) return;
    if (item.destructive) {
      // Show the inline confirm; do not fire yet.
      setConfirmIndex(idx);
      return;
    }
    closeAll();
    item.onSelect();
  }

  function handleConfirm(): void {
    if (confirmIndex === null) return;
    const item = items[confirmIndex];
    if (!item) return;
    closeAll();
    item.onSelect();
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <Button
        ref={triggerRef}
        type="button"
        size="icon"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel ?? t("rowActionsLabel")}
        onClick={() => {
          setOpen((v) => !v);
          setConfirmIndex(null);
        }}
      >
        <LuEllipsisVertical aria-hidden="true" className="text-md" />
      </Button>

      {open && mounted
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={triggerLabel ?? t("rowActionsLabel")}
              style={{
                top: pos?.top ?? -9999,
                right: pos?.right ?? 0,
                ["--pop-origin" as string]: pos?.origin ?? "top right",
              }}
              className={cn(
                "pop-in fixed z-dropdown",
                confirmIndex !== null
                  ? "w-[340px] max-w-[calc(100vw-32px)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 shadow-[var(--e-3)] text-left"
                  : "min-w-field-md rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-[var(--e-3)]",
              )}
            >
              {confirmIndex !== null ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bad-tint)] text-[var(--color-bad)]">
                      <LuTriangleAlert
                        aria-hidden="true"
                        className="size-4.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
                        {items[confirmIndex]?.confirmTitle ??
                          t("rowActionsConfirmTitle")}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--color-ink-2)]">
                        {items[confirmIndex]?.confirmDescription ??
                          (items[confirmIndex]?.label
                            ? `"${items[confirmIndex]?.label}" and its contents will be permanently removed. This can't be undone.`
                            : "This item and its contents will be permanently removed. This can't be undone.")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="neutral"
                      onClick={closeAll}
                    >
                      {t("confirmNo")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleConfirm}
                      className="bg-[var(--color-bad)] hover:bg-[var(--color-bad-hover)] text-white! shadow-xs"
                    >
                      {items[confirmIndex]?.confirmLabel ??
                        (items[confirmIndex]?.destructive === true
                          ? t("confirmDelete")
                          : t("confirmYes"))}
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="py-1">
                  {items.map((item, idx) => (
                    <li key={idx} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleSelect(idx)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left",
                          "text-sm font-medium",
                          "transition-colors duration-[var(--dur)] ease-[var(--ease)]",
                          "focus-visible:outline-none focus-visible:bg-[var(--color-panel)]",
                          item.destructive
                            ? "text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
                            : "text-[var(--color-ink)] hover:bg-[var(--color-panel)]",
                        )}
                      >
                        {item.icon ? (
                          <Icon icon={item.icon} className="text-md" />
                        ) : null}
                        <span className="flex-1">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
