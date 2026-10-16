import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inputs follow DESIGN.md §3.2:
 *   - 36px min height on admin (matches default button).
 *   - 8px radius (--radius-md).
 *   - Border --color-line-3 (the 3.5:1 control boundary), focus border --color-brand-600.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-field)]",
          "px-4 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]/60 placeholder:font-normal",
          "shadow-e1 transition-all duration-[var(--dur)] font-[family-name:var(--font-ui)]",
          "hover:border-[var(--color-line-3)]",
          "focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-[var(--color-brand)] focus-visible:border-[var(--color-brand)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
