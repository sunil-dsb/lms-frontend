"use client";

import * as React from "react";
import { LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The dialog's name comes from the header it holds. Modals built their own <h2>
// and never passed `title`, so every dialog on the category pages reached a
// screen reader with no name at all.
const ModalTitleId = React.createContext<string | undefined>(undefined);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-card",
  md: "max-w-note",
  lg: "max-w-narrow",
  xl: "max-w-doc",
  "2xl": "max-w-[860px]",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps): React.ReactElement | null {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-labelledby={title ? undefined : titleId}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close backdrop"
        onClick={onClose}
        // animate-in / fade-in came from tailwindcss-animate, which this project
        // does not install, so the dialog has been appearing with no animation at
        // all. These two are ours.
        className="scrim-in fixed inset-0 bg-scrim"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "dialog-in relative flex max-h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-e3 focus:outline-none sm:max-h-[calc(100vh-4rem)]",
          sizeClasses[size],
          className,
        )}
      >
        <ModalTitleId.Provider value={titleId}>
          {children}
        </ModalTitleId.Provider>
      </div>
    </div>
  );
}

/**
 * The top of a dialog: what it is, the one line that says what it is for, and
 * the way out. Every dialog on the category pages built this by hand -- a title
 * in the display face at 18px (the display face is for 28px and up), a 12px
 * description, and a close button, one of them with no label. It is the same
 * object in every dialog, so it is this.
 */
export function ModalHeader({
  title,
  description,
  onClose,
  closeLabel = "Close",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  closeLabel?: string;
}): React.ReactElement {
  const id = React.useContext(ModalTitleId);
  return (
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
      <div className="min-w-0">
        <h2
          id={id}
          className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-snug text-[var(--color-ink)]"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
            {description}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label={closeLabel}
      >
        <LuX aria-hidden="true" className="text-lg" />
      </Button>
    </header>
  );
}

/** The dialog's content, at the padding every dialog shares. */
export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-4 p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The actions, bottom right, on the faintest ground so they read as the end of
 * the dialog. One primary at most; Cancel is neutral.
 */
export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <footer
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-wash)] px-5 py-3",
        className,
      )}
    >
      {children}
    </footer>
  );
}
