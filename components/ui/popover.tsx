"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { LuChevronRight } from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";
import { IconTile } from "@/components/ui/icon-tile";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
  className?: string;
  width?: number;
}

/**
 * Floating popover anchored to a trigger element. Lightweight counterpart to
 * Drawer — no body-scroll lock, no `role="dialog"`. Use for non-modal menus.
 *
 * Rendered into `document.body` via `createPortal` to prevent overflow clipping.
 */
export function Popover({
  open,
  onClose,
  triggerRef,
  children,
  align = "end",
  side = "bottom",
  className,
  width: customWidth,
}: PopoverProps): React.ReactElement | null {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const recompute = React.useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel ? panel.getBoundingClientRect().height : 400;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const targetWidth = customWidth ?? Math.min(360, Math.max(280, rect.width));
    const width = Math.min(targetWidth, vw - 32);

    let left = align === "end" ? rect.right - width : rect.left;

    // Keep within screen edges
    left = Math.max(12, Math.min(left, vw - width - 12));

    let top = side === "top" ? rect.top - panelHeight - gap : rect.bottom + gap;

    if (top + panelHeight > vh - 12) {
      // Flip up if bottom exceeds viewport
      if (rect.top - panelHeight - gap > 12) {
        top = rect.top - panelHeight - gap;
      } else {
        top = Math.max(12, vh - panelHeight - 12);
      }
    }
    if (top < 12) top = Math.max(12, rect.bottom + gap);

    setPos({ top, left, width });
  }, [triggerRef, align, side, customWidth]);

  React.useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    recompute();
    const anim = requestAnimationFrame(() => {
      recompute();
    });
    const onResize = (): void => recompute();
    const onScroll = (): void => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const onPointer = (e: PointerEvent): void => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onClose, recompute, triggerRef]);

  React.useEffect(() => {
    if (!open) {
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === "function") {
        trigger.focus();
      }
    }
  }, [open, triggerRef]);

  if (!open || !mounted) return null;

  const style: React.CSSProperties = pos
    ? {
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
      }
    : {
        position: "fixed",
        top: -9999,
        left: -9999,
        width: customWidth ?? 360,
        visibility: "hidden",
        zIndex: 9999,
      };

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-[var(--e-3)] transition-opacity duration-[var(--dur)]",
        className,
      )}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}

export function PopoverGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1 py-2" role="group" aria-label={label}>
      <div className="px-3 text-sm font-semibold text-[var(--color-ink-3)]">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface PopoverItemProps {
  /** A component, or a name the icon registry resolves. */
  icon?: IconType | string;
  label: string;
  description?: string;
  onClick: () => void;
}

export function PopoverItem({
  icon,
  label,
  description,
  onClick,
}: PopoverItemProps): React.ReactElement {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-brand-tint)] focus-visible:outline-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <IconTile
            size="sm"
            icon={icon}
            tone="quiet"
            shape="circle"
            className="group-hover:bg-[var(--color-panel)] group-hover:text-[var(--color-ink)]"
          />
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--color-ink)]">
            {label}
          </div>
          {description && (
            <div className="truncate text-sm text-[var(--color-ink-2)]">
              {description}
            </div>
          )}
        </div>
      </div>
      <LuChevronRight
        aria-hidden="true"
        className="shrink-0 text-base text-[var(--color-ink-3)] transition-transform group-hover:text-[var(--color-ink)]"
      />
    </button>
  );
}
