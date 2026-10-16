import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Labels follow DESIGN.md §3.2 (text-sm, weight 600, color --color-ink).
 */
export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        data-slot="label"
        className={cn(
          "text-sm font-semibold leading-meta text-[var(--color-ink)]",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        {...props}
      />
    );
  },
);
