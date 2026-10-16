import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native <select> wrapped to use the real design-system tokens.
 * Mirrors ui/input.tsx so a form field reads as one vocabulary.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        data-slot="select"
        className={cn(
          "flex min-h-tap-admin w-full rounded-md border border-[var(--color-line-3)] bg-[var(--color-surface)]",
          "px-3 py-2 text-sm text-[var(--color-ink)]",
          "transition-colors duration-[var(--dur)] ease-[var(--ease)]",
          "focus-visible:border-[var(--color-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
